'use client'

import React, { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Check, Minus } from 'lucide-react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  error?: string
  hint?: string
  checkboxSize?: 'sm' | 'md' | 'lg'
  indeterminate?: boolean
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      error,
      hint,
      checkboxSize = 'md',
      disabled,
      checked,
      indeterminate = false,
      id,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || React.useId()
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => inputRef.current!)

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate
      }
    }, [indeterminate])

    const sizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    }

    const iconSizes = {
      sm: 'h-3 w-3',
      md: 'h-3.5 w-3.5',
      lg: 'h-4 w-4'
    }

    const labelSizes = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg'
    }

    const baseStyles = `
      appearance-none relative
      bg-[var(--bg-primary)] 
      border-2 border-[var(--border-secondary)]
      rounded-[var(--radius-sm)]
      transition-all duration-[var(--transition-fast)]
      focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary-500)] focus:ring-offset-2
      hover:border-[var(--color-brand-primary-400)]
      checked:bg-[var(--color-brand-primary-600)] checked:border-[var(--color-brand-primary-600)]
      disabled:opacity-50 disabled:cursor-not-allowed
      cursor-pointer
    `

    const errorStyles = error
      ? 'border-[var(--color-semantic-error-500)] focus:ring-[var(--color-semantic-error-500)]'
      : ''

    return (
      <div className={cn('relative', className)}>
        <div className="flex items-start gap-3">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="checkbox"
              id={checkboxId}
              className={cn(
                baseStyles,
                sizes[checkboxSize],
                errorStyles,
                'peer'
              )}
              disabled={disabled}
              checked={checked}
              aria-invalid={!!error}
              aria-describedby={error ? `${checkboxId}-error` : hint ? `${checkboxId}-hint` : undefined}
              {...props}
            />
            <div className={cn(
              'absolute inset-0 flex items-center justify-center pointer-events-none',
              'text-white opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-100',
              'transition-opacity duration-[var(--transition-fast)]'
            )}>
              {indeterminate ? (
                <Minus className={iconSizes[checkboxSize]} strokeWidth={3} />
              ) : (
                <Check className={iconSizes[checkboxSize]} strokeWidth={3} />
              )}
            </div>
          </div>

          {label && (
            <label
              htmlFor={checkboxId}
              className={cn(
                'flex-1 cursor-pointer select-none',
                labelSizes[checkboxSize],
                'text-[var(--text-primary)]',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {label}
            </label>
          )}
        </div>

        {hint && !error && (
          <p id={`${checkboxId}-hint`} className="mt-1.5 ml-7 text-sm text-[var(--text-tertiary)]">
            {hint}
          </p>
        )}

        {error && (
          <p id={`${checkboxId}-error`} className="mt-1.5 ml-7 text-sm text-[var(--color-semantic-error-600)]">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }