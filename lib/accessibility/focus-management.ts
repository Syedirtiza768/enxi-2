/**
 * Focus management utilities for accessibility
 * Provides hooks and utilities for managing focus in interactive elements
 */

import { useEffect, useRef, useCallback } from 'react'

/**
 * Query selector for focusable elements
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"]):not([aria-hidden])',
  'select:not([disabled]):not([aria-hidden])',
  'textarea:not([disabled]):not([aria-hidden])',
  'button:not([disabled]):not([aria-hidden])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex^="-"])',
  'audio[controls]',
  'video[controls]',
  'summary'
].join(',')

/**
 * Get all focusable elements within a container
 * @param container - Container element to search within
 * @returns Array of focusable elements
 */
export function getFocusableElements(container: Element): HTMLElement[] {
  const focusableElements = container.querySelectorAll(FOCUSABLE_SELECTOR)
  return Array.from(focusableElements).filter((element) => {
    const htmlElement = element as HTMLElement
    return (
      htmlElement.offsetWidth > 0 ||
      htmlElement.offsetHeight > 0 ||
      htmlElement === document.activeElement
    )
  }) as HTMLElement[]
}

/**
 * Get the first and last focusable elements in a container
 * @param container - Container element
 * @returns Object with firstFocusable and lastFocusable elements
 */
export function getFocusBoundaries(container: Element): {
  firstFocusable: HTMLElement | null
  lastFocusable: HTMLElement | null
} {
  const focusableElements = getFocusableElements(container)
  return {
    firstFocusable: focusableElements[0] || null,
    lastFocusable: focusableElements[focusableElements.length - 1] || null
  }
}

/**
 * Hook for managing focus trap within a container
 * Useful for modals, dropdowns, and other overlay components
 */
export function useFocusTrap(isActive: boolean = true): unknown {
  const containerRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (!isActive || !containerRef.current || event.key !== 'Tab') return

    const { firstFocusable, lastFocusable } = getFocusBoundaries(containerRef.current)
    
    if (!firstFocusable) return

    if (event.shiftKey) {
      // Shift + Tab: moving backwards
      if (document.activeElement === firstFocusable) {
        event.preventDefault()
        lastFocusable?.focus()
      }
    } else {
      // Tab: moving forwards
      if (document.activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable.focus()
      }
    }
  }, [isActive])

  useEffect(() => {
    if (isActive && containerRef.current) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus the first focusable element in the container
      const { firstFocusable } = getFocusBoundaries(containerRef.current)
      if (firstFocusable) {
        firstFocusable.focus()
      }

      // Add event listener for tab key
      document.addEventListener('keydown', trapFocus)

      return (): void => {
        document.removeEventListener('keydown', trapFocus)
        
        // Restore focus to previously focused element
        if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
          previousFocusRef.current.focus()
        }
      }
    }
  }, [isActive, trapFocus])

  return containerRef
}

/**
 * Hook for managing focus on mount
 * Useful for auto-focusing elements when they appear
 */
export function useFocusOnMount(shouldFocus: boolean = true): unknown {
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (shouldFocus && elementRef.current) {
      // Small delay to ensure element is fully rendered
      const timeoutId = setTimeout(() => {
        elementRef.current?.focus()
      }, 10)
      
      return (): void => clearTimeout(timeoutId)
    }
  }, [shouldFocus])

  return elementRef
}

/**
 * Hook for managing focus restoration
 * Useful for returning focus after a modal or overlay closes
 */
export function useFocusRestore(): unknown {
  const previousElementRef = useRef<HTMLElement | null>(null)

  const storeFocus = useCallback(() => {
    previousElementRef.current = document.activeElement as HTMLElement
  }, [])

  const restoreFocus = useCallback(() => {
    if (previousElementRef.current && document.body.contains(previousElementRef.current)) {
      previousElementRef.current.focus()
      previousElementRef.current = null
    }
  }, [])

  return { storeFocus, restoreFocus }
}

/**
 * Hook for managing roving tabindex pattern
 * Useful for toolbars, menubars, and other composite widgets
 */
export function useRovingTabIndex<T extends HTMLElement>(
  items: React.RefObject<T>[],
  activeIndex: number,
  onActiveIndexChange: (index: number) => void,
  orientation: 'horizontal' | 'vertical' = 'horizontal'
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const isHorizontal = orientation === 'horizontal'
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'
      
      if (event.key === nextKey) {
        event.preventDefault()
        const nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0
        onActiveIndexChange(nextIndex)
        items[nextIndex].current?.focus()
      } else if (event.key === prevKey) {
        event.preventDefault()
        const prevIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1
        onActiveIndexChange(prevIndex)
        items[prevIndex].current?.focus()
      } else if (event.key === 'Home') {
        event.preventDefault()
        onActiveIndexChange(0)
        items[0].current?.focus()
      } else if (event.key === 'End') {
        event.preventDefault()
        const lastIndex = items.length - 1
        onActiveIndexChange(lastIndex)
        items[lastIndex].current?.focus()
      }
    }

    // Set tabindex for all items
    items.forEach((item, index) => {
      if (item.current) {
        item.current.tabIndex = index === activeIndex ? 0 : -1
        item.current.addEventListener('keydown', handleKeyDown)
      }
    })

    return (): void => {
      items.forEach((item) => {
        if (item.current) {
          item.current.removeEventListener('keydown', handleKeyDown)
        }
      })
    }
  }, [items, activeIndex, onActiveIndexChange, orientation])
}

/**
 * Utility function to move focus to an element with announcement
 * @param element - Element to focus
 * @param announcement - Optional announcement to make
 */
export function focusElement(element: HTMLElement | null, announcement?: string): void {
  if (!element) return

  element.focus()

  if (announcement && typeof window !== 'undefined') {
    // Import announce function to avoid circular dependency
    import('./announce').then(({ announce }) => {
      announce(announcement)
    })
  }
}

/**
 * Utility to check if an element is focusable
 * @param element - Element to check
 * @returns Whether the element is focusable
 */
export function isFocusable(element: Element): boolean {
  const htmlElement = element as HTMLElement
  
  // Check if element matches focusable selector
  if (!element.matches(FOCUSABLE_SELECTOR)) return false
  
  // Check if element is visible
  if (htmlElement.offsetWidth === 0 && htmlElement.offsetHeight === 0) return false
  
  // Check if element is disabled
  if ('disabled' in htmlElement && htmlElement.disabled) return false
  
  // Check if element has negative tabindex
  if (htmlElement.tabIndex < 0) return false
  
  return true
}