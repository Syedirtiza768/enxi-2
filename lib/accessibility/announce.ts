/**
 * Screen reader announcement utilities
 * Provides accessible ways to announce dynamic content changes to assistive technologies
 */

export type AnnouncementPriority = 'polite' | 'assertive'

/**
 * Screen reader announcement service
 * Creates a centralized way to announce content changes to screen readers
 */
class ScreenReaderAnnouncer {
  private politeRegion: HTMLDivElement | null = null
  private assertiveRegion: HTMLDivElement | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize()
    }
  }

  private initialize() {
    // Create polite announcement region
    this.politeRegion = document.createElement('div')
    this.politeRegion.setAttribute('aria-live', 'polite')
    this.politeRegion.setAttribute('aria-atomic', 'true')
    this.politeRegion.setAttribute('aria-relevant', 'all')
    this.politeRegion.className = 'sr-only'
    this.politeRegion.id = 'polite-announcer'
    document.body.appendChild(this.politeRegion)

    // Create assertive announcement region
    this.assertiveRegion = document.createElement('div')
    this.assertiveRegion.setAttribute('aria-live', 'assertive')
    this.assertiveRegion.setAttribute('aria-atomic', 'true')
    this.assertiveRegion.setAttribute('aria-relevant', 'all')
    this.assertiveRegion.className = 'sr-only'
    this.assertiveRegion.id = 'assertive-announcer'
    document.body.appendChild(this.assertiveRegion)
  }

  /**
   * Announce a message to screen readers
   * @param message - The message to announce
   * @param priority - Whether to interrupt current announcements (assertive) or wait (polite)
   * @param delay - Optional delay before announcing (useful for preventing announcement spam)
   */
  announce(
    message: string, 
    priority: AnnouncementPriority = 'polite',
    delay: number = 0
  ): void {
    if (!message || typeof window === 'undefined') return

    const announcer = priority === 'assertive' ? this.assertiveRegion : this.politeRegion
    if (!announcer) return

    const doAnnounce = (): void => {
      // Clear the region first to ensure the announcement is triggered
      announcer.textContent = ''
      
      // Use a small timeout to ensure the clearing is processed
      setTimeout(() => {
        announcer.textContent = message
      }, 10)
    }

    if (delay > 0) {
      setTimeout(doAnnounce, delay)
    } else {
      doAnnounce()
    }
  }

  /**
   * Announce form validation errors
   * @param errors - Array of error messages
   * @param fieldName - Optional field name for context
   */
  announceErrors(errors: string[], fieldName?: string): void {
    if (errors.length === 0) return

    const message = fieldName 
      ? `${fieldName} has ${errors.length} error${errors.length > 1 ? 's' : ''}: ${errors.join(', ')}`
      : `Form has ${errors.length} error${errors.length > 1 ? 's' : ''}: ${errors.join(', ')}`

    this.announce(message, 'assertive')
  }

  /**
   * Announce successful actions
   * @param message - Success message
   */
  announceSuccess(message: string): void {
    this.announce(`Success: ${message}`, 'polite')
  }

  /**
   * Announce loading states
   * @param isLoading - Whether content is loading
   * @param message - Optional custom loading message
   */
  announceLoading(isLoading: boolean, message?: string): void {
    if (isLoading) {
      this.announce(message || 'Loading, please wait', 'polite')
    } else {
      this.announce('Loading complete', 'polite')
    }
  }

  /**
   * Announce navigation changes
   * @param location - New page or section name
   */
  announceNavigation(location: string): void {
    this.announce(`Navigated to ${location}`, 'polite')
  }

  /**
   * Clean up announcement regions
   */
  destroy(): void {
    if (this.politeRegion) {
      document.body.removeChild(this.politeRegion)
      this.politeRegion = null
    }
    if (this.assertiveRegion) {
      document.body.removeChild(this.assertiveRegion)
      this.assertiveRegion = null
    }
  }
}

// Create singleton instance
export const screenReaderAnnouncer = new ScreenReaderAnnouncer()

/**
 * Hook for using screen reader announcements
 */
export function useScreenReaderAnnouncements(): unknown {
  return {
    announce: screenReaderAnnouncer.announce.bind(screenReaderAnnouncer),
    announceErrors: screenReaderAnnouncer.announceErrors.bind(screenReaderAnnouncer),
    announceSuccess: screenReaderAnnouncer.announceSuccess.bind(screenReaderAnnouncer),
    announceLoading: screenReaderAnnouncer.announceLoading.bind(screenReaderAnnouncer),
    announceNavigation: screenReaderAnnouncer.announceNavigation.bind(screenReaderAnnouncer)
  }
}

/**
 * Utility function for immediate announcements
 * @param message - Message to announce
 * @param priority - Announcement priority
 */
export function announce(message: string, priority: AnnouncementPriority = 'polite'): void {
  screenReaderAnnouncer.announce(message, priority)
}