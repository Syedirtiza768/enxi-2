'use client'

import React, { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'filled'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  hoverable?: boolean
  clickable?: boolean
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode
  border?: boolean
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  border?: boolean
  align?: 'left' | 'center' | 'right' | 'between'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      rounded = 'lg',
      hoverable = false,
      clickable = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'relative transition-all duration-[var(--transition-normal)]'

    const variants = {
      default: 'bg-[var(--bg-primary)] border border-[var(--border-primary)]',
      outlined: 'bg-transparent border-2 border-[var(--border-secondary)]',
      elevated: 'bg-[var(--bg-elevated)] shadow-[var(--shadow-md)]',
      filled: 'bg-[var(--bg-secondary)]'
    }

    const paddingStyles = {
      none: '',
      sm: 'p-[var(--spacing-3)]',
      md: 'p-[var(--spacing-4)]',
      lg: 'p-[var(--spacing-6)]',
      xl: 'p-[var(--spacing-8)]'
    }

    const roundedStyles = {
      none: 'rounded-none',
      sm: 'rounded-[var(--radius-sm)]',
      md: 'rounded-[var(--radius-md)]',
      lg: 'rounded-[var(--radius-lg)]',
      xl: 'rounded-[var(--radius-xl)]',
      '2xl': 'rounded-[var(--radius-2xl)]',
      '3xl': 'rounded-[var(--radius-3xl)]'
    }

    const interactiveStyles = cn(
      hoverable && 'hover:shadow-[var(--shadow-lg)] hover:scale-[1.01]',
      clickable && 'cursor-pointer active:scale-[0.99]'
    )

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddingStyles[padding],
          roundedStyles[rounded],
          interactiveStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, action, border = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between',
          border && 'pb-[var(--spacing-4)] mb-[var(--spacing-4)] border-b border-[var(--border-primary)]',
          className
        )}
        {...props}
      >
        <div className="flex-1">{children}</div>
        {action && <div className="ml-[var(--spacing-4)]">{action}</div>}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex-1', className)}
        {...props}
      />
    )
  }
)

CardContent.displayName = 'CardContent'

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, border = false, align = 'right', children, ...props }, ref) => {
    const alignmentStyles = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      between: 'justify-between'
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-[var(--spacing-3)]',
          alignmentStyles[align],
          border && 'pt-[var(--spacing-4)] mt-[var(--spacing-4)] border-t border-[var(--border-primary)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardContent, CardFooter }