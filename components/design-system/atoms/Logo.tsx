'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'stretch'
  className?: string
  priority?: boolean
}

const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ size = 'md', className, priority = false }, ref) => {
    const sizeConfig = {
      sm: { height: 48, width: 180, class: 'h-12 w-auto' },
      md: { height: 64, width: 240, class: 'h-16 w-auto' },
      lg: { height: 80, width: 300, class: 'h-20 w-auto' },
      xl: { height: 128, width: 480, class: 'h-32 w-auto' },
      stretch: { height: 96, width: 360, class: 'w-full h-full' }
    }

    const config = sizeConfig[size]

    return (
      <div ref={ref} className={cn(
        'logo-container flex items-center justify-center', 
        size === 'stretch' ? 'w-full h-full' : '', 
        className
      )}>
        <Image
          src="/logo.svg"
          alt="EnXi ERP"
          width={config.width}
          height={config.height}
          className={cn(
            config.class,
            size === 'stretch' ? 'object-contain object-center' : ''
          )}
          priority={priority}
          style={{ 
            padding: 0, 
            margin: 0, 
            border: 'none', 
            boxShadow: 'none',
            ...(size === 'stretch' && {
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%'
            })
          }}
        />
      </div>
    )
  }
)

Logo.displayName = 'Logo'

export { Logo }