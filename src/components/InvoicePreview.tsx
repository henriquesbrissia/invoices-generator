import { forwardRef, useRef, useState } from "react";
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
  ({ data, onBack, onThemeChange, currentTheme = 'dark' }, ref) => {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const formatAddress = (address: string) => {
      return address.split('\n').map((line, i) => (
        <span key={i} className="block">
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
        ctx.fillStyle = '#24292A';
        ctx.fillRect(0, 0, width, height);
        
        // Scale to fit the new size
        const margin = 90 * scale; // Increased margin for better spacing
        const contentWidth = width - (margin * 2);
        
        // HEADER - INVOICE
        ctx.font = `bold ${32 * scale}px Arial`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('INVOICE', margin, margin);
        
        // Invoice number
        ctx.font = `${19 * scale}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(data.invoiceNumber, width - margin, margin);
        ctx.font = `${13 * scale}px Arial`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('INVOICE NUMBER', width - margin, margin + 22 * scale);
        
        // Reset alignment
        ctx.textAlign = 'left';
        
        // SENDER AND RECIPIENT INFORMATION (increased spacing between sections)
        const headerY = margin + 110 * scale;
        
        // FROM
        ctx.font = `${14 * scale}px Arial`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('FROM', margin, headerY);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${18 * scale}px Arial`;
        ctx.fillText(data.fromCompany, margin, headerY + 36 * scale);
        
        // Sender address (reduced font size for better compactness)
        ctx.font = `${14 * scale}px Arial`;
        ctx.fillStyle = '#cbd5e1';
        const addressLines = data.fromAddress.split('\n');
        let y = headerY + 72 * scale;
        addressLines.forEach(line => {
          ctx.fillText(line, margin, y);
          y += 20 * scale; // Reduced line spacing
        });
        
        // VAT/ID Number
        if (data.fromVat) {
          y += 5 * scale;
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('VAT Number:', margin, y);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(data.fromVat, margin + 95 * scale, y);
        }
        
        // TO
        const colCenter = width / 2 + 100 * scale;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('TO', colCenter, headerY);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${18 * scale}px Arial`;
        ctx.fillText(data.toCompany, colCenter, headerY + 36 * scale);
        
        // Recipient address
        ctx.font = `${14 * scale}px Arial`;
        ctx.fillStyle = '#cbd5e1';
        const toAddressLines = data.toAddress.split('\n');
        y = headerY + 72 * scale;
        toAddressLines.forEach(line => {
          ctx.fillText(line, colCenter, y);
          y += 20 * scale; // Reduced line spacing
        });
        
        // EIN Number
        if (data.toEin) {
          y += 5 * scale;
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('EIN Number:', colCenter, y);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(data.toEin, colCenter + 90 * scale, y);
        }
        
        // ITEMS TABLE - Improved spacing and positioning
        const tableY = headerY + 215 * scale; // Reduced the gap between address and table
        
        // Table headers
        ctx.fillStyle = '#94a3b8';
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
          // Draw rounded rectangle for item background
          ctx.fillStyle = '#343C3D';
          const rectX = descCol - 10 * scale;
          const rectY = itemY - 19 * scale;
          const rectWidth = 665 * scale;
          const rectHeight = 30 * scale;
          const radius = 8 * scale;

          ctx.beginPath();
          ctx.moveTo(rectX + radius, rectY);
          ctx.lineTo(rectX + rectWidth - radius, rectY);
          ctx.arcTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + radius, radius);
          ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
          ctx.arcTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - radius, rectY + rectHeight, radius);
          ctx.lineTo(rectX + radius, rectY + rectHeight);
          ctx.arcTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - radius, radius);
          ctx.lineTo(rectX, rectY + radius);
          ctx.arcTo(rectX, rectY, rectX + radius, rectY, radius);
          ctx.closePath();
          ctx.fill();

          ctx.textAlign = 'left';
          ctx.fillStyle = '#ffffff';
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
          
          ctx.textAlign = 'right';
          ctx.fillText(`$${item.total}`, amountCol, itemY);
          
          // Next item
          itemY += lineHeight + 8 * scale;
        });
        
        // FINAL AMOUNT renamed to TOTAL
        const totalY = itemY + 40 * scale;
        ctx.textAlign = 'right';
        
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('TOTAL', amountCol, totalY - 26 * scale);
        
        // Formatted value with decimal places
        const formattedTotal = calculateTotal();
        ctx.fillStyle = '#ff6b00'; // More vibrant orange
        ctx.font = `bold ${22 * scale}px Arial`; // Slightly smaller font for total
        ctx.fillText(`$${formattedTotal}`, amountCol, totalY);
        
        // NOTES with improved spacing
        let notesY = totalY + 50 * scale;
        if (data.notes) {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#94a3b8';
          ctx.font = `${14 * scale}px Arial`;
          ctx.fillText('NOTES', margin, notesY);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = `${14 * scale}px Arial`;
          
          // Note text
          notesY += 26 * scale;
          ctx.fillText(data.notes, margin, notesY);
        }
        
        // Calculate the available space for content
        const pageHeight = height;
        const contentEndY = notesY + (data.notes ? scale : 0);
        
        // PAYMENT INFORMATION with fixed position at the bottom of the page
        // Ensure minimum spacing from content or position at bottom if there's enough space
        const footerHeight = 220 * scale; // Approximate height needed for footer content
        const footerY = Math.max(pageHeight - footerHeight - 30 * scale, contentEndY + 80 * scale);
        
        ctx.fillStyle = '#343C3D'; // Darker background
        ctx.fillRect(0, footerY - 30 * scale, width, pageHeight); // Extend to bottom of page
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${14 * scale}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('PAYMENT INFORMATION', margin, footerY);
        
        // Divide into columns with better spacing
        const footerContentY = footerY + 36 * scale;
        const footerCol1 = margin;
        const footerCol2 = margin + contentWidth * 0.35;
        const footerCol3 = margin + contentWidth * 0.7;
        
        ctx.fillText('Account holder', footerCol1, footerContentY);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(data.paymentInfo.accountHolder, footerCol1, footerContentY + 26 * scale);
        
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Account number', footerCol1, footerContentY + 54 * scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(data.paymentInfo.accountNumber, footerCol1, footerContentY + 80 * scale);
        
        // Add SWIFT number
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('SWIFT Number', footerCol1, footerContentY + 106 * scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(data.paymentInfo.swiftNumber, footerCol1, footerContentY + 132 * scale);
        
        // Column 2: Bank address
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Bank address', footerCol2, footerContentY);

        ctx.fillStyle = '#ffffff';
        const bankAddressLines = data.paymentInfo.bankAddress.split('\n');
        let bankY = footerContentY + 26 * scale;
        bankAddressLines.forEach(line => {
          ctx.fillText(line, footerCol2, bankY);
          bankY += 20 * scale; // Similar spacing as used for other address blocks
        });
        
        // Column 3: Questions and contact
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Questions and contact', footerCol3, footerContentY);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(data.paymentInfo.contactEmail, footerCol3, footerContentY + 26 * scale);
        
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

        {/* Invoice preview area with Tailwind classes */}
        <div className="overflow-x-auto">
          <div ref={invoiceRef} className="bg-zinc-800 text-white p-20 rounded-lg shadow-lg origin-top-left scale-[0.7] sm:scale-100 w-[143%] sm:w-full">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-3xl font-bold uppercase text-white">INVOICE</h1>
              </div>
              <div className="text-right">
                <div className="text-xl mb-1 text-white">{data.invoiceNumber}</div>
                <div className="text-sm text-zinc-400">INVOICE NUMBER</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-24">
              <div>
                <div className="text-sm uppercase text-zinc-400 mb-2">FROM</div>
                <div className="font-bold mb-2 text-white">{data.fromCompany}</div>
                <div className="text-sm text-zinc-300 mt-1">
                  {formatAddress(data.fromAddress)}
                </div>
                {data.fromVat && (
                  <div className="text-sm mt-3">
                    <span className="text-zinc-400">VAT Number:</span> {data.fromVat}
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm uppercase text-zinc-400 mb-2">TO</div>
                <div className="font-bold mb-2 text-white">{data.toCompany}</div>
                <div className="text-sm text-zinc-300 mt-1">
                  {formatAddress(data.toAddress)}
                </div>
                {data.toEin && (
                  <div className="text-sm mt-3">
                    <span className="text-zinc-400">EIN Number:</span> {data.toEin}
                  </div>
                )}
              </div>
            </div>

            <table className="w-full mb-8">
              <thead>
                <tr>
                  <th className="text-left text-sm uppercase text-zinc-400 pb-2 w-[44%]">DESCRIPTION</th>
                  <th className="text-left text-sm uppercase text-zinc-400 pb-2 w-[27%]">DATE</th>
                  <th className="text-right text-sm uppercase text-zinc-400 pb-2 w-[27%]">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-1.5" colSpan={3}>
                      <div className="bg-zinc-700 rounded-lg p-2 flex">
                        <div className="w-[45%] font-bold text-sm text-white">{item.description}</div>
                        <div className="w-[30%] text-sm text-zinc-300">{formatDateRange(item)}</div>
                        <div className="w-[20%] text-sm text-right ml-auto text-white">${item.total}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mt-6 mb-8">
              <div className="flex flex-col py-2">
                <span className="text-zinc-400 text-end">TOTAL</span>
                <span className="text-2xl font-bold text-orange-500">
                  ${calculateTotal()}
                </span>
              </div>
            </div>

            {data.notes && (
              <div className="mt-8 mb-8">
                <div className="text-sm uppercase text-zinc-400 mb-2">NOTES</div>
                <div className="text-sm text-zinc-300">{data.notes}</div>
              </div>
            )}

            <div className="mt-12 pt-6 bg-zinc-700 rounded-lg p-20 -mx-20 -mb-20">
              <div className="text-sm uppercase text-zinc-400 mb-4">PAYMENT INFORMATION</div>
              <div className="grid grid-cols-3 gap-8 mt-4">
                <div>
                  <div className="text-sm">
                    <div className="mb-2">
                      <span className="text-zinc-400">Account holder</span>
                    </div>
                    <div className="mb-4 text-white">
                      {data.paymentInfo.accountHolder}
                    </div>
                    <div className="mb-2">
                      <span className="text-zinc-400">Account number</span>
                    </div>
                    <div className="mb-4 text-white">
                      {data.paymentInfo.accountNumber}
                    </div>
                    <div className="mb-2">
                      <span className="text-zinc-400">SWIFT Number</span>
                    </div>
                    <div className="text-white">
                      {data.paymentInfo.swiftNumber}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-zinc-400 mb-3">
                    Bank address
                  </div>
                  <div className="text-sm text-zinc-300">
                    {formatAddress(data.paymentInfo.bankAddress)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-zinc-400 mb-3">
                    Questions and contact
                  </div>
                  <div className="text-sm text-zinc-300">
                    {data.paymentInfo.contactEmail}
                  </div>
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