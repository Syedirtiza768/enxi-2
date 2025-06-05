'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  id?: string
  name?: string
  value?: string
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      defaultChecked,
      onChange,
      onCheckedChange,
      disabled,
      label,
      size = 'md',
      className,
      id,
      name,
      value
    },
    ref
  ) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked || false)
    const generatedId = React.useId()
    const switchId = id || generatedId

    // Controlled vs uncontrolled
    const checkedState = checked !== undefined ? checked : isChecked

    const handleChange = () => {
      if (disabled) return

      const newChecked = !checkedState
      
      if (checked === undefined) {
        setIsChecked(newChecked)
      }
      
      onChange?.(newChecked)
      onCheckedChange?.(newChecked)
    }

    const sizes = {
      sm: {
        track: 'h-5 w-9',
        thumb: 'h-4 w-4',
        translate: 'translate-x-4',
        label: 'text-sm'
      },
      md: {
        track: 'h-6 w-11',
        thumb: 'h-5 w-5',
        translate: 'translate-x-5',
        label: 'text-base'
      },
      lg: {
        track: 'h-7 w-14',
        thumb: 'h-6 w-6',
        translate: 'translate-x-7',
        label: 'text-lg'
      }
    }

    const trackStyles = cn(
      'relative inline-flex shrink-0 cursor-pointer items-center rounded-full',
      'border-2 border-transparent transition-colors duration-200 ease-in-out',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary-500)] focus-visible:ring-offset-2',
      checkedState 
        ? 'bg-[var(--color-brand-primary-600)]' 
        : 'bg-[var(--bg-tertiary)]',
      disabled && 'opacity-50 cursor-not-allowed',
      sizes[size].track
    )

    const thumbStyles = cn(
      'pointer-events-none inline-block rounded-full bg-white shadow-lg ring-0',
      'transition-transform duration-200 ease-in-out',
      checkedState ? sizes[size].translate : 'translate-x-0',
      sizes[size].thumb
    )

    return (
      <div className={cn('flex items-center gap-3', className)}>
        <button
          ref={ref}
          type="button"
          role="switch"
          id={switchId}
          aria-checked={checkedState}
          aria-labelledby={label ? `${switchId}-label` : undefined}
          data-state={checkedState ? 'checked' : 'unchecked'}
          disabled={disabled}
          className={trackStyles}
          onClick={handleChange}
        >
          <span className={thumbStyles} />
        </button>
        
        {label && (
          <label
            id={`${switchId}-label`}
            htmlFor={switchId}
            className={cn(
              'cursor-pointer select-none',
              sizes[size].label,
              'text-[var(--text-primary)]',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={handleChange}
          >
            {label}
          </label>
        )}

        {/* Hidden input for form submission */}
        {name && (
          <input
            type="checkbox"
            name={name}
            value={value || 'on'}
            checked={checkedState}
            onChange={() => {}}
            className="sr-only"
            aria-hidden="true"
          />
        )}
      </div>
    )
  }
)

Switch.displayName = 'Switch'

export { Switch }