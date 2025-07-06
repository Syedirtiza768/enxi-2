'use client'

import React, { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Columns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
type Span = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full'
type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: Columns | { xs?: Columns; sm?: Columns; md?: Columns; lg?: Columns; xl?: Columns; '2xl'?: Columns }
  gap?: Gap | { x?: Gap; y?: Gap }
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
}

export interface GridItemProps extends HTMLAttributes<HTMLDivElement> {
  span?: Span | { xs?: Span; sm?: Span; md?: Span; lg?: Span; xl?: Span; '2xl'?: Span }
  start?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number; '2xl'?: number }
  align?: 'start' | 'center' | 'end' | 'stretch'
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

const gapXClasses = {
  none: 'gap-x-0',
  xs: 'gap-x-[var(--spacing-1)]',
  sm: 'gap-x-[var(--spacing-2)]',
  md: 'gap-x-[var(--spacing-4)]',
  lg: 'gap-x-[var(--spacing-6)]',
  xl: 'gap-x-[var(--spacing-8)]',
  '2xl': 'gap-x-[var(--spacing-12)]'
}

const gapYClasses = {
  none: 'gap-y-0',
  xs: 'gap-y-[var(--spacing-1)]',
  sm: 'gap-y-[var(--spacing-2)]',
  md: 'gap-y-[var(--spacing-4)]',
  lg: 'gap-y-[var(--spacing-6)]',
  xl: 'gap-y-[var(--spacing-8)]',
  '2xl': 'gap-y-[var(--spacing-12)]'
}

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch'
}

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 12, gap = 'md', align = 'stretch', justify = 'start', children, ...props }, ref) => {
    const getColsClass = (): string => {
      if (typeof cols === 'number') {
        return `grid-cols-${cols}`
      }

      const classes: string[] = []
      if (cols.xs) classes.push(`grid-cols-${cols.xs}`)
      if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`)
      if (cols.md) classes.push(`md:grid-cols-${cols.md}`)
      if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`)
      if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`)
      if (cols['2xl']) classes.push(`2xl:grid-cols-${cols['2xl']}`)
      
      return classes.join(' ')
    }

    const getGapClass = (): string => {
      if (typeof gap === 'string') {
        return gapClasses[gap]
      }

      const classes: string[] = []
      if (gap.x) classes.push(gapXClasses[gap.x])
      if (gap.y) classes.push(gapYClasses[gap.y])
      
      return classes.join(' ')
    }

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          getColsClass(),
          getGapClass(),
          alignClasses[align],
          justifyClasses[justify],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Grid.displayName = 'Grid'

export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(
  ({ className, span = 1, start, align = 'stretch', children, ...props }, ref) => {
    const getSpanClass = (): string => {
      if (typeof span === 'number' || span === 'full') {
        return span === 'full' ? 'col-span-full' : `col-span-${span}`
      }

      const classes: string[] = []
      if (span.xs) classes.push(span.xs === 'full' ? 'col-span-full' : `col-span-${span.xs}`)
      if (span.sm) classes.push(span.sm === 'full' ? 'sm:col-span-full' : `sm:col-span-${span.sm}`)
      if (span.md) classes.push(span.md === 'full' ? 'md:col-span-full' : `md:col-span-${span.md}`)
      if (span.lg) classes.push(span.lg === 'full' ? 'lg:col-span-full' : `lg:col-span-${span.lg}`)
      if (span.xl) classes.push(span.xl === 'full' ? 'xl:col-span-full' : `xl:col-span-${span.xl}`)
      if (span['2xl']) classes.push(span['2xl'] === 'full' ? '2xl:col-span-full' : `2xl:col-span-${span['2xl']}`)
      
      return classes.join(' ')
    }

    const getStartClass = (): string => {
      if (!start) return ''
      
      if (typeof start === 'number') {
        return `col-start-${start}`
      }

      const classes: string[] = []
      if (start.xs) classes.push(`col-start-${start.xs}`)
      if (start.sm) classes.push(`sm:col-start-${start.sm}`)
      if (start.md) classes.push(`md:col-start-${start.md}`)
      if (start.lg) classes.push(`lg:col-start-${start.lg}`)
      if (start.xl) classes.push(`xl:col-start-${start.xl}`)
      if (start['2xl']) classes.push(`2xl:col-start-${start['2xl']}`)
      
      return classes.join(' ')
    }

    return (
      <div
        ref={ref}
        className={cn(
          getSpanClass(),
          getStartClass(),
          align !== 'stretch' && `self-${align}`,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

GridItem.displayName = 'GridItem'