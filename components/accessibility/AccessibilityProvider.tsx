'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAccessibilityPreferences, initializeHighContrastMode } from '@/lib/accessibility/high-contrast'
import { screenReaderAnnouncer } from '@/lib/accessibility/announce'

/**
 * Accessibility context and provider for managing accessibility features
 */

export interface AccessibilityContextType {
  /**
   * Whether high contrast mode is enabled
   */
  isHighContrast: boolean
  
  /**
   * Whether reduced motion is preferred
   */
  prefersReducedMotion: boolean
  
  /**
   * Whether forced colors are active (Windows High Contrast)
   */
  isForcedColors: boolean
  
  /**
   * Whether large text is preferred
   */
  prefersLargeText: boolean
  
  /**
   * Current font size scale
   */
  fontScale: number
  
  /**
   * Toggle high contrast mode
   */
  toggleHighContrast: () => void
  
  /**
   * Set font scale
   */
  setFontScale: (scale: number) => void
  
  /**
   * Announce message to screen readers
   */
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  
  /**
   * Whether accessibility features are initialized
   */
  initialized: boolean
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

export interface AccessibilityProviderProps {
  children: React.ReactNode
  
  /**
   * Initial font scale (1.0 = normal, 1.2 = 20% larger, etc.)
   */
  initialFontScale?: number
  
  /**
   * Whether to auto-initialize accessibility features
   */
  autoInitialize?: boolean
  
  /**
   * Custom accessibility settings
   */
  settings?: {
    enableHighContrast?: boolean
    enableReducedMotion?: boolean
    enableLargeText?: boolean
  }
}

export function AccessibilityProvider({
  children,
  initialFontScale = 1.0,
  autoInitialize = true,
  settings = {}
}: AccessibilityProviderProps): React.JSX.Element {
  const { preferences, toggleHighContrast, isHighContrast, isForcedColors, prefersReducedMotion } = useAccessibilityPreferences()
  const [fontScale, setFontScaleState] = useState(initialFontScale)
  const [prefersLargeText, setPrefersLargeText] = useState(false)
  const [initialized, setInitialized] = useState(false)
  
  // Initialize accessibility features
  useEffect(() => {
    if (autoInitialize && typeof window !== 'undefined') {
      // Initialize high contrast mode
      initializeHighContrastMode()
      
      // Check for stored font scale preference
      const storedFontScale = localStorage.getItem('accessibility-font-scale')
      if (storedFontScale) {
        const scale = parseFloat(storedFontScale)
        if (!isNaN(scale) && scale >= 0.8 && scale <= 2.0) {
          setFontScaleState(scale)
        }
      }
      
      // Check for large text preference
      const storedLargeText = localStorage.getItem('accessibility-large-text')
      if (storedLargeText === 'true') {
        setPrefersLargeText(true)
      }
      
      setInitialized(true)
    }
  }, [autoInitialize])
  
  // Apply font scale to document
  useEffect(() => {
    if (typeof document !== 'undefined' && initialized) {
      document.documentElement.style.setProperty('--accessibility-font-scale', fontScale.toString())
      
      // Store preference
      localStorage.setItem('accessibility-font-scale', fontScale.toString())
    }
  }, [fontScale, initialized])
  
  // Apply large text preference
  useEffect(() => {
    if (typeof document !== 'undefined' && initialized) {
      if (prefersLargeText) {
        document.documentElement.classList.add('large-text')
      } else {
        document.documentElement.classList.remove('large-text')
      }
      
      // Store preference
      localStorage.setItem('accessibility-large-text', prefersLargeText.toString())
    }
  }, [prefersLargeText, initialized])
  
  // Set font scale with validation
  const setFontScale = (scale: number): void => {
    // Clamp between 0.8x and 2.0x
    const clampedScale = Math.max(0.8, Math.min(2.0, scale))
    setFontScaleState(clampedScale)
    
    // Update large text preference based on scale
    setPrefersLargeText(clampedScale >= 1.2)
  }
  
  // Announce function
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
    screenReaderAnnouncer.announce(message, priority)
  }
  
  // Apply accessibility classes to document
  useEffect(() => {
    if (typeof document !== 'undefined' && initialized) {
      const root = document.documentElement
      
      // Apply reduced motion
      if (prefersReducedMotion || settings.enableReducedMotion) {
        root.classList.add('reduce-motion')
      } else {
        root.classList.remove('reduce-motion')
      }
      
      // Apply accessibility attributes
      root.setAttribute('data-accessibility-initialized', 'true')
      root.setAttribute('data-high-contrast', isHighContrast.toString())
      root.setAttribute('data-reduced-motion', prefersReducedMotion.toString())
      root.setAttribute('data-forced-colors', isForcedColors.toString())
      root.setAttribute('data-large-text', prefersLargeText.toString())
    }
  }, [initialized, isHighContrast, prefersReducedMotion, isForcedColors, prefersLargeText, settings])
  
  const contextValue: AccessibilityContextType = {
    isHighContrast,
    prefersReducedMotion,
    isForcedColors,
    prefersLargeText,
    fontScale,
    toggleHighContrast,
    setFontScale,
    announce,
    initialized
  }
  
  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  )
}

/**
 * Hook for using accessibility context
 */
export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext)
  
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  
  return context
}

/**
 * HOC for components that need accessibility features
 */
export function withAccessibility<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const WrappedComponent = (props: P): void => {
    const accessibility = useAccessibility()
    
    return <Component {...props} accessibility={accessibility} />
  }
  
  WrappedComponent.displayName = `withAccessibility(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Accessibility settings panel component
 */
export interface AccessibilitySettingsProps {
  className?: string
  onClose?: () => void
}

export function AccessibilitySettings({ className, onClose }: AccessibilitySettingsProps): React.JSX.Element {
  const {
    isHighContrast,
    prefersReducedMotion,
    prefersLargeText,
    fontScale,
    toggleHighContrast,
    setFontScale,
    announce
  } = useAccessibility()
  
  const handleFontScaleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newScale = parseFloat(event.target.value)
    setFontScale(newScale)
    announce(`Font size changed to ${Math.round(newScale * 100)}%`, 'polite')
  }
  
  const handleHighContrastToggle = (): void => {
    toggleHighContrast()
    announce(
      isHighContrast ? 'High contrast mode disabled' : 'High contrast mode enabled',
      'polite'
    )
  }
  
  return (
    <div className={`accessibility-settings ${className || ''}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Accessibility Settings
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
              aria-label="Close accessibility settings"
            >
              ×
            </button>
          )}
        </div>
        
        {/* High Contrast Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="high-contrast-toggle" className="text-sm font-medium text-gray-700">
              High Contrast Mode
            </label>
            <p className="text-sm text-gray-500">
              Increases color contrast for better visibility
            </p>
          </div>
          <button
            id="high-contrast-toggle"
            onClick={handleHighContrastToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isHighContrast ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={isHighContrast}
            aria-label="Toggle high contrast mode"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isHighContrast ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {/* Font Size Control */}
        <div>
          <label htmlFor="font-scale-slider" className="block text-sm font-medium text-gray-700 mb-2">
            Font Size: {Math.round(fontScale * 100)}%
          </label>
          <input
            id="font-scale-slider"
            type="range"
            min="0.8"
            max="2.0"
            step="0.1"
            value={fontScale}
            onChange={handleFontScaleChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Adjust font size"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>80%</span>
            <span>100%</span>
            <span>200%</span>
          </div>
        </div>
        
        {/* System Preferences Display */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            System Preferences
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Reduced Motion:</span>
              <span>{prefersReducedMotion ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between">
              <span>Large Text:</span>
              <span>{prefersLargeText ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Keyboard Navigation
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Tab</kbd> to navigate between elements</p>
            <p>• Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> or <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Space</kbd> to activate buttons</p>
            <p>• Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> to close dialogs</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Accessibility floating button component
 */
export interface AccessibilityButtonProps {
  className?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

export function AccessibilityButton({ 
  className, 
  position = 'bottom-right' 
}: AccessibilityButtonProps): React.JSX.Element {
  const [showSettings, setShowSettings] = useState(false)
  const { announce } = useAccessibility()
  
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  }
  
  const toggleSettings = (): void => {
    setShowSettings(prev => {
      const newState = !prev
      announce(
        newState ? 'Accessibility settings opened' : 'Accessibility settings closed',
        'polite'
      )
      return newState
    })
  }
  
  return (
    <>
      <button
        onClick={toggleSettings}
        className={`fixed z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${positionClasses[position]} ${className || ''}`}
        aria-label="Open accessibility settings"
        title="Accessibility Settings"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
          />
        </svg>
      </button>
      
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <AccessibilitySettings
            className="w-full max-w-md"
            onClose={(): void => setShowSettings(false)}
          />
        </div>
      )}
    </>
  )
}