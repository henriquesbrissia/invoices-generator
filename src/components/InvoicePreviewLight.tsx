import { forwardRef, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { InvoiceData } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

type InvoicePreviewLightProps = {
  data: InvoiceData;
  onBack: () => void;
  onThemeChange?: (value: 'dark' | 'light') => void;
  currentTheme?: 'dark' | 'light';
};

const InvoicePreviewLight = forwardRef<
  HTMLDivElement,
  InvoicePreviewLightProps
>(({ data, onBack, onThemeChange, currentTheme = 'light' }, ref) => {
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
    return data.items
      .reduce((sum, item) => sum + parseFloat(item.total), 0)
      .toFixed(2);
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
      const margin = 90 * scale; // Increased margin for better spacing
      const contentWidth = width - margin * 2;

      // HEADER - INVOICE
      ctx.font = `bold ${32 * scale}px Arial`;
      ctx.fillStyle = '#1e293b';
      ctx.fillText('INVOICE', margin, margin);

      // Invoice number
      ctx.font = `${19 * scale}px Arial`;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1e293b';
      ctx.fillText(data.invoiceNumber, width - margin, margin);
      ctx.font = `${13 * scale}px Arial`;
      ctx.fillStyle = '#64748b';
      ctx.fillText('INVOICE NUMBER', width - margin, margin + 22 * scale);

      // Reset alignment
      ctx.textAlign = 'left';

      // SENDER AND RECIPIENT INFORMATION
      const headerY = margin + 110 * scale;

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
      addressLines.forEach((line) => {
        ctx.fillText(line, margin, y);
        y += 20 * scale; // Reduced line spacing
      });

      // VAT/ID Number
      if (data.fromVat) {
        y += 5 * scale;
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
      toAddressLines.forEach((line) => {
        ctx.fillText(line, colCenter, y);
        y += 20 * scale; // Reduced line spacing
      });

      // EIN Number
      if (data.toEin) {
        y += 5 * scale;
        ctx.fillStyle = '#64748b';
        ctx.fillText('EIN Number:', colCenter, y);
        ctx.fillStyle = '#1e293b';
        ctx.fillText(data.toEin, colCenter + 90 * scale, y);
      }

      // ITEMS TABLE - Improved spacing and positioning
      const tableY = headerY + 215 * scale; // Reduced the gap between address and table

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

      data.items.forEach((item) => {
        // Description
        // Draw rounded rectangle for item background
        ctx.fillStyle = '#f3f4f6'; // Light gray background for items
        const rectX = descCol - 10 * scale;
        const rectY = itemY - 19 * scale;
        const rectWidth = 665 * scale;
        const rectHeight = 30 * scale;
        const radius = 8 * scale;

        ctx.beginPath();
        ctx.moveTo(rectX + radius, rectY);
        ctx.lineTo(rectX + rectWidth - radius, rectY);
        ctx.arcTo(
          rectX + rectWidth,
          rectY,
          rectX + rectWidth,
          rectY + radius,
          radius
        );
        ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
        ctx.arcTo(
          rectX + rectWidth,
          rectY + rectHeight,
          rectX + rectWidth - radius,
          rectY + rectHeight,
          radius
        );
        ctx.lineTo(rectX + radius, rectY + rectHeight);
        ctx.arcTo(
          rectX,
          rectY + rectHeight,
          rectX,
          rectY + rectHeight - radius,
          radius
        );
        ctx.lineTo(rectX, rectY + radius);
        ctx.arcTo(rectX, rectY, rectX + radius, rectY, radius);
        ctx.closePath();
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${14 * scale}px Arial`;
        ctx.fillText(item.description, descCol, itemY);

        // Date - use standardized format
        ctx.font = `${14 * scale}px Arial`;
        // Add clipping to prevent date text from invading other columns
        ctx.save();
        ctx.rect(
          dateCol,
          itemY - 20 * scale,
          amountCol - dateCol - 20 * scale,
          30 * scale
        );
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

      ctx.fillStyle = '#64748b';
      ctx.fillText('TOTAL', amountCol, totalY - 26 * scale);

      // Formatted value with decimal places
      const formattedTotal = calculateTotal();
      ctx.fillStyle = '#0ea5e9';
      ctx.font = `bold ${22 * scale}px Arial`;
      ctx.fillText(`$${formattedTotal}`, amountCol, totalY);

      // NOTES with improved spacing
      let notesY = totalY + 50 * scale;
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

      // Calculate the available space for content
      const pageHeight = height;
      const contentEndY = notesY + (data.notes ? scale : 0);

      // PAYMENT INFORMATION with fixed position at the bottom of the page
      // Ensure minimum spacing from content or position at bottom if there's enough space
      const footerHeight = 220 * scale; // Approximate height needed for footer content
      const footerY = Math.max(
        pageHeight - footerHeight - 30 * scale,
        contentEndY + 80 * scale
      );

      ctx.fillStyle = '#f3f4f6'; // Light background for footer
      ctx.fillRect(0, footerY - 30 * scale, width, pageHeight); // Extend to bottom of page
      ctx.fillStyle = '#64748b';
      ctx.font = `${14 * scale}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillText('PAYMENT INFORMATION', margin, footerY);

      // Divide into columns with better spacing
      const footerContentY = footerY + 36 * scale;
      const footerCol1 = margin;
      const footerCol2 = margin + contentWidth * 0.4;
      const footerCol3 = margin + contentWidth * 0.78;

      // Helper to wrap and draw text
      function drawWrappedText(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number
      ) {
        const words = text.split(' ');
        let line = '';
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, y);
        return y + lineHeight;
      }

      ctx.font = `${12 * scale}px Arial`;
      let col1Y = footerContentY;
      ctx.fillStyle = '#64748b';
      ctx.fillText('Account holder', footerCol1, col1Y);
      ctx.fillStyle = '#1e293b';
      col1Y = drawWrappedText(
        ctx,
        data.paymentInfo.accountHolder,
        footerCol1,
        col1Y + 18 * scale,
        contentWidth * 0.36,
        20 * scale
      );
      ctx.fillStyle = '#64748b';
      ctx.fillText('Account number', footerCol1, col1Y);
      ctx.fillStyle = '#1e293b';
      col1Y = drawWrappedText(
        ctx,
        data.paymentInfo.accountNumber,
        footerCol1,
        col1Y + 18 * scale,
        contentWidth * 0.36,
        20 * scale
      );
      ctx.fillStyle = '#64748b';
      ctx.fillText('SWIFT Number', footerCol1, col1Y);
      ctx.fillStyle = '#1e293b';
      col1Y = drawWrappedText(
        ctx,
        data.paymentInfo.swiftNumber,
        footerCol1,
        col1Y + 18 * scale,
        contentWidth * 0.36,
        20 * scale
      );

      // Column 2: Bank address
      ctx.fillStyle = '#64748b';
      ctx.fillText('Bank address', footerCol2, footerContentY);
      ctx.fillStyle = '#1e293b';
      let bankY = footerContentY + 18 * scale;
      data.paymentInfo.bankAddress.split('\n').forEach((line) => {
        bankY = drawWrappedText(
          ctx,
          line,
          footerCol2,
          bankY,
          contentWidth * 0.32,
          20 * scale
        );
      });

      // Column 3: Questions and contact
      ctx.fillStyle = '#64748b';
      ctx.fillText('Questions and contact', footerCol3, footerContentY);
      ctx.fillStyle = '#334155';
      drawWrappedText(
        ctx,
        data.paymentInfo.contactEmail,
        footerCol3,
        footerContentY + 18 * scale,
        contentWidth * 0.28,
        20 * scale
      );

      // Convert to image and PDF
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`invoice-${data.invoiceNumber.replace('#', '')}-light.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(
        'An error occurred while generating the PDF. Check the console for more details.'
      );
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
        <Button onClick={generatePDF} disabled={isGenerating}>
          {isGenerating ? 'Generating PDF...' : 'Download PDF'}
        </Button>
      </div>

      {/* Invoice preview area with Tailwind classes */}
      <div className="overflow-x-auto">
        <div
          ref={invoiceRef}
          className="bg-white text-slate-800 p-20 rounded-lg shadow-lg origin-top-left scale-[0.7] sm:scale-100 w-[143%] sm:w-full"
        >
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-3xl font-bold uppercase text-slate-800">
                INVOICE
              </h1>
            </div>
            <div className="text-right">
              <div className="text-xl mb-1 text-slate-800">
                {data.invoiceNumber}
              </div>
              <div className="text-sm text-slate-500">INVOICE NUMBER</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-24">
            <div>
              <div className="text-sm uppercase text-slate-500 mb-2">FROM</div>
              <div className="font-bold mb-2 text-slate-800">
                {data.fromCompany}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {formatAddress(data.fromAddress)}
              </div>
              {data.fromVat && (
                <div className="text-sm mt-3">
                  <span className="text-slate-500">VAT Number:</span>{' '}
                  {data.fromVat}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm uppercase text-slate-500 mb-2">TO</div>
              <div className="font-bold mb-2 text-slate-800">
                {data.toCompany}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {formatAddress(data.toAddress)}
              </div>
              {data.toEin && (
                <div className="text-sm mt-3">
                  <span className="text-slate-500">EIN Number:</span>{' '}
                  {data.toEin}
                </div>
              )}
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr>
                <th className="text-left text-sm uppercase text-slate-500 pb-2 w-[44%]">
                  DESCRIPTION
                </th>
                <th className="text-left text-sm uppercase text-slate-500 pb-2 w-[27%]">
                  DATE
                </th>
                <th className="text-right text-sm uppercase text-slate-500 pb-2 w-[27%]">
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-1.5" colSpan={3}>
                    <div className="bg-gray-100 rounded-lg p-2 flex">
                      <div className="w-[45%] font-bold text-sm text-slate-800">
                        {item.description}
                      </div>
                      <div className="w-[30%] text-sm">
                        {formatDateRange(item)}
                      </div>
                      <div className="w-[20%] text-sm text-right ml-auto">
                        ${item.total}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-6 mb-8">
            <div className="flex flex-col py-2">
              <span className="text-slate-500 text-end">TOTAL</span>
              <span className="text-2xl font-bold text-sky-600">
                ${calculateTotal()}
              </span>
            </div>
          </div>

          {data.notes && (
            <div className="mt-8 mb-8">
              <div className="text-sm uppercase text-slate-500 mb-2">NOTES</div>
              <div className="text-sm text-slate-600">{data.notes}</div>
            </div>
          )}

          <div className="mt-12 pt-6 bg-gray-100 rounded-lg p-20 -mx-20 -mb-20">
            <div className="text-sm uppercase text-slate-500 mb-4">
              PAYMENT INFORMATION
            </div>
            <div className="grid grid-cols-3 gap-x-8 gap-y-6 mt-4">
              <div>
                <div className="text-xs space-y-4">
                  <div>
                    <span className="text-slate-500">Account holder</span>
                    <div className="text-slate-800 mt-1 break-words max-w-[90%]">
                      {data.paymentInfo.accountHolder}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Account number</span>
                    <div className="text-slate-800 mt-1">
                      {data.paymentInfo.accountNumber}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">SWIFT Number</span>
                    <div className="text-slate-800 mt-1 break-words max-w-[90%]">
                      {data.paymentInfo.swiftNumber}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2">Bank address</div>
                <div className="text-xs text-slate-600 space-y-2">
                  {data.paymentInfo.bankAddress.split('\n').map((line, i) => (
                    <div key={i} className="break-words max-w-[90%]">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2">
                  Questions and contact
                </div>
                <div className="text-xs text-slate-600 break-words max-w-[90%]">
                  {data.paymentInfo.contactEmail}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

InvoicePreviewLight.displayName = 'InvoicePreviewLight';

export default InvoicePreviewLight;
