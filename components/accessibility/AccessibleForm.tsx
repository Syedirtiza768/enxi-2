'use client'

import React, { forwardRef, FormHTMLAttributes, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useFormNavigation } from '@/lib/accessibility/keyboard-navigation'
import { useScreenReaderAnnouncements } from '@/lib/accessibility/announce'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

/**
 * Enhanced form component with comprehensive accessibility features
 */

export interface AccessibleFormProps extends FormHTMLAttributes<HTMLFormElement> {
  /**
   * Form title for screen readers
   */
  title?: string
  
  /**
   * Form description for screen readers
   */
  description?: string
  
  /**
   * Array of validation errors
   */
  errors?: string[]
  
  /**
   * Whether the form is currently being submitted
   */
  isSubmitting?: boolean
  
  /**
   * Success message to announce
   */
  successMessage?: string
  
  /**
   * Whether to show live validation feedback
   */
  liveValidation?: boolean
  
  /**
   * Callback when form is submitted
   */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
  
  /**
   * Callback when form is cancelled (Escape key)
   */
  onCancel?: () => void
  
  /**
   * Whether to focus first invalid field on submit
   */
  focusFirstError?: boolean
}

export const AccessibleForm = forwardRef<HTMLFormElement, AccessibleFormProps>(
  ({
    children,
    className,
    title,
    description,
    errors = [],
    isSubmitting = false,
    successMessage,
    liveValidation = true,
    onSubmit,
    onCancel,
    focusFirstError = true,
    id,
    ...props
  }, ref) => {
    const formRef = useRef<HTMLFormElement>(null)
    const { announce, announceErrors, announceSuccess } = useScreenReaderAnnouncements()
    
    // Combine refs
    const combinedRef = (node: HTMLFormElement): void => {
      if (formRef.current) formRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }
    
    // Set up keyboard navigation
    useFormNavigation(undefined, onCancel)
    
    // Generate IDs
    const formId = id || React.useId()
    const titleId = title ? `${formId}-title` : undefined
    const descriptionId = description ? `${formId}-description` : undefined
    const errorsId = errors.length > 0 ? `${formId}-errors` : undefined
    
    // Announce form state changes
    useEffect(() => {
      if (isSubmitting) {
        announce('Form is being submitted, please wait', 'polite')
      }
    }, [isSubmitting, announce])
    
    useEffect(() => {
      if (successMessage) {
        announceSuccess(successMessage)
      }
    }, [successMessage, announceSuccess])
    
    useEffect(() => {
      if (errors.length > 0 && liveValidation) {
        announceErrors(errors)
      }
    }, [errors, liveValidation, announceErrors])
    
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault()
      
      if (errors.length > 0 && focusFirstError) {
        // Focus first invalid field
        const firstInvalidField = formRef.current?.querySelector('[aria-invalid="true"]') as HTMLElement
        if (firstInvalidField) {
          firstInvalidField.focus()
          firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        return
      }
      
      onSubmit?.(event)
    }
    
    // Build describedby list
    const describedBy = [descriptionId, errorsId].filter(Boolean).join(' ')
    
    return (
      <form
        ref={combinedRef}
        id={formId}
        className={cn('space-y-4', className)}
        onSubmit={handleSubmit}
        aria-labelledby={titleId}
        aria-describedby={describedBy || undefined}
        aria-live={liveValidation ? 'polite' : undefined}
        noValidate
        {...props}
      >
        {/* Screen reader title */}
        {title && (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        )}
        
        {/* Form description */}
        {description && (
          <div id={descriptionId} className="sr-only">
            {description}
          </div>
        )}
        
        {/* Error summary */}
        {errors.length > 0 && (
          <div
            id={errorsId}
            role="alert"
            aria-live="assertive"
            className="rounded-md bg-red-50 border border-red-200 p-4"
          >
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  {errors.length === 1 ? 'There is 1 error' : `There are ${errors.length} errors`} with your submission
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Success message */}
        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-md bg-green-50 border border-green-200 p-4"
          >
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-green-400 mr-3" />
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          </div>
        )}
        
        {/* Form content */}
        {children}
        
        {/* Loading indicator */}
        {isSubmitting && (
          <div
            role="status"
            aria-live="polite"
            aria-label="Form is being submitted"
            className="flex items-center justify-center py-4"
          >
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-sm text-gray-600">Submitting...</span>
          </div>
        )}
      </form>
    )
  }
)

AccessibleForm.displayName = 'AccessibleForm'

/**
 * Form field group component with proper labeling and error association
 */
export interface FormFieldGroupProps {
  children: React.ReactNode
  label?: string
  description?: string
  error?: string
  required?: boolean
  className?: string
}

export function FormFieldGroup({
  children,
  label,
  description,
  error,
  required = false,
  className
}: FormFieldGroupProps): React.JSX.Element {
  const groupId = React.useId()
  const labelId = label ? `${groupId}-label` : undefined
  const descriptionId = description ? `${groupId}-description` : undefined
  const errorId = error ? `${groupId}-error` : undefined
  
  // Build describedby list
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ')
  
  return (
    <fieldset
      className={cn('space-y-2', className)}
      aria-labelledby={labelId}
      aria-describedby={describedBy || undefined}
      aria-invalid={!!error}
    >
      {label && (
        <legend id={labelId} className="text-sm font-medium text-gray-700">
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-label="required">*</span>
          )}
        </legend>
      )}
      
      {description && (
        <div id={descriptionId} className="text-sm text-gray-600 flex items-start">
          <Info className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
          {description}
        </div>
      )}
      
      {children}
      
      {error && (
        <div id={errorId} role="alert" className="text-sm text-red-600 flex items-start">
          <AlertCircle className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </fieldset>
  )
}

/**
 * Required field indicator component
 */
export function RequiredIndicator({ className }: { className?: string }): React.JSX.Element {
  return (
    <abbr
      title="required"
      aria-label="required"
      className={cn('text-red-500 no-underline', className)}
    >
      *
    </abbr>
  )
}

/**
 * Form section component for grouping related fields
 */
export interface FormSectionProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function FormSection({
  children,
  title,
  description,
  className
}: FormSectionProps): React.JSX.Element {
  const sectionId = React.useId()
  const titleId = title ? `${sectionId}-title` : undefined
  const descriptionId = description ? `${sectionId}-description` : undefined
  
  return (
    <section
      className={cn('space-y-4', className)}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      {title && (
        <h3 id={titleId} className="text-lg font-medium text-gray-900">
          {title}
        </h3>
      )}
      
      {description && (
        <p id={descriptionId} className="text-sm text-gray-600">
          {description}
        </p>
      )}
      
      {children}
    </section>
  )
}