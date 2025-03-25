'use client';

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  CalendarDays,
  CalendarClock,
  Calendar, 
  CalendarIcon
} from "lucide-react";

export type IntervalType = 'day' | 'week' | 'weekend' | 'month';

interface IntervalSelectorProps {
  value: IntervalType;
  onChange: (value: IntervalType) => void;
}

export function IntervalSelector({ value, onChange }: IntervalSelectorProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(newValue: string) => onChange(newValue as IntervalType)}
      className="grid grid-cols-2 md:grid-cols-4 gap-2"
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="day" id="interval-day" />
        <Label 
          htmlFor="interval-day" 
          className="flex items-center space-x-2 cursor-pointer"
        >
          <CalendarDays className="h-4 w-4" />
          <span>Day</span>
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="week" id="interval-week" />
        <Label 
          htmlFor="interval-week" 
          className="flex items-center space-x-2 cursor-pointer"
        >
          <CalendarClock className="h-4 w-4" />
          <span>Week</span>
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="weekend" id="interval-weekend" />
        <Label 
          htmlFor="interval-weekend" 
          className="flex items-center space-x-2 cursor-pointer"
        >
          <Calendar className="h-4 w-4" />
          <span>Weekend</span>
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="month" id="interval-month" />
        <Label 
          htmlFor="interval-month" 
          className="flex items-center space-x-2 cursor-pointer"
        >
          <CalendarIcon className="h-4 w-4" />
          <span>Month</span>
        </Label>
      </div>
    </RadioGroup>
  );
} 