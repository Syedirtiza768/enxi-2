'use client'

import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  inputSize?: 'sm' | 'md' | 'lg'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      fullWidth = false,
      inputSize = 'md',
      disabled,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const generatedId = React.useId()
    const inputId = id || generatedId
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    const baseStyles = `
      w-full bg-[var(--bg-primary)] text-[var(--text-primary)]
      border border-[var(--border-primary)]
      transition-all duration-[var(--transition-fast)]
      placeholder:text-[var(--text-muted)]
      focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary-500)] focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const sizeStyles = {
      sm: 'h-9 px-3 text-sm rounded-[var(--radius-md)]',
      md: 'h-10 px-4 text-base rounded-[var(--radius-lg)]',
      lg: 'h-12 px-5 text-lg rounded-[var(--radius-lg)]'
    }

    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    }

    const errorStyles = error
      ? 'border-[var(--color-semantic-error-500)] focus:ring-[var(--color-semantic-error-500)]'
      : ''

    const paddingWithIcon = {
      left: {
        sm: 'pl-9',
        md: 'pl-11',
        lg: 'pl-13'
      },
      right: {
        sm: 'pr-9',
        md: 'pr-11',
        lg: 'pr-13'
      }
    }

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block mb-1.5 text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
            {required && <span className="ml-1 text-[var(--color-semantic-error-500)]">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]',
              iconSizes[inputSize]
            )}>
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              baseStyles,
              sizeStyles[inputSize],
              errorStyles,
              leftIcon && paddingWithIcon.left[inputSize],
              (rightIcon || isPassword) && paddingWithIcon.right[inputSize],
              className
            )}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />

          {(rightIcon || isPassword) && (
            <div className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]',
              iconSizes[inputSize]
            )}>
              {isPassword ? (
                <button
                  type="button"
                  onClick={(): void => setShowPassword(!showPassword)}
                  className="hover:text-[var(--text-secondary)] transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>

        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-[var(--text-tertiary)]">
            {hint}
          </p>
        )}

        {error && (
          <div id={`${inputId}-error`} className="mt-1.5 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-[var(--color-semantic-error-500)]" />
            <p className="text-sm text-[var(--color-semantic-error-600)]">{error}</p>
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }