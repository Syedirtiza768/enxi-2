'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/lib/hooks/use-responsive'

interface ResponsiveFormProps {
  children: React.ReactNode
  className?: string
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  mobileColumns?: 1 | 2
}

export function ResponsiveForm({ 
  children, 
  className,
  columns = 2,
  gap = 'md',
  mobileColumns = 1
}: ResponsiveFormProps) {
  const isMobile = useIsMobile()
  const currentColumns = isMobile ? mobileColumns : columns

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  }

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={cn(
      'grid',
      columnClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveFormGroupProps {
  children: React.ReactNode
  className?: string
  span?: 1 | 2 | 3 | 4 | 'full'
  mobileSpan?: 1 | 2 | 'full'
}

export function ResponsiveFormGroup({ 
  children, 
  className,
  span = 1,
  mobileSpan = 'full'
}: ResponsiveFormGroupProps) {
  const isMobile = useIsMobile()
  const currentSpan = isMobile ? mobileSpan : span

  const getSpanClass = (spanValue: number | 'full') => {
    if (spanValue === 'full') return 'col-span-full'
    return `col-span-${spanValue}`
  }

  return (
    <div className={cn(
      getSpanClass(currentSpan),
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveFormActionsProps {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
  stack?: boolean
  mobileStack?: boolean
}

export function ResponsiveFormActions({ 
  children, 
  className,
  align = 'right',
  stack = false,
  mobileStack = true
}: ResponsiveFormActionsProps) {
  const isMobile = useIsMobile()
  const shouldStack = isMobile ? mobileStack : stack

  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  }

  return (
    <div className={cn(
      'flex gap-3',
      shouldStack ? 'flex-col' : 'flex-row',
      !shouldStack && alignClasses[align],
      shouldStack && 'items-stretch',
      'col-span-full mt-6',
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveFieldsetProps {
  children: React.ReactNode
  legend?: string
  className?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
}

export function ResponsiveFieldset({ 
  children, 
  legend,
  className,
  collapsible = false,
  defaultCollapsed = false
}: ResponsiveFieldsetProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  return (
    <fieldset className={cn(
      'border border-border rounded-lg p-4 space-y-4 col-span-full',
      className
    )}>
      {legend && (
        <legend className={cn(
          'px-2 text-sm font-medium text-foreground',
          collapsible && 'cursor-pointer flex items-center gap-2'
        )} onClick={() => collapsible && setIsCollapsed(!isCollapsed)}>
          {legend}
          {collapsible && (
            <span className="text-xs text-muted-foreground">
              {isCollapsed ? '(Click to expand)' : '(Click to collapse)'}
            </span>
          )}
        </legend>
      )}
      {(!collapsible || !isCollapsed) && children}
    </fieldset>
  )
}

interface ResponsiveFormSectionProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function ResponsiveFormSection({ 
  children, 
  title,
  description,
  className
}: ResponsiveFormSectionProps) {
  return (
    <div className={cn('space-y-4 col-span-full', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <ResponsiveForm>
        {children}
      </ResponsiveForm>
    </div>
  )
}

export default {
  ResponsiveForm,
  ResponsiveFormGroup,
  ResponsiveFormActions,
  ResponsiveFieldset,
  ResponsiveFormSection
}