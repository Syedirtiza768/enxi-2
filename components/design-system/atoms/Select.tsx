'use client'

import React, { forwardRef, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, AlertCircle } from 'lucide-react'

// Use the consolidated SelectOption from the central types
import type { SelectOption } from '@/lib/types/ui.types'

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
  fullWidth?: boolean
  selectSize?: 'sm' | 'md' | 'lg'
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      options,
      placeholder = 'Select an option',
      fullWidth = false,
      selectSize = 'md',
      disabled,
      required,
      id,
      value,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const selectId = id || generatedId

    const baseStyles = `
      w-full appearance-none
      bg-[var(--bg-primary)] text-[var(--text-primary)]
      border border-[var(--border-primary)]
      transition-all duration-[var(--transition-fast)]
      focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary-500)] focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed
      cursor-pointer
    `

    const sizeStyles = {
      sm: 'h-9 pl-3 pr-10 text-sm rounded-[var(--radius-md)]',
      md: 'h-10 pl-4 pr-11 text-base rounded-[var(--radius-lg)]',
      lg: 'h-12 pl-5 pr-12 text-lg rounded-[var(--radius-lg)]'
    }

    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    }

    const iconPositions = {
      sm: 'right-3',
      md: 'right-4',
      lg: 'right-5'
    }

    const errorStyles = error
      ? 'border-[var(--color-semantic-error-500)] focus:ring-[var(--color-semantic-error-500)]'
      : ''

    const showPlaceholder = !value || value === ''

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={selectId}
            className="block mb-1.5 text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
            {required && <span className="ml-1 text-[var(--color-semantic-error-500)]">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              baseStyles,
              sizeStyles[selectSize],
              errorStyles,
              showPlaceholder && 'text-[var(--text-muted)]',
              className
            )}
            disabled={disabled}
            required={required}
            value={value}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            {...props}
          >
            <option value="" disabled hidden>
              {placeholder}
            </option>
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          <div className={cn(
            'absolute top-1/2 -translate-y-1/2 pointer-events-none',
            'text-[var(--text-tertiary)]',
            iconSizes[selectSize],
            iconPositions[selectSize]
          )}>
            <ChevronDown />
          </div>
        </div>

        {hint && !error && (
          <p id={`${selectId}-hint`} className="mt-1.5 text-sm text-[var(--text-tertiary)]">
            {hint}
          </p>
        )}

        {error && (
          <div id={`${selectId}-error`} className="mt-1.5 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-[var(--color-semantic-error-500)]" />
            <p className="text-sm text-[var(--color-semantic-error-600)]">{error}</p>
          </div>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }