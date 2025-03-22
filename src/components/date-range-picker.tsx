'use client';

import { useRef, useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import DatePicker from 'react-datepicker';
import { formatDateRange } from '@/lib/utils';
import "react-datepicker/dist/react-datepicker.css";
import { CalendarIcon, X, Check } from 'lucide-react';
import { addDays } from 'date-fns';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onApply: (startDate: Date | null, endDate: Date | null) => void;
  displayValue?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onApply,
  displayValue
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate ? new Date(startDate) : null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate ? new Date(endDate) : null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Update local state when props change
  useEffect(() => {
    setTempStartDate(startDate ? new Date(startDate) : null);
    setTempEndDate(endDate ? new Date(endDate) : null);
  }, [startDate, endDate]);

  // Close the calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [datePickerRef]);

  const handleOpenCalendar = () => {
    // Initialize with default dates if dates are empty
    if (!tempStartDate && !tempEndDate) {
      const today = new Date();
      setTempStartDate(today);
      setTempEndDate(addDays(today, 1));
    }
    setIsOpen(!isOpen);
  };

  const handleApply = () => {
    // Make sure to pass new Date objects to prevent reference issues
    onApply(
      tempStartDate ? new Date(tempStartDate.getTime()) : null,
      tempEndDate ? new Date(tempEndDate.getTime()) : null
    );
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    onApply(null, null);
    setIsOpen(false);
  };

  return (
    <div className="date-range-container relative" ref={datePickerRef}>
      <button 
        type="button"
        className="w-full flex items-center justify-between border border-input rounded-md px-3 py-2 text-sm bg-background date-range-selector cursor-pointer"
        onClick={handleOpenCalendar}
      >
        <span className="flex-grow truncate text-left">
          {displayValue || formatDateRange(tempStartDate, tempEndDate) || "Select date range"}
        </span>
        <CalendarIcon className="h-4 w-4 opacity-70" />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-background border border-input rounded-md shadow-lg p-4 date-range-popover max-w-[440px]">
          <div className="flex gap-3 mb-4">
            <div>
              <Label className="mb-2 block">Start Date</Label>
              <DatePicker
                selected={tempStartDate}
                onChange={(date: Date | null) => setTempStartDate(date)}
                selectsStart
                startDate={tempStartDate || undefined}
                endDate={tempEndDate || undefined}
                dateFormat="MMM dd, yyyy"
                className="border border-input rounded-md p-2 text-sm bg-background w-full"
                calendarClassName="bg-background"
              />
            </div>
            <div>
              <Label className="mb-2 block">End Date</Label>
              <DatePicker
                selected={tempEndDate}
                onChange={(date: Date | null) => setTempEndDate(date)}
                selectsEnd
                startDate={tempStartDate || undefined}
                endDate={tempEndDate || undefined}
                minDate={tempStartDate || undefined}
                dateFormat="MMM dd, yyyy"
                className="border border-input rounded-md p-2 text-sm bg-background w-full"
                calendarClassName="bg-background"
              />
            </div>
          </div>
          <div className="flex justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleClear}
              className="text-destructive hover:text-destructive/90"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={handleApply}
            >
              <Check className="h-4 w-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 