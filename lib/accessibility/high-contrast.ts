/**
 * High contrast mode utilities and theme support
 * Provides utilities for high contrast mode detection and theme management
 */

/**
 * High contrast preference types
 */
export type HighContrastPreference = 'no-preference' | 'high' | 'forced'

/**
 * Theme mode types
 */
export type ThemeMode = 'light' | 'dark' | 'auto' | 'high-contrast'

/**
 * Accessibility preference interface
 */
export interface AccessibilityPreferences {
  highContrast: HighContrastPreference
  reducedMotion: boolean
  forcedColors: boolean
  largeText: boolean
  theme: ThemeMode
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): HighContrastPreference {
  if (typeof window === 'undefined') return 'no-preference'
  
  // Check for forced colors (Windows High Contrast Mode)
  if (window.matchMedia('(forced-colors: active)').matches) {
    return 'forced'
  }
  
  // Check for prefers-contrast media query
  if (window.matchMedia('(prefers-contrast: high)').matches) {
    return 'high'
  }
  
  return 'no-preference'
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check if forced colors are active (Windows High Contrast Mode)
 */
export function hasForcedColors(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(forced-colors: active)').matches
}

/**
 * Get user's accessibility preferences
 */
export function getAccessibilityPreferences(): AccessibilityPreferences {
  return {
    highContrast: prefersHighContrast(),
    reducedMotion: prefersReducedMotion(),
    forcedColors: hasForcedColors(),
    largeText: false, // TODO: Detect large text preference
    theme: 'auto' // Default theme
  }
}

/**
 * High contrast color scheme
 */
export interface HighContrastColors {
  background: string
  foreground: string
  accent: string
  accent2: string
  border: string
  link: string
  linkVisited: string
  buttonText: string
  buttonBackground: string
  disabled: string
  highlight: string
  highlightText: string
  error: string
  success: string
  warning: string
  info: string
}

/**
 * Default high contrast color scheme
 */
export const DEFAULT_HIGH_CONTRAST_COLORS: HighContrastColors = {
  background: '#ffffff',
  foreground: '#000000',
  accent: '#0066cc',
  accent2: '#cc6600',
  border: '#767676',
  link: '#0066cc',
  linkVisited: '#800080',
  buttonText: '#ffffff',
  buttonBackground: '#000000',
  disabled: '#767676',
  highlight: '#0066cc',
  highlightText: '#ffffff',
  error: '#d32f2f',
  success: '#2e7d32',
  warning: '#f57c00',
  info: '#1976d2'
}

/**
 * Dark high contrast color scheme
 */
export const DARK_HIGH_CONTRAST_COLORS: HighContrastColors = {
  background: '#000000',
  foreground: '#ffffff',
  accent: '#66b3ff',
  accent2: '#ffb366',
  border: '#808080',
  link: '#66b3ff',
  linkVisited: '#b366ff',
  buttonText: '#000000',
  buttonBackground: '#ffffff',
  disabled: '#808080',
  highlight: '#66b3ff',
  highlightText: '#000000',
  error: '#ff6b6b',
  success: '#4caf50',
  warning: '#ff9800',
  info: '#2196f3'
}

/**
 * Apply high contrast theme
 */
export function applyHighContrastTheme(colors: HighContrastColors = DEFAULT_HIGH_CONTRAST_COLORS): void {
  if (typeof document === 'undefined') return
  
  const root = document.documentElement
  
  // Apply CSS custom properties
  root.style.setProperty('--hc-bg', colors.background)
  root.style.setProperty('--hc-fg', colors.foreground)
  root.style.setProperty('--hc-accent', colors.accent)
  root.style.setProperty('--hc-accent2', colors.accent2)
  root.style.setProperty('--hc-border', colors.border)
  root.style.setProperty('--hc-link', colors.link)
  root.style.setProperty('--hc-link-visited', colors.linkVisited)
  root.style.setProperty('--hc-button-text', colors.buttonText)
  root.style.setProperty('--hc-button-bg', colors.buttonBackground)
  root.style.setProperty('--hc-disabled', colors.disabled)
  root.style.setProperty('--hc-highlight', colors.highlight)
  root.style.setProperty('--hc-highlight-text', colors.highlightText)
  root.style.setProperty('--hc-error', colors.error)
  root.style.setProperty('--hc-success', colors.success)
  root.style.setProperty('--hc-warning', colors.warning)
  root.style.setProperty('--hc-info', colors.info)
  
  // Add high contrast class
  root.classList.add('high-contrast')
}

/**
 * Remove high contrast theme
 */
export function removeHighContrastTheme(): void {
  if (typeof document === 'undefined') return
  
  const root = document.documentElement
  
  // Remove CSS custom properties
  const properties = [
    '--hc-bg', '--hc-fg', '--hc-accent', '--hc-accent2', '--hc-border',
    '--hc-link', '--hc-link-visited', '--hc-button-text', '--hc-button-bg',
    '--hc-disabled', '--hc-highlight', '--hc-highlight-text',
    '--hc-error', '--hc-success', '--hc-warning', '--hc-info'
  ]
  
  properties.forEach(prop => {
    root.style.removeProperty(prop)
  })
  
  // Remove high contrast class
  root.classList.remove('high-contrast')
}

/**
 * Toggle high contrast mode
 */
export function toggleHighContrastMode(): void {
  if (typeof document === 'undefined') return
  
  const root = document.documentElement
  const isHighContrast = root.classList.contains('high-contrast')
  
  if (isHighContrast) {
    removeHighContrastTheme()
  } else {
    // Determine which high contrast theme to use
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const colors = prefersDark ? DARK_HIGH_CONTRAST_COLORS : DEFAULT_HIGH_CONTRAST_COLORS
    applyHighContrastTheme(colors)
  }
  
  // Store preference
  localStorage.setItem('high-contrast', (!isHighContrast).toString())
}

/**
 * Initialize high contrast mode based on user preference
 */
export function initializeHighContrastMode(): void {
  if (typeof window === 'undefined') return
  
  // Check stored preference
  const storedPreference = localStorage.getItem('high-contrast')
  const userPreference = prefersHighContrast()
  
  // Apply high contrast if:
  // 1. User explicitly enabled it
  // 2. System has forced colors active
  // 3. User prefers high contrast and hasn't disabled it
  const shouldApplyHighContrast = 
    storedPreference === 'true' ||
    userPreference === 'forced' ||
    (userPreference === 'high' && storedPreference !== 'false')
  
  if (shouldApplyHighContrast) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const colors = prefersDark ? DARK_HIGH_CONTRAST_COLORS : DEFAULT_HIGH_CONTRAST_COLORS
    applyHighContrastTheme(colors)
  }
  
  // Listen for forced colors changes
  const forcedColorsQuery = window.matchMedia('(forced-colors: active)')
  forcedColorsQuery.addEventListener('change', (e) => {
    if (e.matches) {
      applyHighContrastTheme()
    } else if (localStorage.getItem('high-contrast') !== 'true') {
      removeHighContrastTheme()
    }
  })
  
  // Listen for color scheme changes
  const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
  colorSchemeQuery.addEventListener('change', () => {
    if (document.documentElement.classList.contains('high-contrast')) {
      const colors = colorSchemeQuery.matches ? DARK_HIGH_CONTRAST_COLORS : DEFAULT_HIGH_CONTRAST_COLORS
      applyHighContrastTheme(colors)
    }
  })
}

/**
 * Hook for using accessibility preferences
 */
export function useAccessibilityPreferences() {
  const [preferences, setPreferences] = React.useState<AccessibilityPreferences>(() => 
    getAccessibilityPreferences()
  )
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    
    const updatePreferences = () => {
      setPreferences(getAccessibilityPreferences())
    }
    
    // Listen for media query changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    const forcedColorsQuery = window.matchMedia('(forced-colors: active)')
    
    reducedMotionQuery.addEventListener('change', updatePreferences)
    highContrastQuery.addEventListener('change', updatePreferences)
    forcedColorsQuery.addEventListener('change', updatePreferences)
    
    return () => {
      reducedMotionQuery.removeEventListener('change', updatePreferences)
      highContrastQuery.removeEventListener('change', updatePreferences)
      forcedColorsQuery.removeEventListener('change', updatePreferences)
    }
  }, [])
  
  const toggleHighContrast = React.useCallback(() => {
    toggleHighContrastMode()
    setPreferences(prev => ({
      ...prev,
      highContrast: document.documentElement.classList.contains('high-contrast') ? 'high' : 'no-preference'
    }))
  }, [])
  
  return {
    preferences,
    toggleHighContrast,
    isHighContrast: preferences.highContrast !== 'no-preference',
    isForcedColors: preferences.forcedColors,
    prefersReducedMotion: preferences.reducedMotion
  }
}

/**
 * CSS class utilities for accessibility
 */
export const accessibilityClasses = {
  /**
   * Hide element visually but keep it accessible to screen readers
   */
  srOnly: 'sr-only',
  
  /**
   * Hide element from screen readers but keep it visible
   */
  ariaHidden: '[aria-hidden="true"]',
  
  /**
   * High contrast mode specific styles
   */
  highContrast: {
    border: 'high-contrast:border-2 high-contrast:border-[--hc-border]',
    background: 'high-contrast:bg-[--hc-bg]',
    text: 'high-contrast:text-[--hc-fg]',
    link: 'high-contrast:text-[--hc-link] high-contrast:visited:text-[--hc-link-visited]',
    button: 'high-contrast:bg-[--hc-button-bg] high-contrast:text-[--hc-button-text] high-contrast:border-[--hc-border]',
    focus: 'high-contrast:focus:outline-2 high-contrast:focus:outline-[--hc-accent]',
    disabled: 'high-contrast:disabled:text-[--hc-disabled] high-contrast:disabled:border-[--hc-disabled]'
  },
  
  /**
   * Reduced motion specific styles
   */
  reducedMotion: {
    noAnimation: 'motion-reduce:animate-none',
    noTransition: 'motion-reduce:transition-none',
    noTransform: 'motion-reduce:transform-none'
  }
}

/**
 * Generate accessibility-aware CSS classes
 */
export function generateAccessibilityClasses(options: {
  highContrast?: boolean
  reducedMotion?: boolean
  focusVisible?: boolean
} = {}): string {
  const classes: string[] = []
  
  if (options.highContrast) {
    classes.push(
      accessibilityClasses.highContrast.background,
      accessibilityClasses.highContrast.text,
      accessibilityClasses.highContrast.border
    )
  }
  
  if (options.reducedMotion) {
    classes.push(
      accessibilityClasses.reducedMotion.noAnimation,
      accessibilityClasses.reducedMotion.noTransition
    )
  }
  
  if (options.focusVisible) {
    classes.push(accessibilityClasses.highContrast.focus)
  }
  
  return classes.join(' ')
}

// Import React for hooks (only if in React environment)
let React: any
try {
  React = require('react')
} catch {
  // React not available, hooks won't work but utility functions will
}