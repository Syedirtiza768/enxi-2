'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Heading } from '../atoms/Text'

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

export interface ModalContentProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
  onClose?: () => void
  showCloseButton?: boolean
}

export interface ModalHeaderProps {
  children: React.ReactNode
  className?: string
  onClose?: () => void
  showCloseButton?: boolean
}

export interface ModalFooterProps {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right' | 'between'
}

const Modal = ({ open, onOpenChange, children, className }: ModalProps): void => {
  React.useEffect(() => {
    if (open) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
      
      // Handle escape key
      const handleEscape = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          onOpenChange(false)
        }
      }
      
      document.addEventListener('keydown', handleEscape)
      
      return (): void => {
        document.body.style.overflow = ''
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[var(--z-modal)]',
        'flex items-center justify-center p-4',
        className
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[var(--blur-sm)] animate-fade-in"
        onClick={(): void => onOpenChange(false)}
        aria-hidden="true"
      />
      
      {/* Modal content wrapper */}
      <div className="relative w-full max-h-[90vh] animate-scale-in">
        {children}
      </div>
    </div>
  )
}

const ModalContent = ({
  children,
  size = 'md',
  className,
  onClose,
  showCloseButton = true
}: ModalContentProps): void => {
  const sizeClasses = {
    sm: 'max-w-[95vw] sm:max-w-sm',
    md: 'max-w-[95vw] sm:max-w-md',
    lg: 'max-w-[95vw] sm:max-w-lg',
    xl: 'max-w-[95vw] sm:max-w-xl',
    full: 'max-w-[95vw]'
  }

  return (
    <div
      className={cn(
        'relative w-full bg-[var(--bg-elevated)] rounded-[var(--radius-xl)]',
        'shadow-[var(--shadow-2xl)] overflow-hidden',
        'flex flex-col max-h-[90vh] sm:max-h-[85vh]',
        sizeClasses[size],
        className
      )}
      role="dialog"
      aria-modal="true"
    >
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className={cn(
            'absolute right-2 top-2 sm:right-4 sm:top-4 z-10',
            'p-2 sm:p-1 rounded-[var(--radius-md)]',
            'min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]',
            'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
            'hover:bg-[var(--bg-secondary)]',
            'transition-colors duration-[var(--transition-fast)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary-500)]'
          )}
          aria-label="Close modal"
        >
          <X className="h-6 w-6 sm:h-5 sm:w-5" />
        </button>
      )}
      {children}
    </div>
  )
}

const ModalHeader = ({
  children,
  className,
  onClose,
  showCloseButton = true
}: ModalHeaderProps): void => {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--border-primary)]',
        className
      )}
    >
      <div className="flex-1 pr-4">
        {typeof children === 'string' ? (
          <Heading as="h2" className="text-xl font-semibold">
            {children}
          </Heading>
        ) : (
          children
        )}
      </div>
      
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className={cn(
            'p-1 rounded-[var(--radius-md)]',
            'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
            'hover:bg-[var(--bg-secondary)]',
            'transition-colors duration-[var(--transition-fast)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary-500)]'
          )}
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

const ModalBody = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex-1 overflow-y-auto',
          'px-4 py-3 sm:px-6 sm:py-4',
          className
        )}
        {...props}
      />
    )
  }
)

ModalBody.displayName = 'ModalBody'

const ModalFooter = ({
  children,
  className,
  align = 'right'
}: ModalFooterProps): void => {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        alignmentClasses[align],
        'px-4 py-3 sm:px-6 sm:py-4 border-t border-[var(--border-primary)]',
        className
      )}
    >
      {children}
    </div>
  )
}

// Simple modal component for common use cases
interface SimpleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  size?: ModalContentProps['size']
}

export function SimpleModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md'
}: SimpleModalProps): React.JSX.Element {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size={size} onClose={(): void => onOpenChange(false)}>
        <ModalHeader>
          <div>
            <Heading as="h2" className="text-xl font-semibold">
              {title}
            </Heading>
            {description && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {description}
              </p>
            )}
          </div>
        </ModalHeader>
        
        {children && <ModalBody>{children}</ModalBody>}
        
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContent>
    </Modal>
  )
}

export { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter }