'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { DateRangePicker } from '@/components/date-range-picker';
import { formatCurrency, formatDateRange } from '@/lib/utils';
import { InvoiceItem as InvoiceItemType } from '@/lib/schema';

interface InvoiceItemProps {
  item: InvoiceItemType;
  index: number;
  onRemove: () => void;
  onUpdate: (field: keyof InvoiceItemType, value: string | number | Date | null) => void;
}

export function InvoiceItem({ item, index, onRemove, onUpdate }: InvoiceItemProps) {
  const handleDateRangeChange = (startDate: Date | null, endDate: Date | null) => {
    onUpdate('startDate', startDate);
    onUpdate('endDate', endDate);
    
    if (startDate && endDate) {
      const formattedDate = formatDateRange(startDate, endDate);
      onUpdate('date', formattedDate);
    } else {
      onUpdate('date', '');
    }
  };

  return (
    <div className="border border-input rounded-md p-5 mb-4 relative">
      <div className="absolute right-1 top-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-destructive hover:text-destructive/90"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor={`item-description-${index}`} className="mb-2 block">
            Description
          </Label>
          <Input
            id={`item-description-${index}`}
            value={item.description}
            onChange={(e) => onUpdate('description', e.target.value)}
            placeholder="Description of service"
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor={`item-date-${index}`} className="mb-2 block">
            Date Range
          </Label>
          <DateRangePicker
            startDate={item.startDate}
            endDate={item.endDate}
            displayValue={item.date}
            onApply={handleDateRangeChange}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`item-rate-${index}`} className="mb-2 block">
            Rate
          </Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
          <Input
            id={`item-rate-${index}`}
            value={item.rate === '0.00' ? '' : item.rate}
              onChange={(e) => onUpdate('rate', e.target.value)}
              onBlur={(e) => onUpdate('rate', formatCurrency(e.target.value))}
              placeholder="0.00"
              className="pl-7 w-full"
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`item-total-${index}`} className="mb-2 block">
            Total
          </Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
            <Input
              id={`item-total-${index}`}
              value={item.total === '0.00' ? '' : item.total}
              onChange={(e) => onUpdate('total', e.target.value)}
              onBlur={(e) => onUpdate('total', formatCurrency(e.target.value))}
              placeholder="0.00"
              className="pl-7 w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}