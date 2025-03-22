import { forwardRef, useRef, useState, CSSProperties } from "react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from "jspdf";
import { InvoiceData } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from '@/components/theme-toggle';

type InvoicePreviewProps = {
  data: InvoiceData;
  onBack: () => void;
  onThemeChange?: (value: 'dark' | 'light') => void;
  currentTheme?: 'dark' | 'light';
};

const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ data, onBack, onThemeChange, currentTheme = 'dark' }) => {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const formatAddress = (address: string) => {
      return address.split('\n').map((line, i) => (
        <span key={i} style={{ display: 'block' }}>
          {line}
        </span>
      ));
    };

    const calculateTotal = () => {
      return data.items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2);
    };

    // Helper function to format the date range
    const formatDateRange = (item: InvoiceData['items'][0]) => {
      if (item.startDate && item.endDate) {
        try {
          const start = format(item.startDate, 'd MMM', { locale: ptBR });
          const end = format(item.endDate, 'd MMM', { locale: ptBR });
          const year = format(item.endDate, 'yyyy');
          return `${start} - ${end} ${year}`.toUpperCase();
        } catch (error) {
          console.error('Error formatting date range:', error);
          return item.date ? item.date.toUpperCase() : '';
        }
      }
      
      // Fallback for the date field if startDate and endDate are not present
      return item.date ? item.date.toUpperCase() : '';
    };

    // Method to generate PDF using pure Canvas (high quality)
    const generatePDF = async () => {
      try {
        setIsGenerating(true);
        
        // Create canvas with high resolution
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Unable to get canvas context');
        
        // Set A4 size with high resolution (300 DPI)
        const scale = 3; // Increase scale to improve quality
        const width = 2480; // A4 width at 300 DPI
        const height = 3508; // A4 height at 300 DPI
        canvas.width = width;
        canvas.height = height;
        
        // Enable smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Fill background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        
        // Scale to fit the new size
        const margin = 120 * scale;
        const contentWidth = width - (margin * 2);
        
        // HEADER - INVOICE
        ctx.font = `bold ${36 * scale}px Arial`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('INVOICE', margin, margin);
        
        // Invoice number
        ctx.font = `${18 * scale}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(data.invoiceNumber, width - margin, margin);
        ctx.fillText('INVOICE NUMBER', width - margin, margin + 40 * scale);
        
        // Reset alignment
        ctx.textAlign = 'left';
        
        // SENDER AND RECIPIENT INFORMATION
        const headerY = margin + 120 * scale;
        
        // FROM
        ctx.font = `${16 * scale}px Arial`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('FROM', margin, headerY);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${20 * scale}px Arial`;
        ctx.fillText(data.fromCompany, margin, headerY + 40 * scale);
        
        // Sender address
        ctx.font = `${16 * scale}px Arial`;
        ctx.fillStyle = '#cbd5e1';
        const addressLines = data.fromAddress.split('\n');
        let y = headerY + 80 * scale;
        addressLines.forEach(line => {
          ctx.fillText(line, margin, y);
          y += 24 * scale;
        });
        
        // VAT/ID Number
        if (data.fromVat) {
          y += 10 * scale;
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('VAT Number:', margin, y);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(data.fromVat, margin + 105 * scale, y);
        }
        
        // TO
        const colCenter = width / 2 + 100 * scale;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('TO', colCenter, headerY);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${20 * scale}px Arial`;
        ctx.fillText(data.toCompany, colCenter, headerY + 40 * scale);
        
        // Recipient address
        ctx.font = `${16 * scale}px Arial`;
        ctx.fillStyle = '#cbd5e1';
        const toAddressLines = data.toAddress.split('\n');
        y = headerY + 80 * scale;
        toAddressLines.forEach(line => {
          ctx.fillText(line, colCenter, y);
          y += 24 * scale;
        });
        
        // EIN Number
        if (data.toEin) {
          y = Math.max(y, headerY + 150 * scale);
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('EIN Number:', colCenter, y);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(data.toEin, colCenter + 100 * scale, y);
        }
        
        // ITEMS TABLE
        const tableY = headerY + 300 * scale;
        
        // Table headers
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${16 * scale}px Arial`;
        
        // Define columns - more spaced to avoid overlapping
        const descCol = margin; // Description (35%)
        const dateCol = margin + contentWidth * 0.3; // Date (30%)
        const rateCol = margin + contentWidth * 0.78; // Rate (15%)
        const totalCol = width - margin; // Total (20%)
        
        // Headers
        ctx.textAlign = 'left';
        ctx.fillText('DESCRIPTION', descCol, tableY);
        ctx.fillText('DATE', dateCol, tableY);
        ctx.textAlign = 'right';
        ctx.fillText('RATE', rateCol, tableY);
        ctx.fillText('TOTAL', totalCol, tableY);
        
        // Items
        let itemY = tableY + 40 * scale;
        
        data.items.forEach(item => {
          // Description
          ctx.textAlign = 'left';
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${16 * scale}px Arial`;
          ctx.fillText(item.description, descCol, itemY);
          
          // Date - use standardized format
          ctx.font = `${16 * scale}px Arial`;
          // Add clipping to prevent date text from invading the RATE column
          ctx.save();
          ctx.rect(dateCol, itemY - 20 * scale, rateCol - dateCol - 20 * scale, 30 * scale);
          ctx.clip();
          ctx.fillText(formatDateRange(item), dateCol, itemY);
          ctx.restore();
          
          // Rate
          ctx.textAlign = 'right';
          ctx.fillText(`$${item.rate} USD`, rateCol, itemY);
          
          // Total
          ctx.fillText(`$${item.total} USD`, totalCol, itemY);
          
          // Next item
          itemY += 40 * scale;
        });
        
        // FINAL AMOUNT
        const totalY = itemY + 80 * scale;
        ctx.textAlign = 'right';
        
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('FINAL AMOUNT', totalCol - 180 * scale, totalY);
        
        // Formatted value with decimal places
        const formattedTotal = calculateTotal();
        ctx.fillStyle = '#ff6b00'; // More vibrant orange
        ctx.font = `bold ${24 * scale}px Arial`;
        ctx.fillText(`$${formattedTotal} USD`, totalCol, totalY);
        
        // NOTES
        let notesY = totalY + 80 * scale;
        if (data.notes) {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#94a3b8';
          ctx.font = `${16 * scale}px Arial`;
          ctx.fillText('NOTES', margin, notesY);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = `${16 * scale}px Arial`;
          
          // Note text
          notesY += 30 * scale;
          ctx.fillText(data.notes, margin, notesY);
        }
        
        // PAYMENT INFORMATION
        const footerY = Math.max(notesY + 80 * scale, totalY + 180 * scale);
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${16 * scale}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('PAYMENT INFORMATION', margin, footerY);
        
        // Divide into columns
        const footerContentY = footerY + 40 * scale;
        const footerCol1 = margin;
        const footerCol2 = margin + contentWidth * 0.35;
        const footerCol3 = margin + contentWidth * 0.7;
        
        // Column 1: Account details
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Account details', footerCol1, footerContentY);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Account holder:', footerCol1, footerContentY + 30 * scale);
        ctx.fillText(data.paymentInfo.accountHolder, footerCol1, footerContentY + 55 * scale);
        
        ctx.fillText('Account number:', footerCol1, footerContentY + 85 * scale);
        ctx.fillText(data.paymentInfo.accountNumber, footerCol1, footerContentY + 110 * scale);
        
        // Column 2: Bank address
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Bank address', footerCol2, footerContentY);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(data.paymentInfo.bankAddress, footerCol2, footerContentY + 30 * scale);
        
        // Column 3: Questions and contact
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Questions and contact', footerCol3, footerContentY);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(data.paymentInfo.contactEmail, footerCol3, footerContentY + 30 * scale);
        
        // Convert to image and PDF
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
          orientation: 'portrait', 
          unit: 'mm',
          format: 'a4'
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save(`invoice-${data.invoiceNumber.replace('#', '')}.pdf`);
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('An error occurred while generating the PDF. Check the console for more details.');
      } finally {
        setIsGenerating(false);
      }
    };
    
    // Styles for screen view
    const screenStyles: CSSProperties = {
      backgroundColor: '#0f172a',
      color: '#ffffff',
      padding: '2rem',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    };

    const headerStyle: CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '3rem'
    };

    const gridContainerStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '2rem',
      marginBottom: '3rem'
    };

    const labelStyle: CSSProperties = {
      color: '#94a3b8',
      textTransform: 'uppercase' as const,
      fontSize: '0.875rem',
      marginBottom: '0.5rem'
    };

    const addressStyle: CSSProperties = {
      color: '#cbd5e1',
      fontSize: '0.875rem',
      marginTop: '0.25rem'
    };

    const tableStyle: CSSProperties = {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginBottom: '2rem'
    };

    const theadStyle: CSSProperties = {
      color: '#94a3b8',
      textTransform: 'uppercase' as const,
      fontSize: '0.875rem',
      textAlign: 'left' as const
    };

    const trStyle: CSSProperties = {
      borderBottom: '1px solid #1e293b'
    };

    const tdStyle: CSSProperties = {
      padding: '0.75rem 0',
      fontSize: '0.875rem'
    };

    const totalContainerStyle: CSSProperties = {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: '1.5rem',
      marginBottom: '2rem'
    };

    const finalAmountStyle: CSSProperties = {
      display: 'flex', 
      justifyContent: 'space-between', 
      width: '250px',
      paddingTop: '0.5rem', 
      paddingBottom: '0.5rem'
    };

    const amountValueStyle: CSSProperties = {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#ff6b00'
    };

    const notesStyle: CSSProperties = {
      marginTop: '2rem',
      marginBottom: '2rem'
    };

    const footerStyle: CSSProperties = {
      marginTop: '3rem'
    };

    const footerGridStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '2rem',
      marginTop: '1rem'
    };

    const footerTitleStyle: CSSProperties = {
      color: '#94a3b8',
      textTransform: 'uppercase' as const,
      fontSize: '0.875rem',
      marginBottom: '0.75rem'
    };
    
    return (
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onBack}>
            Back to Form
          </Button>
          {onThemeChange && (
            <ThemeToggle value={currentTheme} onChange={onThemeChange} />
          )}
          <Button 
            onClick={generatePDF}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating PDF...' : 'Download PDF'}
          </Button>
        </div>

        {/* Invoice preview area - layout closer to the reference image */}
        <div ref={invoiceRef} style={screenStyles}>
          <div style={headerStyle}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', textTransform: 'uppercase' as const }}>INVOICE</h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{data.invoiceNumber}</div>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>INVOICE NUMBER</div>
            </div>
          </div>

          <div style={gridContainerStyle}>
            <div>
              <div style={labelStyle}>FROM</div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{data.fromCompany}</div>
              <div style={addressStyle}>
                {formatAddress(data.fromAddress)}
              </div>
              {data.fromVat && (
                <div style={{ fontSize: '0.875rem', marginTop: '0.75rem' }}>
                  <span style={{ color: '#94a3b8' }}>VAT Number:</span> {data.fromVat}
                </div>
              )}
            </div>

            <div>
              <div style={labelStyle}>TO</div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{data.toCompany}</div>
              <div style={addressStyle}>
                {formatAddress(data.toAddress)}
              </div>
              {data.toEin && (
                <div style={{ fontSize: '0.875rem', marginTop: '0.75rem' }}>
                  <span style={{ color: '#94a3b8' }}>EIN Number:</span> {data.toEin}
                </div>
              )}
            </div>
          </div>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{...theadStyle, width: '35%'}}>DESCRIPTION</th>
                <th style={{...theadStyle, width: '30%'}}>DATE</th>
                <th style={{...theadStyle, width: '15%', textAlign: 'right' as const}}>RATE</th>
                <th style={{...theadStyle, width: '20%', textAlign: 'right' as const}}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} style={trStyle}>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{item.description}</td>
                  <td style={tdStyle}>{formatDateRange(item)}</td>
                  <td style={{...tdStyle, textAlign: 'right' as const}}>${item.rate} USD</td>
                  <td style={{...tdStyle, textAlign: 'right' as const}}>${item.total} USD</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={totalContainerStyle}>
            <div style={finalAmountStyle}>
              <span style={{ color: '#94a3b8', alignSelf: 'center' }}>FINAL AMOUNT</span>
              <span style={amountValueStyle}>
                ${calculateTotal()} USD
              </span>
            </div>
          </div>

          {data.notes && (
            <div style={notesStyle}>
              <div style={labelStyle}>NOTES</div>
              <div style={{ fontSize: '0.875rem' }}>{data.notes}</div>
            </div>
          )}

          <div style={footerStyle}>
            <div style={{...labelStyle, marginBottom: '1rem'}}>PAYMENT INFORMATION</div>
            <div style={footerGridStyle}>
              <div>
                <div style={footerTitleStyle}>
                  Account details
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: '#94a3b8' }}>Account holder:</span>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    {data.paymentInfo.accountHolder}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: '#94a3b8' }}>Account number:</span>
                  </div>
                  <div>
                    {data.paymentInfo.accountNumber}
                  </div>
                </div>
              </div>

              <div>
                <div style={footerTitleStyle}>
                  Bank address
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  {data.paymentInfo.bankAddress}
                </div>
              </div>

              <div>
                <div style={footerTitleStyle}>
                  Questions and contact
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  {data.paymentInfo.contactEmail}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InvoicePreview.displayName = 'InvoicePreview';

export default InvoicePreview; 