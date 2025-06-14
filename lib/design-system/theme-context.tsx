'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { designTokens } from './tokens'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'enxi-theme'
}: ThemeProviderProps): React.JSX.Element {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Resolve the actual theme based on user preference
  const resolveTheme = useCallback((theme: Theme): 'light' | 'dark' => {
    if (theme === 'system') {
      return getSystemTheme()
    }
    return theme
  }, [])

  // Apply theme to document
  const applyTheme = (resolvedTheme: 'light' | 'dark'): void => {
    const root = document.documentElement
    
    // Remove old theme
    root.classList.remove('light', 'dark')
    
    // Add new theme
    root.classList.add(resolvedTheme)
    
    // Set color-scheme for native elements
    root.style.colorScheme = resolvedTheme
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedTheme === 'dark' 
          ? designTokens.color.neutral[900]
          : designTokens.color.neutral[50]
      )
    }
  }

  // Initialize theme from storage
  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme | null
    if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
      setThemeState(storedTheme)
    }
  }, [storageKey])

  // Apply theme changes
  useEffect(() => {
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
    
    // Store preference
    localStorage.setItem(storageKey, theme)
  }, [theme, storageKey, resolveTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (): void => {
      const resolved = resolveTheme('system')
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }

    // Safari < 14 compatibility
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return (): void => mediaQuery.removeEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange)
      return (): void => mediaQuery.removeListener(handleChange)
    }
  }, [theme, resolveTheme])

  const setTheme = (newTheme: Theme): void => {
    setThemeState(newTheme)
  }

  const toggleTheme = (): void => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}