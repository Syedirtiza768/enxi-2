'use client'

import React, { forwardRef, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  showCount?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      hint,
      fullWidth = false,
      resize = 'vertical',
      showCount = false,
      disabled,
      required,
      maxLength,
      id,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const textareaId = id || generatedId
    const [charCount, setCharCount] = React.useState(0)

    React.useEffect(() => {
      const initialValue = value || defaultValue || ''
      setCharCount(String(initialValue).length)
    }, [value, defaultValue])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setCharCount(e.target.value.length)
      onChange?.(e)
    }

    const baseStyles = `
      w-full min-h-[100px] px-4 py-3
      bg-[var(--bg-primary)] text-[var(--text-primary)]
      border border-[var(--border-primary)]
      rounded-[var(--radius-lg)]
      transition-all duration-[var(--transition-fast)]
      placeholder:text-[var(--text-muted)]
      focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary-500)] focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const resizeStyles = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize'
    }

    const errorStyles = error
      ? 'border-[var(--color-semantic-error-500)] focus:ring-[var(--color-semantic-error-500)]'
      : ''

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block mb-1.5 text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
            {required && <span className="ml-1 text-[var(--color-semantic-error-500)]">*</span>}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            baseStyles,
            resizeStyles[resize],
            errorStyles,
            className
          )}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />

        <div className="mt-1.5 flex items-start justify-between gap-2">
          <div className="flex-1">
            {hint && !error && (
              <p id={`${textareaId}-hint`} className="text-sm text-[var(--text-tertiary)]">
                {hint}
              </p>
            )}

            {error && (
              <div id={`${textareaId}-error`} className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-[var(--color-semantic-error-500)]" />
                <p className="text-sm text-[var(--color-semantic-error-600)]">{error}</p>
              </div>
            )}
          </div>

          {showCount && maxLength && (
            <span
              className={cn(
                'text-xs tabular-nums',
                charCount > maxLength
                  ? 'text-[var(--color-semantic-error-600)]'
                  : 'text-[var(--text-muted)]'
              )}
              aria-live="polite"
              aria-atomic="true"
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }