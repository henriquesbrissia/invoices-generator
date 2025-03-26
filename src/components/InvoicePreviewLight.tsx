import { forwardRef, useRef, useState, CSSProperties } from "react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from "jspdf";
import { InvoiceData } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from '@/components/theme-toggle';

type InvoicePreviewLightProps = {
  data: InvoiceData;
  onBack: () => void;
  onThemeChange?: (value: 'dark' | 'light') => void;
  currentTheme?: 'dark' | 'light';
};

const InvoicePreviewLight = forwardRef<HTMLDivElement, InvoicePreviewLightProps>(
  ({ data, onBack, onThemeChange, currentTheme = 'light' }, ref) => {
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
        
        // Fill background with light color
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Scale to fit the new size
        const margin = 100 * scale; // Increased margin for better spacing
        const contentWidth = width - (margin * 2);
        
        // HEADER - INVOICE (slightly smaller font)
        ctx.font = `bold ${32 * scale}px Arial`;
        ctx.fillStyle = '#1e293b';
        ctx.fillText('INVOICE', margin, margin);
        
        // Invoice number (reduced font size)
        ctx.font = `${16 * scale}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#1e293b';
        ctx.fillText(data.invoiceNumber, width - margin, margin);
        ctx.fillStyle = '#64748b';
        ctx.fillText('INVOICE NUMBER', width - margin, margin + 26 * scale);
        
        // Reset alignment
        ctx.textAlign = 'left';
        
        // SENDER AND RECIPIENT INFORMATION (increased spacing between sections)
        const headerY = margin + 120 * scale;
        
        // FROM
        ctx.font = `${14 * scale}px Arial`;
        ctx.fillStyle = '#64748b';
        ctx.fillText('FROM', margin, headerY);
        
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${18 * scale}px Arial`;
        ctx.fillText(data.fromCompany, margin, headerY + 36 * scale);
        
        // Sender address (reduced font size for better compactness)
        ctx.font = `${14 * scale}px Arial`;
        ctx.fillStyle = '#334155';
        const addressLines = data.fromAddress.split('\n');
        let y = headerY + 72 * scale;
        addressLines.forEach(line => {
          ctx.fillText(line, margin, y);
          y += 20 * scale; // Reduced line spacing
        });
        
        // VAT/ID Number
        if (data.fromVat) {
          y += 10 * scale;
          ctx.fillStyle = '#64748b';
          ctx.fillText('VAT Number:', margin, y);
          ctx.fillStyle = '#1e293b';
          ctx.fillText(data.fromVat, margin + 95 * scale, y);
        }
        
        // TO
        const colCenter = width / 2 + 100 * scale;
        ctx.fillStyle = '#64748b';
        ctx.fillText('TO', colCenter, headerY);
        
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${18 * scale}px Arial`;
        ctx.fillText(data.toCompany, colCenter, headerY + 36 * scale);
        
        // Recipient address
        ctx.font = `${14 * scale}px Arial`;
        ctx.fillStyle = '#334155';
        const toAddressLines = data.toAddress.split('\n');
        y = headerY + 72 * scale;
        toAddressLines.forEach(line => {
          ctx.fillText(line, colCenter, y);
          y += 20 * scale; // Reduced line spacing
        });
        
        // EIN Number
        if (data.toEin) {
          y = Math.max(y, headerY + 140 * scale);
          ctx.fillStyle = '#64748b';
          ctx.fillText('EIN Number:', colCenter, y);
          ctx.fillStyle = '#1e293b';
          ctx.fillText(data.toEin, colCenter + 90 * scale, y);
        }
        
        // ITEMS TABLE - Improved spacing and positioning
        const tableY = headerY + 260 * scale; // Reduced the gap between address and table
        
        // Table headers
        ctx.fillStyle = '#64748b';
        ctx.font = `${14 * scale}px Arial`;
        
        // Define columns - more evenly spaced
        const descCol = margin; // Description column
        const dateCol = margin + contentWidth * 0.44; // Date column (moved right)
        const amountCol = width - margin; // Amount column
        
        // Headers
        ctx.textAlign = 'left';
        ctx.fillText('DESCRIPTION', descCol, tableY);
        ctx.fillText('DATE', dateCol, tableY);
        ctx.textAlign = 'right';
        ctx.fillText('AMOUNT', amountCol, tableY);
        
        // Items
        let itemY = tableY + 32 * scale;
        const lineHeight = 32 * scale; // Reduced line height
        
        data.items.forEach(item => {
          // Description
          ctx.textAlign = 'left';
          ctx.fillStyle = '#1e293b';
          ctx.font = `bold ${14 * scale}px Arial`;
          ctx.fillText(item.description, descCol, itemY);
          
          // Date - use standardized format
          ctx.font = `${14 * scale}px Arial`;
          // Add clipping to prevent date text from invading other columns
          ctx.save();
          ctx.rect(dateCol, itemY - 20 * scale, amountCol - dateCol - 20 * scale, 30 * scale);
          ctx.clip();
          ctx.fillText(formatDateRange(item), dateCol, itemY);
          ctx.restore();
          
          // Total renamed to Amount
          ctx.textAlign = 'right';
          ctx.fillText(`$${item.total}`, amountCol, itemY);
          
          // Next item
          itemY += lineHeight;
        });
        
        // FINAL AMOUNT renamed to TOTAL
        const totalY = itemY + 65 * scale;
        ctx.textAlign = 'right';
        
        ctx.fillStyle = '#64748b';
        ctx.fillText('TOTAL', amountCol - 120 * scale, totalY);
        
        // Formatted value with decimal places
        const formattedTotal = calculateTotal();
        ctx.fillStyle = '#0ea5e9';
        ctx.font = `bold ${22 * scale}px Arial`; // Slightly smaller font for total
        ctx.fillText(`$${formattedTotal}`, amountCol, totalY);
        
        // NOTES with improved spacing
        let notesY = totalY + scale;
        if (data.notes) {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#64748b';
          ctx.font = `${14 * scale}px Arial`;
          ctx.fillText('NOTES', margin, notesY);
          
          ctx.fillStyle = '#334155';
          ctx.font = `${14 * scale}px Arial`;
          
          // Note text
          notesY += 26 * scale;
          ctx.fillText(data.notes, margin, notesY);
        }
        
        // PAYMENT INFORMATION with improved spacing
        const footerY = Math.max(notesY + 90 * scale, totalY + 120 * scale);
        ctx.fillStyle = '#64748b';
        ctx.font = `${14 * scale}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('PAYMENT INFORMATION', margin, footerY);
        
        // Divide into columns with better spacing
        const footerContentY = footerY + 36 * scale;
        const footerCol1 = margin;
        const footerCol2 = margin + contentWidth * 0.35;
        const footerCol3 = margin + contentWidth * 0.7;
        
        ctx.fillText('Account holder', footerCol1, footerContentY);
        ctx.fillStyle = '#1e293b';
        ctx.fillText(data.paymentInfo.accountHolder, footerCol1, footerContentY + 26 * scale);
        
        ctx.fillStyle = '#64748b';
        ctx.fillText('Account number', footerCol1, footerContentY + 54 * scale);
        ctx.fillStyle = '#1e293b';
        ctx.fillText(data.paymentInfo.accountNumber, footerCol1, footerContentY + 80 * scale);
        
        // Add SWIFT number
        ctx.fillStyle = '#64748b';
        ctx.fillText('SWIFT Number', footerCol1, footerContentY + 106 * scale);
        ctx.fillStyle = '#1e293b';
        ctx.fillText(data.paymentInfo.swiftNumber, footerCol1, footerContentY + 132 * scale);
        
        // Column 2: Bank address
        ctx.fillStyle = '#64748b';
        ctx.fillText('Bank address', footerCol2, footerContentY);

        ctx.fillStyle = '#1e293b';
        const bankAddressLines = data.paymentInfo.bankAddress.split('\n');
        let bankY = footerContentY + 26 * scale;
        bankAddressLines.forEach(line => {
          ctx.fillText(line, footerCol2, bankY);
          bankY += 20 * scale; // Similar spacing as used for other address blocks
        });
        
        // Column 3: Questions and contact
        ctx.fillStyle = '#64748b';
        ctx.fillText('Questions and contact', footerCol3, footerContentY);
        
        ctx.fillStyle = '#334155';
        ctx.fillText(data.paymentInfo.contactEmail, footerCol3, footerContentY + 26 * scale);
        
        // Convert to image and PDF
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
          orientation: 'portrait', 
          unit: 'mm',
          format: 'a4'
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save(`invoice-${data.invoiceNumber.replace('#', '')}-light.pdf`);
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('An error occurred while generating the PDF. Check the console for more details.');
      } finally {
        setIsGenerating(false);
      }
    };
    
    // Styles for screen view - Light theme
    const screenStyles: CSSProperties = {
      backgroundColor: '#ffffff',
      color: '#1e293b',
      padding: '2rem',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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
      color: '#64748b',
      textTransform: 'uppercase' as const,
      fontSize: '0.875rem',
      marginBottom: '0.5rem'
    };

    const addressStyle: CSSProperties = {
      color: '#334155',
      fontSize: '0.875rem',
      marginTop: '0.25rem'
    };

    const tableStyle: CSSProperties = {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginBottom: '2rem'
    };

    const theadStyle: CSSProperties = {
      color: '#64748b',
      textTransform: 'uppercase' as const,
      fontSize: '0.875rem',
      textAlign: 'left' as const,
      paddingBottom: '0.5rem'
    };

    const trStyle: CSSProperties = {
      borderBottom: '1px solid #f1f5f9'
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
      color: '#0ea5e9' // Azul para o tema claro
    };

    const notesStyle: CSSProperties = {
      marginTop: '2rem',
      marginBottom: '2rem'
    };

    const footerStyle: CSSProperties = {
      marginTop: '3rem',
      paddingTop: '1.5rem'
    };

    const footerGridStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '2rem',
      marginTop: '1rem'
    };

    const footerTitleStyle: CSSProperties = {
      color: '#64748b',
      textTransform: 'uppercase' as const,
      fontSize: '0.875rem',
      marginBottom: '0.75rem'
    };
    
    return (
      <div className="max-w-5xl mx-auto p-4 space-y-4" ref={ref}>
        <div className="flex items-center justify-between">
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

        {/* Invoice preview area - layout light theme */}
        <div ref={invoiceRef} style={screenStyles}>
          <div style={headerStyle}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', textTransform: 'uppercase' as const, color: '#1e293b' }}>INVOICE</h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem', color: '#1e293b' }}>{data.invoiceNumber}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>INVOICE NUMBER</div>
            </div>
          </div>

          <div style={gridContainerStyle}>
            <div>
              <div style={labelStyle}>FROM</div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e293b' }}>{data.fromCompany}</div>
              <div style={addressStyle}>
                {formatAddress(data.fromAddress)}
              </div>
              {data.fromVat && (
                <div style={{ fontSize: '0.875rem', marginTop: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>VAT Number:</span> {data.fromVat}
                </div>
              )}
            </div>

            <div>
              <div style={labelStyle}>TO</div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e293b' }}>{data.toCompany}</div>
              <div style={addressStyle}>
                {formatAddress(data.toAddress)}
              </div>
              {data.toEin && (
                <div style={{ fontSize: '0.875rem', marginTop: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>EIN Number:</span> {data.toEin}
                </div>
              )}
            </div>
          </div>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{...theadStyle, width: '35%'}}>DESCRIPTION</th>
                <th style={{...theadStyle, width: '30%'}}>DATE</th>
                <th style={{...theadStyle, width: '20%', textAlign: 'right' as const}}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} style={trStyle}>
                  <td style={{...tdStyle, fontWeight: 'bold', color: '#1e293b'}}>{item.description}</td>
                  <td style={tdStyle}>{formatDateRange(item)}</td>
                  <td style={{...tdStyle, textAlign: 'right' as const}}>${item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={totalContainerStyle}>
            <div style={finalAmountStyle}>
              <span style={{ color: '#64748b', alignSelf: 'center' }}>TOTAL</span>
              <span style={amountValueStyle}>
                ${calculateTotal()}
              </span>
            </div>
          </div>

          {data.notes && (
            <div style={notesStyle}>
              <div style={labelStyle}>NOTES</div>
              <div style={{ fontSize: '0.875rem', color: '#334155' }}>{data.notes}</div>
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
                    <span style={{ color: '#64748b' }}>Account holder:</span>
                  </div>
                  <div style={{ marginBottom: '1rem', color: '#1e293b' }}>
                    {data.paymentInfo.accountHolder}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Account number:</span>
                  </div>
                  <div style={{ marginBottom: '1rem', color: '#1e293b' }}>
                    {data.paymentInfo.accountNumber}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>SWIFT Number:</span>
                  </div>
                  <div style={{ color: '#1e293b' }}>
                    {data.paymentInfo.swiftNumber}
                  </div>
                </div>
              </div>

              <div>
                <div style={footerTitleStyle}>
                  Bank address
                </div>
                <div style={addressStyle}>
                {formatAddress(data.paymentInfo.bankAddress)}
              </div>
              </div>

              <div>
                <div style={footerTitleStyle}>
                  Questions and contact
                </div>
                <div style={{ fontSize: '0.875rem', color: '#334155' }}>
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

InvoicePreviewLight.displayName = 'InvoicePreviewLight';

export default InvoicePreviewLight; 