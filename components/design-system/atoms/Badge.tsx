'use client'

import React, { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  dot?: boolean
  outline?: boolean
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'sm',
      rounded = 'md',
      dot = false,
      outline = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium
      transition-all duration-[var(--transition-fast)]
    `

    const solidVariants = {
      default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
      primary: 'bg-[var(--color-brand-primary-100)] text-[var(--color-brand-primary-700)] dark:bg-[var(--color-brand-primary-900)] dark:text-[var(--color-brand-primary-200)]',
      secondary: 'bg-[var(--color-brand-secondary-100)] text-[var(--color-brand-secondary-700)] dark:bg-[var(--color-brand-secondary-900)] dark:text-[var(--color-brand-secondary-200)]',
      success: 'bg-[var(--color-semantic-success-100)] text-[var(--color-semantic-success-700)] dark:bg-[var(--color-semantic-success-900)] dark:text-[var(--color-semantic-success-200)]',
      warning: 'bg-[var(--color-semantic-warning-100)] text-[var(--color-semantic-warning-700)] dark:bg-[var(--color-semantic-warning-900)] dark:text-[var(--color-semantic-warning-200)]',
      error: 'bg-[var(--color-semantic-error-100)] text-[var(--color-semantic-error-700)] dark:bg-[var(--color-semantic-error-900)] dark:text-[var(--color-semantic-error-200)]',
      info: 'bg-[var(--color-semantic-info-100)] text-[var(--color-semantic-info-700)] dark:bg-[var(--color-semantic-info-900)] dark:text-[var(--color-semantic-info-200)]'
    }

    const outlineVariants = {
      default: 'border border-[var(--border-primary)] text-[var(--text-secondary)]',
      primary: 'border border-[var(--color-brand-primary-300)] text-[var(--color-brand-primary-600)] dark:border-[var(--color-brand-primary-700)] dark:text-[var(--color-brand-primary-400)]',
      secondary: 'border border-[var(--color-brand-secondary-300)] text-[var(--color-brand-secondary-600)] dark:border-[var(--color-brand-secondary-700)] dark:text-[var(--color-brand-secondary-400)]',
      success: 'border border-[var(--color-semantic-success-300)] text-[var(--color-semantic-success-600)] dark:border-[var(--color-semantic-success-700)] dark:text-[var(--color-semantic-success-400)]',
      warning: 'border border-[var(--color-semantic-warning-300)] text-[var(--color-semantic-warning-600)] dark:border-[var(--color-semantic-warning-700)] dark:text-[var(--color-semantic-warning-400)]',
      error: 'border border-[var(--color-semantic-error-300)] text-[var(--color-semantic-error-600)] dark:border-[var(--color-semantic-error-700)] dark:text-[var(--color-semantic-error-400)]',
      info: 'border border-[var(--color-semantic-info-300)] text-[var(--color-semantic-info-600)] dark:border-[var(--color-semantic-info-700)] dark:text-[var(--color-semantic-info-400)]'
    }

    const sizes = {
      xs: 'h-5 px-1.5 text-[10px] gap-1',
      sm: 'h-6 px-2 text-xs gap-1',
      md: 'h-7 px-2.5 text-sm gap-1.5',
      lg: 'h-8 px-3 text-base gap-2'
    }

    const dotSizes = {
      xs: 'h-1.5 w-1.5',
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3'
    }

    const roundedStyles = {
      sm: 'rounded-[var(--radius-sm)]',
      md: 'rounded-[var(--radius-md)]',
      lg: 'rounded-[var(--radius-lg)]',
      full: 'rounded-full'
    }

    const dotColors = {
      default: 'bg-[var(--text-tertiary)]',
      primary: 'bg-[var(--color-brand-primary-500)]',
      secondary: 'bg-[var(--color-brand-secondary-500)]',
      success: 'bg-[var(--color-semantic-success-500)]',
      warning: 'bg-[var(--color-semantic-warning-500)]',
      error: 'bg-[var(--color-semantic-error-500)]',
      info: 'bg-[var(--color-semantic-info-500)]'
    }

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          outline ? outlineVariants[variant] : solidVariants[variant],
          sizes[size],
          roundedStyles[rounded],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'rounded-full animate-pulse',
              dotSizes[size],
              dotColors[variant]
            )}
          />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }