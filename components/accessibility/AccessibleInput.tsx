'use client'

import React, { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'
import { useFormFieldAria } from '@/lib/accessibility/aria-utils'
import { useScreenReaderAnnouncements } from '@/lib/accessibility/announce'
import { AlertCircle, Eye, EyeOff, CheckCircle2, Info } from 'lucide-react'

/**
 * Enhanced input component with comprehensive accessibility features
 */

export interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Input label
   */
  label?: string
  
  /**
   * Input description/hint text
   */
  description?: string
  
  /**
   * Error message
   */
  error?: string
  
  /**
   * Success message
   */
  success?: string
  
  /**
   * Left icon
   */
  leftIcon?: ReactNode
  
  /**
   * Right icon
   */
  rightIcon?: ReactNode
  
  /**
   * Whether input spans full width
   */
  fullWidth?: boolean
  
  /**
   * Input size
   */
  inputSize?: 'sm' | 'md' | 'lg'
  
  /**
   * Whether to show validation icons
   */
  showValidationIcons?: boolean
  
  /**
   * Whether to announce validation changes
   */
  announceValidation?: boolean
  
  /**
   * Custom validation message for screen readers
   */
  validationMessage?: string
  
  /**
   * Whether field is currently being validated
   */
  validating?: boolean
  
  /**
   * Prefix text
   */
  prefix?: string
  
  /**
   * Suffix text
   */
  suffix?: string
  
  /**
   * Maximum character count
   */
  maxLength?: number
  
  /**
   * Whether to show character count
   */
  showCharacterCount?: boolean
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({
    className,
    type = 'text',
    label,
    description,
    error,
    success,
    leftIcon,
    rightIcon,
    fullWidth = false,
    inputSize = 'md',
    showValidationIcons = true,
    announceValidation = true,
    validationMessage,
    validating = false,
    disabled,
    required,
    id,
    prefix,
    suffix,
    maxLength,
    showCharacterCount = false,
    value,
    onChange,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const { announce } = useScreenReaderAnnouncements()
    
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type
    const hasError = !!error
    const hasSuccess = !!success && !hasError
    const isInvalid = hasError
    
    // Generate ARIA attributes
    const ariaProps = useFormFieldAria({
      id,
      label,
      description,
      error: error || validationMessage,
      required,
      invalid: isInvalid
    })
    
    // Announce validation changes
    React.useEffect(() => {
      if (announceValidation && validationMessage) {
        announce(validationMessage, 'polite')
      }
    }, [validationMessage, announceValidation, announce])
    
    React.useEffect(() => {
      if (announceValidation && error) {
        announce(`Error: ${error}`, 'assertive')
      }
    }, [error, announceValidation, announce])
    
    React.useEffect(() => {
      if (announceValidation && success) {
        announce(`Success: ${success}`, 'polite')
      }
    }, [success, announceValidation, announce])
    
    // Base styles
    const baseStyles = `
      w-full bg-white text-gray-900 border
      transition-all duration-200 ease-in-out
      placeholder:text-gray-500
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
    `
    
    // Size styles
    const sizeStyles = {
      sm: 'h-9 px-3 text-sm rounded-md',
      md: 'h-10 px-4 text-base rounded-md',
      lg: 'h-12 px-5 text-lg rounded-lg'
    }
    
    // Icon sizes
    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    }
    
    // Border styles based on state
    const borderStyles = hasError 
      ? 'border-red-500 focus:ring-red-500' 
      : hasSuccess 
        ? 'border-green-500 focus:ring-green-500'
        : 'border-gray-300 focus:ring-blue-500'
    
    // Padding adjustments for icons and prefix/suffix
    const paddingAdjustments = {
      left: {
        sm: leftIcon || prefix ? 'pl-9' : '',
        md: leftIcon || prefix ? 'pl-11' : '',
        lg: leftIcon || prefix ? 'pl-13' : ''
      },
      right: {
        sm: rightIcon || suffix || isPassword || showValidationIcons ? 'pr-9' : '',
        md: rightIcon || suffix || isPassword || showValidationIcons ? 'pr-11' : '',
        lg: rightIcon || suffix || isPassword || showValidationIcons ? 'pr-13' : ''
      }
    }
    
    // Character count
    const characterCount = typeof value === 'string' ? value.length : 0
    const characterCountColor = maxLength && characterCount > maxLength 
      ? 'text-red-600' 
      : characterCount > (maxLength || 0) * 0.8 
        ? 'text-yellow-600' 
        : 'text-gray-500'
    
    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            {...ariaProps.label}
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            {label}
            {required && (
              <span className="ml-1 text-red-500" aria-label="required">*</span>
            )}
          </label>
        )}
        
        {/* Description */}
        {description && (
          <div
            {...ariaProps.description}
            className="mb-2 text-sm text-gray-600 flex items-start"
          >
            <Info className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
            {description}
          </div>
        )}
        
        {/* Input container */}
        <div className="relative">
          {/* Prefix */}
          {prefix && (
            <div className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none',
              inputSize === 'sm' && 'text-xs',
              inputSize === 'lg' && 'text-base'
            )}>
              {prefix}
            </div>
          )}
          
          {/* Left icon */}
          {leftIcon && !prefix && (
            <div className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400',
              iconSizes[inputSize]
            )}>
              {leftIcon}
            </div>
          )}
          
          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              baseStyles,
              sizeStyles[inputSize],
              borderStyles,
              paddingAdjustments.left[inputSize],
              paddingAdjustments.right[inputSize],
              className
            )}
            disabled={disabled}
            required={required}
            maxLength={maxLength}
            value={value}
            onChange={onChange}
            onFocus={(): void => setIsFocused(true)}
            onBlur={(): void => setIsFocused(false)}
            {...ariaProps.field}
            {...props}
          />
          
          {/* Suffix */}
          {suffix && (
            <div className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none',
              inputSize === 'sm' && 'text-xs',
              inputSize === 'lg' && 'text-base'
            )}>
              {suffix}
            </div>
          )}
          
          {/* Right side icons */}
          <div className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1',
            iconSizes[inputSize]
          )}>
            {/* Validation icons */}
            {showValidationIcons && !validating && (
              <>
                {hasError && (
                  <AlertCircle className="text-red-500" aria-hidden="true" />
                )}
                {hasSuccess && (
                  <CheckCircle2 className="text-green-500" aria-hidden="true" />
                )}
              </>
            )}
            
            {/* Validating spinner */}
            {validating && (
              <div 
                className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"
                aria-hidden="true"
              />
            )}
            
            {/* Password visibility toggle */}
            {isPassword && (
              <button
                type="button"
                onClick={(): void => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            )}
            
            {/* Custom right icon */}
            {rightIcon && !isPassword && !showValidationIcons && (
              <span className="text-gray-400" aria-hidden="true">
                {rightIcon}
              </span>
            )}
          </div>
        </div>
        
        {/* Character count */}
        {showCharacterCount && maxLength && (
          <div className={cn('mt-1 text-xs text-right', characterCountColor)}>
            {characterCount}/{maxLength}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div
            {...ariaProps.error}
            className="mt-2 flex items-start text-sm text-red-600"
          >
            <AlertCircle className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
        
        {/* Success message */}
        {success && !error && (
          <div className="mt-2 flex items-start text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
            {success}
          </div>
        )}
        
        {/* Live validation feedback for screen readers */}
        {validating && (
          <div className="sr-only" aria-live="polite">
            Validating input
          </div>
        )}
      </div>
    )
  }
)

AccessibleInput.displayName = 'AccessibleInput'

/**
 * Textarea component with accessibility features
 */
export interface AccessibleTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  description?: string
  error?: string
  success?: string
  fullWidth?: boolean
  showCharacterCount?: boolean
  announceValidation?: boolean
  resizable?: boolean
}

export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(
  ({
    className,
    label,
    description,
    error,
    success,
    fullWidth = false,
    showCharacterCount = false,
    announceValidation = true,
    resizable = true,
    disabled,
    required,
    id,
    maxLength,
    value,
    onChange,
    ...props
  }, ref) => {
    const { announce } = useScreenReaderAnnouncements()
    
    const hasError = !!error
    const hasSuccess = !!success && !hasError
    const isInvalid = hasError
    
    // Generate ARIA attributes
    const ariaProps = useFormFieldAria({
      id,
      label,
      description,
      error,
      required,
      invalid: isInvalid
    })
    
    // Announce validation changes
    React.useEffect(() => {
      if (announceValidation && error) {
        announce(`Error: ${error}`, 'assertive')
      }
    }, [error, announceValidation, announce])
    
    React.useEffect(() => {
      if (announceValidation && success) {
        announce(`Success: ${success}`, 'polite')
      }
    }, [success, announceValidation, announce])
    
    // Base styles
    const baseStyles = `
      w-full bg-white text-gray-900 border rounded-md
      transition-all duration-200 ease-in-out
      placeholder:text-gray-500
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
      px-4 py-3 text-base
    `
    
    // Border styles based on state
    const borderStyles = hasError 
      ? 'border-red-500 focus:ring-red-500' 
      : hasSuccess 
        ? 'border-green-500 focus:ring-green-500'
        : 'border-gray-300 focus:ring-blue-500'
    
    // Character count
    const characterCount = typeof value === 'string' ? value.length : 0
    const characterCountColor = maxLength && characterCount > maxLength 
      ? 'text-red-600' 
      : characterCount > (maxLength || 0) * 0.8 
        ? 'text-yellow-600' 
        : 'text-gray-500'
    
    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            {...ariaProps.label}
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            {label}
            {required && (
              <span className="ml-1 text-red-500" aria-label="required">*</span>
            )}
          </label>
        )}
        
        {/* Description */}
        {description && (
          <div
            {...ariaProps.description}
            className="mb-2 text-sm text-gray-600 flex items-start"
          >
            <Info className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
            {description}
          </div>
        )}
        
        {/* Textarea */}
        <textarea
          ref={ref}
          className={cn(
            baseStyles,
            borderStyles,
            !resizable && 'resize-none',
            className
          )}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          value={value}
          onChange={onChange}
          {...ariaProps.field}
          {...props}
        />
        
        {/* Character count */}
        {showCharacterCount && maxLength && (
          <div className={cn('mt-1 text-xs text-right', characterCountColor)}>
            {characterCount}/{maxLength}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div
            {...ariaProps.error}
            className="mt-2 flex items-start text-sm text-red-600"
          >
            <AlertCircle className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
        
        {/* Success message */}
        {success && !error && (
          <div className="mt-2 flex items-start text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
            {success}
          </div>
        )}
      </div>
    )
  }
)

AccessibleTextarea.displayName = 'AccessibleTextarea'