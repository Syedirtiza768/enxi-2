'use client'

import React from 'react'
import { Container } from './Container'
import { VStack } from './Stack'
import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  maxWidth?: string
  centered?: boolean
}

export function PageLayout({ 
  children, 
  className,
  containerSize = 'lg',
  maxWidth = 'max-w-6xl',
  centered = true
}: PageLayoutProps) {
  return (
    <div className="w-full min-h-full flex flex-col">
      <Container size={containerSize} padding="lg" className="mx-auto">
        <div className={cn(
          'w-full',
          centered && 'flex flex-col items-center justify-center'
        )}>
          <div className={cn(
            'w-full',
            maxWidth,
            className
          )}>
            {children}
          </div>
        </div>
      </Container>
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  centered?: boolean
}

export function PageHeader({ title, description, actions, centered = true }: PageHeaderProps) {
  return (
    <div className={cn(
      'w-full',
      centered ? 'text-center' : 'text-left'
    )}>
      <VStack gap="sm" align={centered ? "center" : "start"}>
        <div className={cn(
          'flex items-center',
          centered ? 'justify-center' : 'justify-between',
          'w-full'
        )}>
          <h1 className="text-3xl font-bold">{title}</h1>
          {actions && !centered && <div>{actions}</div>}
        </div>
        {description && (
          <p className="text-lg text-[var(--text-secondary)]">
            {description}
          </p>
        )}
        {actions && centered && <div>{actions}</div>}
      </VStack>
    </div>
  )
}

interface PageSectionProps {
  children: React.ReactNode
  className?: string
}

export function PageSection({ children, className }: PageSectionProps) {
  return (
    <div className={cn('w-full', className)}>
      {children}
    </div>
  )
}