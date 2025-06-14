'use client'

import React, { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  error?: string
  hint?: string
  radioSize?: 'sm' | 'md' | 'lg'
}

export interface RadioGroupProps {
  name: string
  value?: string
  onChange?: (value: string) => void
  options: Array<{
    value: string
    label: string
    hint?: string
    disabled?: boolean
  }>
  error?: string
  label?: string
  orientation?: 'horizontal' | 'vertical'
  radioSize?: 'sm' | 'md' | 'lg'
  required?: boolean
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      className,
      label,
      error,
      hint,
      radioSize = 'md',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const radioId = id || generatedId

    const sizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    }

    const dotSizes = {
      sm: 'h-1.5 w-1.5',
      md: 'h-2 w-2',
      lg: 'h-2.5 w-2.5'
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
      rounded-full
      transition-all duration-[var(--transition-fast)]
      focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary-500)] focus:ring-offset-2
      hover:border-[var(--color-brand-primary-400)]
      checked:border-[var(--color-brand-primary-600)]
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
              ref={ref}
              type="radio"
              id={radioId}
              className={cn(
                baseStyles,
                sizes[radioSize],
                errorStyles,
                'peer'
              )}
              disabled={disabled}
              aria-describedby={error ? `${radioId}-error` : hint ? `${radioId}-hint` : undefined}
              {...props}
            />
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center pointer-events-none'
              )}
            >
              <div
                className={cn(
                  'rounded-full bg-[var(--color-brand-primary-600)]',
                  'opacity-0 peer-checked:opacity-100',
                  'transition-opacity duration-[var(--transition-fast)]',
                  dotSizes[radioSize]
                )}
              />
            </div>
          </div>

          {label && (
            <label
              htmlFor={radioId}
              className={cn(
                'flex-1 cursor-pointer select-none',
                labelSizes[radioSize],
                'text-[var(--text-primary)]',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {label}
            </label>
          )}
        </div>

        {hint && !error && (
          <p id={`${radioId}-hint`} className="mt-1.5 ml-7 text-sm text-[var(--text-tertiary)]">
            {hint}
          </p>
        )}

        {error && (
          <p id={`${radioId}-error`} className="mt-1.5 ml-7 text-sm text-[var(--color-semantic-error-600)]">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Radio.displayName = 'Radio'

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  error,
  label,
  orientation = 'vertical',
  radioSize = 'md',
  required
}: RadioGroupProps): React.JSX.Element {
  const groupId = React.useId()

  return (
    <fieldset
      role="radiogroup"
      aria-labelledby={label ? `${groupId}-label` : undefined}
      aria-invalid={!!error}
      aria-describedby={error ? `${groupId}-error` : undefined}
      aria-required={required}
    >
      {label && (
        <legend
          id={`${groupId}-label`}
          className="block mb-2 text-sm font-medium text-[var(--text-secondary)]"
        >
          {label}
          {required && <span className="ml-1 text-[var(--color-semantic-error-500)]">*</span>}
        </legend>
      )}

      <div
        className={cn(
          'flex',
          orientation === 'vertical' ? 'flex-col gap-3' : 'flex-row gap-6'
        )}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e): void => onChange?.(e.target.value)}
            label={option.label}
            hint={option.hint}
            disabled={option.disabled}
            radioSize={radioSize}
          />
        ))}
      </div>

      {error && (
        <p id={`${groupId}-error`} className="mt-2 text-sm text-[var(--color-semantic-error-600)]">
          {error}
        </p>
      )}
    </fieldset>
  )
}

export { Radio }