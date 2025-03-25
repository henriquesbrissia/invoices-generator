'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/date-range-picker';
import { IntervalSelector, IntervalType } from '@/components/interval-selector';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { 
  differenceInDays, 
  differenceInMonths, 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  isWeekend,
  startOfMonth,
  endOfMonth
} from 'date-fns';

interface IntervalDateRangePickerProps {
  onIntervalChange: (intervalType: IntervalType) => void;
  onDatesChange: (
    startDate: Date | null, 
    endDate: Date | null, 
    segmentCount: number,
    segments: Array<{ start: Date; end: Date }> | null
  ) => void;
  amount: string;
  initialIntervalType?: IntervalType;
  customStepNumbers?: {
    intervalType?: number;
    dateRange?: number;
  };
}

export function IntervalDateRangePicker({ 
  onIntervalChange, 
  onDatesChange,
  amount,
  initialIntervalType = 'day',
  customStepNumbers
}: IntervalDateRangePickerProps) {
  const [intervalType, setIntervalType] = useState<IntervalType>(initialIntervalType);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [segmentCount, setSegmentCount] = useState(0);
  const [segments, setSegments] = useState<Array<{ start: Date; end: Date }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use default step numbers or custom ones if provided
  const intervalTypeStep = customStepNumbers?.intervalType || 1;
  const dateRangeStep = customStepNumbers?.dateRange || 2;

  // Handle interval type change
  const handleIntervalTypeChange = (newIntervalType: IntervalType) => {
    setIntervalType(newIntervalType);
    onIntervalChange(newIntervalType);
    
    // If dates already selected, recalculate segments
    if (startDate && endDate) {
      calculateSegments(startDate, endDate, newIntervalType);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (newStartDate: Date | null, newEndDate: Date | null) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    
    if (newStartDate && newEndDate) {
      calculateSegments(newStartDate, newEndDate, intervalType);
    } else {
      // Reset if dates are cleared
      setSegmentCount(0);
      setSegments(null);
      setError(null);
      onDatesChange(null, null, 0, null);
    }
  };

  // Calculate segments based on interval type and date range
  const calculateSegments = (
    start: Date, 
    end: Date, 
    interval: IntervalType
  ) => {
    setError(null);
    let calculatedSegments: Array<{ start: Date; end: Date }> = [];
    let count = 0;

    try {
      // Ensure end date is not before start date
      if (end < start) {
        setError("End date cannot be before start date");
        setSegmentCount(0);
        setSegments(null);
        onDatesChange(start, end, 0, null);
        return;
      }

      switch (interval) {
        case 'day':
          // Each day is a segment
          count = differenceInDays(end, start) + 1;
          calculatedSegments = eachDayOfInterval({ start, end }).map(date => ({
            start: date,
            end: date
          }));
          break;
          
        case 'week':
          // Each week is a segment
          calculatedSegments = eachWeekOfInterval(
            { start, end },
            { weekStartsOn: 1 } // 1 = Monday
          ).map(weekStart => {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 4);
            
            // Ensure we don't exceed the selected end date
            const adjustedEnd = weekEnd > end ? end : weekEnd;
            
            return {
              start: weekStart,
              end: adjustedEnd
            };
          });
          count = calculatedSegments.length;
          break;
          
        case 'weekend':
          // Each weekend day (Saturday and Sunday) is a segment
          const allDays = eachDayOfInterval({ start, end });
          calculatedSegments = allDays
            .filter(date => isWeekend(date))
            .map(date => ({
              start: date,
              end: date
            }));
          count = calculatedSegments.length;
          break;
          
        case 'month':
          // Each month is a segment
          count = differenceInMonths(end, start) + 1;
          
          if (count <= 0) {
            // Handle case where dates are in the same month
            calculatedSegments = [{
              start: start,
              end: end
            }];
            count = 1;
          } else {
            // Create segments for each month
            let currentMonth = startOfMonth(start);
            
            for (let i = 0; i < count; i++) {
              const monthStart = i === 0 ? start : startOfMonth(currentMonth);
              const monthEnd = i === count - 1 ? end : endOfMonth(currentMonth);
              
              calculatedSegments.push({
                start: monthStart,
                end: monthEnd
              });
              
              // Move to next month
              currentMonth = new Date(currentMonth);
              currentMonth.setMonth(currentMonth.getMonth() + 1);
            }
          }
          break;
      }

      // Validate the result
      if (count === 0) {
        setError(`No valid ${interval} segments found in the selected range`);
      }
      
      setSegmentCount(count);
      setSegments(calculatedSegments);
      onDatesChange(start, end, count, calculatedSegments);
    } catch (err) {
      console.error("Error calculating segments:", err);
      setError("Error calculating date segments");
      setSegmentCount(0);
      setSegments(null);
      onDatesChange(start, end, 0, null);
    }
  };

  // Calculate total based on segments and amount
  const calculateTotal = () => {
    if (!segmentCount || !amount) return '0.00';
    const amountValue = parseFloat(amount) || 0;
    return (segmentCount * amountValue).toFixed(2);
  };

  // Format preview item text based on interval type and segment
  const formatPreviewItem = (segment: { start: Date; end: Date }, index: number): string => {
    // Only show first 3 items plus a "+X more" message if there are many
    if (index >= 3 && segmentCount > 4) {
      return `+ ${segmentCount - 3} more ${intervalType}(s)...`;
    } else if (index >= 3) {
      return '';
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    switch (intervalType) {
      case 'day':
        return `Daily rate - ${monthNames[segment.start.getMonth()]} ${segment.start.getDate()}`;
      case 'week':
        return `Weekly rate - ${monthNames[segment.start.getMonth()]} ${segment.start.getDate()}-${
          segment.end.getMonth() !== segment.start.getMonth() 
            ? `${monthNames[segment.end.getMonth()]} ` 
            : ''
        }${segment.end.getDate()}`;
      case 'weekend':
        const dayName = segment.start.getDay() === 0 ? 'Sun' : 'Sat';
        return `Weekend - ${dayName}, ${monthNames[segment.start.getMonth()]} ${segment.start.getDate()}`;
      case 'month':
        if (segment.start.getMonth() === segment.end.getMonth()) {
          return `Monthly rate - ${monthNames[segment.start.getMonth()]} ${segment.start.getFullYear()}`;
        } else {
          return `Monthly rate - ${monthNames[segment.start.getMonth()]}-${monthNames[segment.end.getMonth()]}`;
        }
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className={`mb-2 block`}>Step {intervalTypeStep}: Select Interval Type</Label>
        <IntervalSelector 
          value={intervalType} 
          onChange={handleIntervalTypeChange} 
        />
      </div>
      
      <div>
        <Label className={`mb-2 block`}>Step {dateRangeStep}: Select Date Range</Label>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onApply={handleDateRangeChange}
        />
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {segmentCount > 0 && !error && (
        <div className="pt-2">
          <div className="flex justify-between text-sm">
            <span>Segments:</span>
            <span className="font-semibold">{segmentCount} {intervalType}(s)</span>
          </div>
          
          <div className="flex justify-between text-sm mt-1">
            <span>Amount per {intervalType}:</span>
            <span className="font-semibold">${amount || '0.00'}</span>
          </div>
          
          <div className="flex justify-between text-sm mt-1 pt-1 border-t">
            <span>Total:</span>
            <span className="font-semibold">${calculateTotal()}</span>
          </div>

          {segments && segments.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <Label className="mb-2 block">Preview of items that will be created:</Label>
              <ul className="pl-5 space-y-1 list-disc text-sm text-muted-foreground">
                {segments.map((segment, index) => {
                  const previewText = formatPreviewItem(segment, index);
                  return previewText ? (
                    <li key={index}>{previewText}</li>
                  ) : null;
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 