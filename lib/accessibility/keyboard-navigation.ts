/**
 * Keyboard navigation utilities and hooks
 * Provides standardized keyboard interaction patterns for various UI components
 */

import { useEffect, useCallback, useRef } from 'react'

/**
 * Standard keyboard navigation keys
 */
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace'
} as const

/**
 * Keyboard event handler type
 */
export type KeyboardEventHandler = (event: KeyboardEvent) => void

/**
 * Hook for handling keyboard shortcuts
 * @param shortcuts - Object mapping key combinations to handlers
 * @param enabled - Whether shortcuts are active
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, KeyboardEventHandler>,
  enabled: boolean = true
): void {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Build key combination string
    const modifiers: string[] = []
    if (event.ctrlKey || event.metaKey) modifiers.push('cmd')
    if (event.altKey) modifiers.push('alt')
    if (event.shiftKey) modifiers.push('shift')
    
    const key = event.key.toLowerCase()
    const combination = [...modifiers, key].join('+')
    
    // Also check without modifiers for simple keys
    const handler = shortcuts[combination] || shortcuts[key]
    
    if (handler) {
      event.preventDefault()
      handler(event)
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return (): void => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

/**
 * Hook for handling escape key to close components
 * @param onEscape - Callback when escape is pressed
 * @param enabled - Whether escape handling is active
 */
export function useEscapeKey(onEscape: () => void, enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === KEYBOARD_KEYS.ESCAPE) {
        event.preventDefault()
        onEscape()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return (): void => document.removeEventListener('keydown', handleEscape)
  }, [onEscape, enabled])
}

/**
 * Hook for handling arrow key navigation in lists
 * @param onNavigate - Callback with direction when arrow keys are pressed
 * @param enabled - Whether navigation is active
 */
export function useArrowNavigation(
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void,
  enabled: boolean = true
): unknown {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const handleArrowKeys = (event: KeyboardEvent): void => {
      switch (event.key) {
        case KEYBOARD_KEYS.ARROW_UP:
          event.preventDefault()
          onNavigate('up')
          break
        case KEYBOARD_KEYS.ARROW_DOWN:
          event.preventDefault()
          onNavigate('down')
          break
        case KEYBOARD_KEYS.ARROW_LEFT:
          event.preventDefault()
          onNavigate('left')
          break
        case KEYBOARD_KEYS.ARROW_RIGHT:
          event.preventDefault()
          onNavigate('right')
          break
      }
    }

    const container = containerRef.current
    container.addEventListener('keydown', handleArrowKeys)
    return (): void => container.removeEventListener('keydown', handleArrowKeys)
  }, [onNavigate, enabled])

  return containerRef
}

/**
 * Hook for dropdown/combobox keyboard navigation
 * @param isOpen - Whether dropdown is open
 * @param onToggle - Toggle dropdown open/closed
 * @param onSelect - Select current highlighted item
 * @param onNavigate - Navigate through options
 */
export function useDropdownNavigation(
  isOpen: boolean,
  onToggle: () => void,
  onSelect: () => void,
  onNavigate: (direction: 'up' | 'down') => void
): unknown {
  const triggerRef = useRef<HTMLElement>(null)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case KEYBOARD_KEYS.ENTER:
      case KEYBOARD_KEYS.SPACE:
        event.preventDefault()
        if (isOpen) {
          onSelect()
        } else {
          onToggle()
        }
        break
        
      case KEYBOARD_KEYS.ESCAPE:
        if (isOpen) {
          event.preventDefault()
          onToggle()
          triggerRef.current?.focus()
        }
        break
        
      case KEYBOARD_KEYS.ARROW_DOWN:
        event.preventDefault()
        if (isOpen) {
          onNavigate('down')
        } else {
          onToggle()
        }
        break
        
      case KEYBOARD_KEYS.ARROW_UP:
        event.preventDefault()
        if (isOpen) {
          onNavigate('up')
        } else {
          onToggle()
        }
        break
        
      case KEYBOARD_KEYS.TAB:
        if (isOpen) {
          onToggle()
        }
        break
    }
  }, [isOpen, onToggle, onSelect, onNavigate])

  useEffect(() => {
    const trigger = triggerRef.current
    if (trigger) {
      trigger.addEventListener('keydown', handleKeyDown)
      return (): void => trigger.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return triggerRef
}

/**
 * Hook for table keyboard navigation
 * @param onNavigate - Callback with navigation details
 */
export function useTableNavigation(
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right', event: KeyboardEvent) => void
): unknown {
  const tableRef = useRef<HTMLTableElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Only handle if focused element is within the table
      if (!tableRef.current?.contains(event.target as Node)) return

      switch (event.key) {
        case KEYBOARD_KEYS.ARROW_UP:
          event.preventDefault()
          onNavigate('up', event)
          break
        case KEYBOARD_KEYS.ARROW_DOWN:
          event.preventDefault()
          onNavigate('down', event)
          break
        case KEYBOARD_KEYS.ARROW_LEFT:
          event.preventDefault()
          onNavigate('left', event)
          break
        case KEYBOARD_KEYS.ARROW_RIGHT:
          event.preventDefault()
          onNavigate('right', event)
          break
        case KEYBOARD_KEYS.HOME:
          if (event.ctrlKey) {
            event.preventDefault()
            // Navigate to first cell in table
            onNavigate('up', event)
          }
          break
        case KEYBOARD_KEYS.END:
          if (event.ctrlKey) {
            event.preventDefault()
            // Navigate to last cell in table
            onNavigate('down', event)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return (): void => document.removeEventListener('keydown', handleKeyDown)
  }, [onNavigate])

  return tableRef
}

/**
 * Hook for form keyboard navigation and submission
 * @param onSubmit - Submit form callback
 * @param onCancel - Cancel form callback
 */
export function useFormNavigation(
  onSubmit?: () => void,
  onCancel?: () => void
): unknown {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Only handle if focused element is within the form
      if (!formRef.current?.contains(event.target as Node)) return

      switch (event.key) {
        case KEYBOARD_KEYS.ENTER:
          // Allow default behavior for textareas and specific input types
          const target = event.target as HTMLElement
          const isTextarea = target.tagName === 'TEXTAREA'
          const isButton = target.tagName === 'BUTTON'
          const isSubmitInput = target.getAttribute('type') === 'submit'
          
          if (!isTextarea && !isButton && !isSubmitInput && onSubmit) {
            event.preventDefault()
            onSubmit()
          }
          break
          
        case KEYBOARD_KEYS.ESCAPE:
          if (onCancel) {
            event.preventDefault()
            onCancel()
          }
          break
      }
    }

    const form = formRef.current
    if (form) {
      form.addEventListener('keydown', handleKeyDown)
      return (): void => form.removeEventListener('keydown', handleKeyDown)
    }
  }, [onSubmit, onCancel])

  return formRef
}

/**
 * Hook for modal keyboard navigation
 * @param isOpen - Whether modal is open
 * @param onClose - Close modal callback
 */
export function useModalNavigation(isOpen: boolean, onClose: () => void): void {
  useEscapeKey(onClose, isOpen)
  
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      
      return (): void => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])
}

/**
 * Hook for accessible button behavior
 * Ensures buttons can be activated with both Enter and Space
 * @param onClick - Click handler
 * @param disabled - Whether button is disabled
 */
export function useButtonAccessibility(
  onClick: () => void,
  disabled: boolean = false
): unknown {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return

    if (event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE) {
      event.preventDefault()
      onClick()
    }
  }, [onClick, disabled])

  useEffect(() => {
    const button = buttonRef.current
    if (button) {
      button.addEventListener('keydown', handleKeyDown)
      return (): void => button.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return buttonRef
}

/**
 * Create keyboard event handlers for common patterns
 */
export const createKeyboardHandler = {
  /**
   * Create handler for activating elements with Enter/Space
   */
  activation: (callback: () => void): void => (event: KeyboardEvent): void => {
    if (event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE) {
      event.preventDefault()
      callback()
    }
  },

  /**
   * Create handler for closing elements with Escape
   */
  escape: (callback: () => void): void => (event: KeyboardEvent): void => {
    if (event.key === KEYBOARD_KEYS.ESCAPE) {
      event.preventDefault()
      callback()
    }
  },

  /**
   * Create handler for arrow navigation
   */
  arrows: (callbacks: {
    up?: () => void
    down?: () => void
    left?: () => void
    right?: () => void
  }): void => (event: KeyboardEvent): void => {
    switch (event.key) {
      case KEYBOARD_KEYS.ARROW_UP:
        if (callbacks.up) {
          event.preventDefault()
          callbacks.up()
        }
        break
      case KEYBOARD_KEYS.ARROW_DOWN:
        if (callbacks.down) {
          event.preventDefault()
          callbacks.down()
        }
        break
      case KEYBOARD_KEYS.ARROW_LEFT:
        if (callbacks.left) {
          event.preventDefault()
          callbacks.left()
        }
        break
      case KEYBOARD_KEYS.ARROW_RIGHT:
        if (callbacks.right) {
          event.preventDefault()
          callbacks.right()
        }
        break
    }
  }
}