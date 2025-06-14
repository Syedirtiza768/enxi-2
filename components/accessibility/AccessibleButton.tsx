'use client'

import React, { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { useButtonAccessibility } from '@/lib/accessibility/keyboard-navigation'
import { generateButtonAria } from '@/lib/accessibility/aria-utils'
import { Loader2 } from 'lucide-react'

/**
 * Enhanced button component with comprehensive accessibility features
 */

export interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  
  /**
   * Button size
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Whether button spans full width
   */
  fullWidth?: boolean
  
  /**
   * Loading state
   */
  loading?: boolean
  
  /**
   * Left icon
   */
  leftIcon?: React.ReactNode
  
  /**
   * Right icon
   */
  rightIcon?: React.ReactNode
  
  /**
   * ARIA label for screen readers
   */
  ariaLabel?: string
  
  /**
   * Whether button is pressed (for toggle buttons)
   */
  pressed?: boolean
  
  /**
   * Whether button has popup
   */
  hasPopup?: boolean | 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  
  /**
   * Whether button is expanded (for disclosure buttons)
   */
  expanded?: boolean
  
  /**
   * ID of element this button controls
   */
  controls?: string
  
  /**
   * ID of element that describes this button
   */
  describedBy?: string
  
  /**
   * Tooltip text
   */
  tooltip?: string
  
  /**
   * Whether to announce loading state changes
   */
  announceLoading?: boolean
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled,
    leftIcon,
    rightIcon,
    ariaLabel,
    pressed,
    hasPopup,
    expanded,
    controls,
    describedBy,
    tooltip,
    announceLoading = true,
    onClick,
    ...props
  }, ref) => {
    // Handle click with accessibility features
    const handleClick = (): void => {
      if (!disabled && !loading && onClick) {
        onClick()
      }
    }
    
    // Use accessibility hook for keyboard handling
    const buttonRef = useButtonAccessibility(handleClick, disabled || loading)
    
    // Combine refs
    const combinedRef = (node: HTMLButtonElement): void => {
      if (buttonRef.current) buttonRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }
    
    // Generate ARIA attributes
    const ariaProps = generateButtonAria({
      expanded,
      pressed,
      controls,
      describedBy,
      label: ariaLabel,
      disabled: disabled || loading,
      popup: hasPopup
    })
    
    // Base styles
    const baseStyles = `
      inline-flex items-center justify-center font-medium
      transition-all duration-200 ease-in-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-[0.98] disabled:active:scale-100
    `
    
    // Variant styles
    const variants = {
      primary: `
        bg-blue-600 text-white shadow-sm
        hover:bg-blue-700 active:bg-blue-800
        focus-visible:ring-blue-500
        disabled:bg-blue-300
      `,
      secondary: `
        bg-gray-600 text-white shadow-sm
        hover:bg-gray-700 active:bg-gray-800
        focus-visible:ring-gray-500
        disabled:bg-gray-300
      `,
      outline: `
        border border-gray-300 bg-white text-gray-700
        hover:bg-gray-50 active:bg-gray-100
        focus-visible:ring-blue-500
        disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200
      `,
      ghost: `
        bg-transparent text-gray-700
        hover:bg-gray-100 active:bg-gray-200
        focus-visible:ring-blue-500
        disabled:text-gray-400
      `,
      danger: `
        bg-red-600 text-white shadow-sm
        hover:bg-red-700 active:bg-red-800
        focus-visible:ring-red-500
        disabled:bg-red-300
      `,
      success: `
        bg-green-600 text-white shadow-sm
        hover:bg-green-700 active:bg-green-800
        focus-visible:ring-green-500
        disabled:bg-green-300
      `
    }
    
    // Size styles
    const sizes = {
      xs: 'h-7 px-2.5 text-xs rounded-md gap-1.5',
      sm: 'h-9 px-3 text-sm rounded-md gap-2',
      md: 'h-10 px-4 text-sm rounded-md gap-2',
      lg: 'h-12 px-6 text-base rounded-lg gap-2.5',
      xl: 'h-14 px-8 text-lg rounded-lg gap-3'
    }
    
    // Icon sizes
    const iconSizes = {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
      xl: 'h-6 w-6'
    }
    
    // Loading announcement
    React.useEffect(() => {
      if (announceLoading && loading) {
        // Announce loading state change
        import('../lib/accessibility/announce').then(({ announce }) => {
          announce('Button is loading', 'polite')
        })
      }
    }, [loading, announceLoading])
    
    return (
      <button
        ref={combinedRef}
        type="button"
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        title={tooltip}
        aria-busy={loading}
        aria-live={loading ? 'polite' : undefined}
        {...ariaProps}
        {...props}
      >
        {/* Loading indicator */}
        {loading && (
          <>
            <Loader2 
              className={cn(iconSizes[size], 'animate-spin')}
              aria-hidden="true"
            />
            <span className="sr-only">Loading</span>
          </>
        )}
        
        {/* Left icon */}
        {!loading && leftIcon && (
          <span className={iconSizes[size]} aria-hidden="true">
            {leftIcon}
          </span>
        )}
        
        {/* Button content */}
        <span>{children}</span>
        
        {/* Right icon */}
        {!loading && rightIcon && (
          <span className={iconSizes[size]} aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'

/**
 * Icon button component with accessibility features
 */
export interface IconButtonProps extends Omit<AccessibleButtonProps, 'leftIcon' | 'rightIcon'> {
  /**
   * Icon element
   */
  icon: React.ReactNode
  
  /**
   * Required aria-label for icon buttons
   */
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, children, size = 'md', className, ...props }, ref) => {
    const iconSizes = {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
      xl: 'h-7 w-7'
    }
    
    const buttonSizes = {
      xs: 'h-7 w-7 p-1',
      sm: 'h-8 w-8 p-1.5',
      md: 'h-10 w-10 p-2',
      lg: 'h-12 w-12 p-2.5',
      xl: 'h-14 w-14 p-3'
    }
    
    return (
      <AccessibleButton
        ref={ref}
        className={cn(
          'rounded-full',
          buttonSizes[size],
          className
        )}
        size={size}
        {...props}
      >
        <span className={iconSizes[size]} aria-hidden="true">
          {icon}
        </span>
        {children && <span className="sr-only">{children}</span>}
      </AccessibleButton>
    )
  }
)

IconButton.displayName = 'IconButton'

/**
 * Toggle button component with accessibility features
 */
export interface ToggleButtonProps extends Omit<AccessibleButtonProps, 'pressed'> {
  /**
   * Whether the toggle is pressed/active
   */
  pressed: boolean
  
  /**
   * Callback when toggle state changes
   */
  onPressedChange: (pressed: boolean) => void
  
  /**
   * Text for pressed state (for screen readers)
   */
  pressedText?: string
  
  /**
   * Text for unpressed state (for screen readers)
   */
  unpressedText?: string
}

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({
    pressed,
    onPressedChange,
    pressedText,
    unpressedText,
    children,
    ariaLabel,
    ...props
  }, ref) => {
    const handleClick = (): void => {
      onPressedChange(!pressed)
    }
    
    // Generate aria-label based on state
    const stateLabel = pressed 
      ? (pressedText || 'pressed') 
      : (unpressedText || 'not pressed')
    
    const fullAriaLabel = ariaLabel 
      ? `${ariaLabel}, ${stateLabel}`
      : stateLabel
    
    return (
      <AccessibleButton
        ref={ref}
        pressed={pressed}
        ariaLabel={fullAriaLabel}
        onClick={handleClick}
        variant={pressed ? 'primary' : 'outline'}
        {...props}
      >
        {children}
        <span className="sr-only">
          {pressed ? (pressedText || 'pressed') : (unpressedText || 'not pressed')}
        </span>
      </AccessibleButton>
    )
  }
)

ToggleButton.displayName = 'ToggleButton'

/**
 * Button group component for related actions
 */
export interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
  'aria-label'?: string
}

export function ButtonGroup({
  children,
  className,
  orientation = 'horizontal',
  'aria-label': ariaLabel
}: ButtonGroupProps): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={cn(
        'inline-flex',
        orientation === 'horizontal' ? 'flex-row -space-x-px' : 'flex-col -space-y-px',
        '[&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md',
        '[&>button:not(:first-child):not(:last-child)]:rounded-none',
        orientation === 'vertical' && '[&>button:first-child]:rounded-t-md [&>button:first-child]:rounded-l-none [&>button:last-child]:rounded-b-md [&>button:last-child]:rounded-r-none',
        className
      )}
    >
      {children}
    </div>
  )
}