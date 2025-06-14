import type { DateRange } from '@/lib/types'
'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'

// DateRange moved to common types

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
  placeholder?: string
}

export function DateRangePicker({ value, onChange, className, placeholder }: DateRangePickerProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [tempRange, setTempRange] = useState<DateRange>(value)

  const handleApply = (): void => {
    onChange(tempRange)
    setIsOpen(false)
  }

  const handleCancel = (): void => {
    setTempRange(value)
    setIsOpen(false)
  }

  const handleQuickSelect = (days: number): void => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    
    const newRange = { from, to }
    setTempRange(newRange)
    onChange(newRange)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={(): void => setIsOpen(!isOpen)}
        className="w-full justify-start text-left font-normal"
      >
        <Calendar className="mr-2 h-4 w-4" />
        {value.from && value.to ? (
          <>
            {format(value.from, 'MMM dd, yyyy')} - {format(value.to, 'MMM dd, yyyy')}
          </>
        ) : (
          <span>{placeholder || 'Pick a date range'}</span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 w-80">
          <div className="space-y-4">
            {/* Quick selections */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Quick Select</label>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={(): void => handleQuickSelect(7)}>
                  Last 7 days
                </Button>
                <Button size="sm" variant="outline" onClick={(): void => handleQuickSelect(30)}>
                  Last 30 days
                </Button>
                <Button size="sm" variant="outline" onClick={(): void => handleQuickSelect(90)}>
                  Last 90 days
                </Button>
                <Button size="sm" variant="outline" onClick={(): void => handleQuickSelect(365)}>
                  Last year
                </Button>
              </div>
            </div>

            {/* Custom date inputs */}
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-gray-700">From Date</label>
                <Input
                  type="date"
                  value={format(tempRange.from, 'yyyy-MM-dd')}
                  onChange={(e): void => setTempRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">To Date</label>
                <Input
                  type="date"
                  value={format(tempRange.to, 'yyyy-MM-dd')}
                  onChange={(e): void => setTempRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface DatePickerProps {
  value: Date
  onChange: (date: Date) => void
  className?: string
  placeholder?: string
}

export function DatePicker({ value, onChange, className, placeholder }: DatePickerProps): React.JSX.Element {
  return (
    <div className={className}>
      <Input
        type="date"
        value={format(value, 'yyyy-MM-dd')}
        onChange={(e): void => onChange(new Date(e.target.value))}
        placeholder={placeholder}
      />
    </div>
  )
}