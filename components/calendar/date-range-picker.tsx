'use client';

import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from './calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
  className,
  placeholder = 'Pick a date range',
  disabled = false
}): void => {
  const [range, setRange] = React.useState<DateRange>(
    dateRange || { from: undefined, to: undefined }
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectingEnd, setSelectingEnd] = React.useState(false);

  const handleDateSelect = (date: Date): void => {
    if (!selectingEnd || !range.from) {
      // Selecting start date
      setRange({ from: date, to: undefined });
      setSelectingEnd(true);
    } else {
      // Selecting end date
      if (date < range.from) {
        // If end date is before start date, swap them
        setRange({ from: date, to: range.from });
      } else {
        setRange({ from: range.from, to: date });
      }
      setSelectingEnd(false);
      setIsOpen(false);
      
      // Notify parent component
      if (onDateRangeChange) {
        const newRange = {
          from: range.from,
          to: date < range.from ? range.from : date
        };
        if (date < range.from) {
          newRange.from = date;
        }
        onDateRangeChange(newRange);
      }
    }
  };

  const formatDateRange = (): void => {
    if (!range.from) return placeholder;
    if (!range.to) return format(range.from, 'PPP');
    return `${format(range.from, 'PPP')} - ${format(range.to, 'PPP')}`;
  };

  const isDateInRange = (date: Date): void => {
    if (!range.from || !range.to) return false;
    return date >= range.from && date <= range.to;
  };

  const isDateDisabled = (date: Date): void => {
    if (selectingEnd && range.from) {
      // When selecting end date, disable dates more than 90 days from start
      const maxDate = new Date(range.from);
      maxDate.setDate(maxDate.getDate() + 90);
      return date > maxDate;
    }
    return false;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !range.from && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          <div className="mb-2 text-sm">
            {!selectingEnd ? (
              <span className="text-muted-foreground">Select start date</span>
            ) : (
              <span className="text-muted-foreground">Select end date</span>
            )}
          </div>
          
          <Calendar
            selected={selectingEnd ? range.to : range.from}
            onSelect={handleDateSelect}
            disabled={isDateDisabled}
            className="border-0 shadow-none"
          />
          
          {range.from && range.to && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">
                Selected range:
              </div>
              <div className="text-sm font-medium">
                {format(range.from, 'PPP')} - {format(range.to, 'PPP')}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={(): void => {
                  setRange({ from: undefined, to: undefined });
                  setSelectingEnd(false);
                  if (onDateRangeChange) {
                    onDateRangeChange({ from: undefined, to: undefined });
                  }
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Default export
export default DateRangePicker;