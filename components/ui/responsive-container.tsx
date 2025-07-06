'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  mobilePadding?: 'none' | 'sm' | 'md' | 'lg'
  center?: boolean
}

export function ResponsiveContainer({
  children,
  className,
  size = 'lg',
  padding = 'md',
  mobilePadding = 'sm',
  center = true
}: ResponsiveContainerProps) {
  const sizeClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-8xl',
    full: 'max-w-full'
  }

  const paddingClasses = {
    none: '',
    sm: 'px-2 sm:px-4',
    md: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-6 sm:px-8 lg:px-12'
  }

  const mobilePaddingClasses = {
    none: '',
    sm: 'px-3',
    md: 'px-4',
    lg: 'px-6'
  }

  return (
    <div className={cn(
      'w-full',
      sizeClasses[size],
      paddingClasses[padding],
      `mobile:${mobilePaddingClasses[mobilePadding]}`,
      center && 'mx-auto',
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  cols?: 1 | 2 | 3 | 4 | 6 | 12
  mobileCols?: 1 | 2
  tabletCols?: 1 | 2 | 3 | 4
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  mobileGap?: 'none' | 'sm' | 'md' | 'lg'
}

export function ResponsiveGrid({
  children,
  className,
  cols = 2,
  mobileCols = 1,
  tabletCols = 2,
  gap = 'md',
  mobileGap = 'sm'
}: ResponsiveGridProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    6: 'lg:grid-cols-6',
    12: 'lg:grid-cols-12'
  }

  const mobileColClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2'
  }

  const tabletColClasses = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
  }

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2 lg:gap-3',
    md: 'gap-3 lg:gap-4',
    lg: 'gap-4 lg:gap-6',
    xl: 'gap-6 lg:gap-8'
  }

  const mobileGapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  }

  return (
    <div className={cn(
      'grid',
      mobileColClasses[mobileCols],
      tabletColClasses[tabletCols],
      colClasses[cols],
      gapClasses[gap],
      `mobile:${mobileGapClasses[mobileGap]}`,
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveStackProps {
  children: React.ReactNode
  className?: string
  direction?: 'vertical' | 'horizontal'
  mobileDirection?: 'vertical' | 'horizontal'
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  mobileGap?: 'none' | 'sm' | 'md' | 'lg'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
}

export function ResponsiveStack({
  children,
  className,
  direction = 'vertical',
  mobileDirection = 'vertical',
  gap = 'md',
  mobileGap = 'sm',
  align = 'stretch',
  justify = 'start'
}: ResponsiveStackProps) {
  const directionClasses = {
    vertical: 'flex-col',
    horizontal: 'flex-row'
  }

  const mobileDirectionClasses = {
    vertical: 'flex-col',
    horizontal: 'flex-row'
  }

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2 lg:gap-3',
    md: 'gap-3 lg:gap-4',
    lg: 'gap-4 lg:gap-6',
    xl: 'gap-6 lg:gap-8'
  }

  const mobileGapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
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

  return (
    <div className={cn(
      'flex',
      `mobile:${mobileDirectionClasses[mobileDirection]}`,
      `lg:${directionClasses[direction]}`,
      gapClasses[gap],
      `mobile:${mobileGapClasses[mobileGap]}`,
      alignClasses[align],
      justifyClasses[justify],
      className
    )}>
      {children}
    </div>
  )
}

export default {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack
}