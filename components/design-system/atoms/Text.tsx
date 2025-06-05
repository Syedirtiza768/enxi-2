'use client'

import React, { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type TextElement = 'p' | 'span' | 'div' | 'label'
type HeadingElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

interface BaseTextProps extends HTMLAttributes<HTMLElement> {
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
  weight?: 'thin' | 'extralight' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black'
  color?: 'primary' | 'secondary' | 'tertiary' | 'muted' | 'brand' | 'success' | 'warning' | 'error' | 'info'
  align?: 'left' | 'center' | 'right' | 'justify'
  truncate?: boolean
  italic?: boolean
}

export interface TextProps extends BaseTextProps {
  as?: TextElement
}

export interface HeadingProps extends BaseTextProps {
  as?: HeadingElement
}

const sizeClasses = {
  xs: 'text-[length:var(--font-size-xs)] leading-[var(--line-height-xs)] tracking-[var(--letter-spacing-xs)]',
  sm: 'text-[length:var(--font-size-sm)] leading-[var(--line-height-sm)] tracking-[var(--letter-spacing-sm)]',
  base: 'text-[length:var(--font-size-base)] leading-[var(--line-height-base)] tracking-[var(--letter-spacing-base)]',
  lg: 'text-[length:var(--font-size-lg)] leading-[var(--line-height-lg)] tracking-[var(--letter-spacing-lg)]',
  xl: 'text-[length:var(--font-size-xl)] leading-[var(--line-height-xl)] tracking-[var(--letter-spacing-xl)]'
}

const headingSizeClasses: Record<HeadingElement, string> = {
  h1: 'text-[length:var(--font-size-4xl)] leading-[var(--line-height-4xl)] tracking-[var(--letter-spacing-4xl)] font-bold',
  h2: 'text-[length:var(--font-size-3xl)] leading-[var(--line-height-3xl)] tracking-[var(--letter-spacing-3xl)] font-semibold',
  h3: 'text-[length:var(--font-size-2xl)] leading-[var(--line-height-2xl)] tracking-[var(--letter-spacing-2xl)] font-semibold',
  h4: 'text-[length:var(--font-size-xl)] leading-[var(--line-height-xl)] tracking-[var(--letter-spacing-xl)] font-medium',
  h5: 'text-[length:var(--font-size-lg)] leading-[var(--line-height-lg)] tracking-[var(--letter-spacing-lg)] font-medium',
  h6: 'text-[length:var(--font-size-base)] leading-[var(--line-height-base)] tracking-[var(--letter-spacing-base)] font-medium'
}

const weightClasses = {
  thin: 'font-[var(--font-weight-thin)]',
  extralight: 'font-[var(--font-weight-extralight)]',
  light: 'font-[var(--font-weight-light)]',
  normal: 'font-[var(--font-weight-normal)]',
  medium: 'font-[var(--font-weight-medium)]',
  semibold: 'font-[var(--font-weight-semibold)]',
  bold: 'font-[var(--font-weight-bold)]',
  extrabold: 'font-[var(--font-weight-extrabold)]',
  black: 'font-[var(--font-weight-black)]'
}

const colorClasses = {
  primary: 'text-[var(--text-primary)]',
  secondary: 'text-[var(--text-secondary)]',
  tertiary: 'text-[var(--text-tertiary)]',
  muted: 'text-[var(--text-muted)]',
  brand: 'text-[var(--color-brand-primary-600)]',
  success: 'text-[var(--color-semantic-success-600)]',
  warning: 'text-[var(--color-semantic-warning-600)]',
  error: 'text-[var(--color-semantic-error-600)]',
  info: 'text-[var(--color-semantic-info-600)]'
}

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify'
}

export const Text = forwardRef<HTMLElement, TextProps>(
  (
    {
      as: Component = 'p',
      size,
      weight,
      color = 'primary',
      align,
      truncate,
      italic,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref as React.Ref<HTMLElement>}
        className={cn(
          size && sizeClasses[size],
          weight && weightClasses[weight],
          colorClasses[color],
          align && alignClasses[align],
          truncate && 'truncate',
          italic && 'italic',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Text.displayName = 'Text'

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  (
    {
      as: Component = 'h2',
      size,
      weight,
      color = 'primary',
      align,
      truncate,
      italic,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          headingSizeClasses[Component],
          size && sizeClasses[size], // Allow size override
          weight && weightClasses[weight], // Allow weight override
          colorClasses[color],
          align && alignClasses[align],
          truncate && 'truncate',
          italic && 'italic',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Heading.displayName = 'Heading'