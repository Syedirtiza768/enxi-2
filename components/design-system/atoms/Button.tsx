'use client'

import React, { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium
      transition-all duration-[var(--transition-normal)]
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-[0.98]
    `

    const variants = {
      primary: `
        bg-[var(--color-brand-primary-600)] text-white
        hover:bg-[var(--color-brand-primary-700)]
        focus-visible:ring-[var(--color-brand-primary-500)]
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-[var(--color-brand-secondary-600)] text-white
        hover:bg-[var(--color-brand-secondary-700)]
        focus-visible:ring-[var(--color-brand-secondary-500)]
        shadow-sm hover:shadow-md
      `,
      outline: `
        border border-[var(--border-primary)] bg-transparent
        text-[var(--text-primary)]
        hover:bg-[var(--bg-secondary)]
        focus-visible:ring-[var(--color-brand-primary-500)]
      `,
      ghost: `
        bg-transparent text-[var(--text-primary)]
        hover:bg-[var(--bg-secondary)]
        focus-visible:ring-[var(--color-brand-primary-500)]
      `,
      danger: `
        bg-[var(--color-semantic-error-600)] text-white
        hover:bg-[var(--color-semantic-error-700)]
        focus-visible:ring-[var(--color-semantic-error-500)]
        shadow-sm hover:shadow-md
      `,
      success: `
        bg-[var(--color-semantic-success-600)] text-white
        hover:bg-[var(--color-semantic-success-700)]
        focus-visible:ring-[var(--color-semantic-success-500)]
        shadow-sm hover:shadow-md
      `
    }

    const sizes = {
      xs: 'h-8 px-2.5 text-xs rounded-[var(--radius-md)] min-h-[32px]',
      sm: 'h-10 px-3 text-sm rounded-[var(--radius-md)] min-h-[40px]',
      md: 'h-10 px-4 text-sm rounded-[var(--radius-lg)] min-h-[40px]',
      lg: 'h-12 px-6 text-base rounded-[var(--radius-lg)] min-h-[44px]',
      xl: 'h-14 px-8 text-lg rounded-[var(--radius-lg)] min-h-[48px]'
    }

    const iconSizes = {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
      xl: 'h-6 w-6'
    }

    const iconSpacing = {
      xs: 'gap-1.5',
      sm: 'gap-2',
      md: 'gap-2',
      lg: 'gap-2.5',
      xl: 'gap-3'
    }

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          iconSpacing[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
        )}
        {!loading && leftIcon && (
          <span className={iconSizes[size]}>{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className={iconSizes[size]}>{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }