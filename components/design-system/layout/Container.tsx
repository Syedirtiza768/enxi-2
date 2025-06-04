'use client'

import React, { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'fluid'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  center?: boolean
}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'xl', padding = 'md', center = true, children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'max-w-[640px]',
      md: 'max-w-[768px]',
      lg: 'max-w-[1024px]',
      xl: 'max-w-[1280px]',
      '2xl': 'max-w-[1400px]',
      full: 'max-w-full',
      fluid: 'max-w-none'
    }

    const paddingClasses = {
      none: '',
      sm: 'px-[var(--spacing-4)] sm:px-[var(--spacing-6)]',
      md: 'px-[var(--spacing-4)] sm:px-[var(--spacing-6)] lg:px-[var(--spacing-8)]',
      lg: 'px-[var(--spacing-6)] sm:px-[var(--spacing-8)] lg:px-[var(--spacing-12)]'
    }

    return (
      <div
        ref={ref}
        className={cn(
          'w-full',
          sizeClasses[size],
          paddingClasses[padding],
          center && 'mx-auto',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Container.displayName = 'Container'

export { Container }