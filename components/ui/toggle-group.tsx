'use client'

import * as React from 'react'
import * as TogglePrimitive from '@radix-ui/react-toggle-group'
import { cn } from '@/lib/utils'

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>
>(({ className, type = 'single', ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    type={type}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500',
      className
    )}
    {...props}
  />
))
ToggleGroup.displayName = TogglePrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Item>
>(({ className, ...props }, ref) => (
  <TogglePrimitive.Item
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-white data-[state=on]:text-gray-900 data-[state=on]:shadow-sm',
      className
    )}
    {...props}
  />
))
ToggleGroupItem.displayName = TogglePrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }