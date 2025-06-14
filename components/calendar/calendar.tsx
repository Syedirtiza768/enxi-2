'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
  disabled?: (date: Date) => boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const Calendar: React.FC<CalendarProps> = ({
  selected,
  onSelect,
  className,
  disabled
}): void => {
  const [currentDate, setCurrentDate] = React.useState(() => {
    return selected || new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = (): void => {
    setCurrentDate(new Date(year, month - 1));
  };

  const handleNextMonth = (): void => {
    setCurrentDate(new Date(year, month + 1));
  };

  const handleDateClick = (day: number): void => {
    const date = new Date(year, month, day);
    if (disabled && disabled(date)) return;
    if (onSelect) {
      onSelect(date);
    }
  };

  const isSelected = (day: number): void => {
    if (!selected) return false;
    return (
      selected.getFullYear() === year &&
      selected.getMonth() === month &&
      selected.getDate() === day
    );
  };

  const isToday = (day: number): void => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const renderDays = (): void => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isDisabled = disabled && disabled(date);
      
      days.push(
        <button
          key={day}
          onClick={(): void => handleDateClick(day)}
          disabled={isDisabled}
          className={cn(
            'p-2 w-full h-full text-sm rounded-md hover:bg-gray-100 transition-colors',
            isSelected(day) && 'bg-blue-500 text-white hover:bg-blue-600',
            isToday(day) && !isSelected(day) && 'bg-gray-100 font-semibold',
            isDisabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className={cn('bg-white border rounded-lg p-4 shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h2 className="text-lg font-semibold">
          {MONTHS[month]} {year}
        </h2>
        
        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
    </div>
  );
};

// Default export
export default Calendar;