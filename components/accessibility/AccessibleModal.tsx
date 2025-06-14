'use client'

import React, { forwardRef, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/lib/accessibility/focus-management'
import { useModalNavigation } from '@/lib/accessibility/keyboard-navigation'
import { generateDialogAria } from '@/lib/accessibility/aria-utils'
import { useScreenReaderAnnouncements } from '@/lib/accessibility/announce'
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react'

/**
 * Enhanced modal component with comprehensive accessibility features
 */

export interface AccessibleModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean
  
  /**
   * Callback when modal should close
   */
  onOpenChange: (open: boolean) => void
  
  /**
   * Modal title for screen readers
   */
  title: string
  
  /**
   * Modal description for screen readers
   */
  description?: string
  
  /**
   * Modal content
   */
  children: React.ReactNode
  
  /**
   * Modal size
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  
  /**
   * Whether to show close button
   */
  showCloseButton?: boolean
  
  /**
   * Whether clicking outside closes modal
   */
  closeOnOverlayClick?: boolean
  
  /**
   * Whether pressing escape closes modal
   */
  closeOnEscape?: boolean
  
  /**
   * Modal role
   */
  role?: 'dialog' | 'alertdialog'
  
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Initial focus element selector
   */
  initialFocus?: string
  
  /**
   * Callback when modal opens
   */
  onOpen?: () => void
  
  /**
   * Callback when modal closes
   */
  onClose?: () => void
}

export const AccessibleModal = forwardRef<HTMLDivElement, AccessibleModalProps>(
  ({
    open,
    onOpenChange,
    title,
    description,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    role = 'dialog',
    className,
    initialFocus,
    onOpen,
    onClose,
    ...props
  }, ref) => {
    const modalRef = useRef<HTMLDivElement>(null)
    const { announce } = useScreenReaderAnnouncements()
    
    // Combine refs
    const combinedRef = (node: HTMLDivElement): void => {
      if (modalRef.current) modalRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }
    
    // Set up focus trap
    const trapRef = useFocusTrap(open)
    
    // Set up modal navigation
    useModalNavigation(open, () => {
      if (closeOnEscape) {
        handleClose()
      }
    })
    
    const modalId = React.useId()
    const titleId = `${modalId}-title`
    const descriptionId = description ? `${modalId}-description` : undefined
    
    // Handle modal close
    const handleClose = (): void => {
      onClose?.()
      onOpenChange(false)
    }
    
    // Handle overlay click
    const handleOverlayClick = (event: React.MouseEvent): void => {
      if (closeOnOverlayClick && event.target === event.currentTarget) {
        handleClose()
      }
    }
    
    // Announce modal open/close
    useEffect(() => {
      if (open) {
        onOpen?.()
        announce(`${title} dialog opened`, 'polite')
      }
    }, [open, title, announce, onOpen])
    
    // Set initial focus
    useEffect(() => {
      if (open && modalRef.current && initialFocus) {
        const focusElement = modalRef.current.querySelector(initialFocus) as HTMLElement
        if (focusElement) {
          focusElement.focus()
        }
      }
    }, [open, initialFocus])
    
    // Size classes
    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-[95vw]'
    }
    
    // Generate dialog ARIA attributes
    const dialogAria = generateDialogAria({
      labelledBy: titleId,
      describedBy: descriptionId,
      modal: true
    })
    
    if (!open) return null
    
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="presentation"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
        
        {/* Modal */}
        <div
          ref={(node): void => {
            combinedRef(node)
            trapRef.current = node
          }}
          className={cn(
            'relative w-full bg-white rounded-lg shadow-xl overflow-hidden',
            'flex flex-col max-h-[90vh]',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            sizeClasses[size],
            className
          )}
          {...dialogAria}
          {...props}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex-1 pr-4">
              <h2 id={titleId} className="text-xl font-semibold text-gray-900">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-gray-600">
                  {description}
                </p>
              )}
            </div>
            
            {showCloseButton && (
              <button
                onClick={handleClose}
                className={cn(
                  'p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                  'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                )}
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    )
  }
)

AccessibleModal.displayName = 'AccessibleModal'

/**
 * Confirmation dialog component
 */
export interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger' | 'warning'
  onConfirm: () => void
  onCancel?: () => void
  loading?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false
}: ConfirmationDialogProps): React.JSX.Element {
  const { announce } = useScreenReaderAnnouncements()
  
  const handleConfirm = (): void => {
    onConfirm()
    announce('Action confirmed', 'polite')
  }
  
  const handleCancel = (): void => {
    onCancel?.()
    onOpenChange(false)
    announce('Action cancelled', 'polite')
  }
  
  const getIcon = (): void => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle className="h-6 w-6 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }
  
  const getConfirmButtonClass = (): void => {
    const baseClass = 'px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2'
    
    switch (variant) {
      case 'danger':
        return `${baseClass} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`
      case 'warning':
        return `${baseClass} bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500`
      default:
        return `${baseClass} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`
    }
  }
  
  return (
    <AccessibleModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      role="alertdialog"
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={false}
      initialFocus="[data-autofocus]"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1">
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            
            <button
              onClick={handleConfirm}
              disabled={loading}
              data-autofocus
              className={cn(
                getConfirmButtonClass(),
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </div>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </AccessibleModal>
  )
}

/**
 * Alert dialog component for important messages
 */
export interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  variant?: 'info' | 'success' | 'warning' | 'error'
  actionLabel?: string
  onAction?: () => void
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  message,
  variant = 'info',
  actionLabel = 'OK',
  onAction
}: AlertDialogProps): React.JSX.Element {
  const { announce } = useScreenReaderAnnouncements()
  
  const handleAction = (): void => {
    onAction?.()
    onOpenChange(false)
    announce('Dialog closed', 'polite')
  }
  
  const getIcon = (): void => {
    switch (variant) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }
  
  const getBackgroundColor = (): void => {
    switch (variant) {
      case 'success':
        return 'bg-green-50'
      case 'warning':
        return 'bg-yellow-50'
      case 'error':
        return 'bg-red-50'
      default:
        return 'bg-blue-50'
    }
  }
  
  return (
    <AccessibleModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      role="alertdialog"
      size="sm"
      showCloseButton={false}
      initialFocus="[data-autofocus]"
    >
      <div className={cn('p-4 rounded-md', getBackgroundColor())}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          <div className="flex-1">
            <p className="text-sm text-gray-800">{message}</p>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAction}
                data-autofocus
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {actionLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AccessibleModal>
  )
}