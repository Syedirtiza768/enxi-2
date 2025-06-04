'use client'

import React, { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'horizontal' | 'vertical' | 'responsive'
  gap?: Gap
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
  reverse?: boolean
  divider?: boolean
  fullWidth?: boolean
  fullHeight?: boolean
}

const gapClasses = {
  none: 'gap-0',
  xs: 'gap-[var(--spacing-1)]',
  sm: 'gap-[var(--spacing-2)]',
  md: 'gap-[var(--spacing-4)]',
  lg: 'gap-[var(--spacing-6)]',
  xl: 'gap-[var(--spacing-8)]',
  '2xl': 'gap-[var(--spacing-12)]'
}

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline'
}

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      className,
      direction = 'vertical',
      gap = 'md',
      align = 'stretch',
      justify = 'start',
      wrap = false,
      reverse = false,
      divider = false,
      fullWidth = false,
      fullHeight = false,
      children,
      ...props
    },
    ref
  ) => {
    const directionClasses = {
      horizontal: reverse ? 'flex-row-reverse' : 'flex-row',
      vertical: reverse ? 'flex-col-reverse' : 'flex-col',
      responsive: reverse ? 'flex-col-reverse sm:flex-row-reverse' : 'flex-col sm:flex-row'
    }

    const getDividerStyles = () => {
      if (!divider) return ''
      
      switch (direction) {
        case 'horizontal':
          return '[&>*:not(:last-child)]:after:content-[""] [&>*:not(:last-child)]:after:absolute [&>*:not(:last-child)]:after:right-0 [&>*:not(:last-child)]:after:top-0 [&>*:not(:last-child)]:after:h-full [&>*:not(:last-child)]:after:w-px [&>*:not(:last-child)]:after:bg-[var(--border-primary)]'
        case 'vertical':
          return '[&>*:not(:last-child)]:after:content-[""] [&>*:not(:last-child)]:after:absolute [&>*:not(:last-child)]:after:bottom-0 [&>*:not(:last-child)]:after:left-0 [&>*:not(:last-child)]:after:w-full [&>*:not(:last-child)]:after:h-px [&>*:not(:last-child)]:after:bg-[var(--border-primary)]'
        case 'responsive':
          return '[&>*:not(:last-child)]:after:content-[""] [&>*:not(:last-child)]:after:absolute [&>*:not(:last-child)]:after:bottom-0 [&>*:not(:last-child)]:after:left-0 [&>*:not(:last-child)]:after:w-full [&>*:not(:last-child)]:after:h-px sm:[&>*:not(:last-child)]:after:bottom-auto sm:[&>*:not(:last-child)]:after:right-0 sm:[&>*:not(:last-child)]:after:top-0 sm:[&>*:not(:last-child)]:after:h-full sm:[&>*:not(:last-child)]:after:w-px [&>*:not(:last-child)]:after:bg-[var(--border-primary)]'
      }
    }

    // If using dividers, wrap children with relative positioning
    const wrappedChildren = divider
      ? React.Children.map(children, (child, index) => (
          <div key={index} className="relative">
            {child}
          </div>
        ))
      : children

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          directionClasses[direction],
          gapClasses[gap],
          alignClasses[align],
          justifyClasses[justify],
          wrap && 'flex-wrap',
          fullWidth && 'w-full',
          fullHeight && 'h-full',
          getDividerStyles(),
          className
        )}
        {...props}
      >
        {wrappedChildren}
      </div>
    )
  }
)

Stack.displayName = 'Stack'

// Convenience components
export const HStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack ref={ref} direction="horizontal" {...props} />
)

HStack.displayName = 'HStack'

export const VStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack ref={ref} direction="vertical" {...props} />
)

VStack.displayName = 'VStack'