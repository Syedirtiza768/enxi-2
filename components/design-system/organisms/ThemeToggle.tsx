'use client'

import React from 'react'
import { useTheme, type Theme } from '@/lib/design-system/theme-context'
import { Button } from '../atoms/Button'
import { Sun, Moon, Monitor } from 'lucide-react'

export interface ThemeToggleProps {
  variant?: 'icon' | 'select' | 'dropdown'
  size?: 'sm' | 'md' | 'lg'
}

export function ThemeToggle({ variant = 'icon', size = 'md' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = React.useState(false)

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
        aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} theme`}
        className="rounded-full"
      >
        {resolvedTheme === 'light' ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </Button>
    )
  }

  if (variant === 'select') {
    return (
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className={`
          bg-[var(--bg-primary)] text-[var(--text-primary)]
          border border-[var(--border-primary)]
          rounded-[var(--radius-lg)]
          px-3 py-2
          text-sm
          focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary-500)]
          transition-all duration-[var(--transition-fast)]
        `}
        aria-label="Select theme"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    )
  }

  // Dropdown variant - state is now declared at top level

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ]

  const currentThemeData = themes.find(t => t.value === theme) || themes[2]

  return (
    <div className="relative">
      <Button
        variant="outline"
        size={size}
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[120px] justify-between"
        aria-label="Theme selector"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="flex items-center gap-2">
          <currentThemeData.icon className="h-4 w-4" />
          {currentThemeData.label}
        </span>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[var(--z-overlay)]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className={`
            absolute right-0 mt-2 w-[150px]
            bg-[var(--bg-elevated)] 
            border border-[var(--border-primary)]
            rounded-[var(--radius-lg)]
            shadow-[var(--shadow-lg)]
            z-[var(--z-dropdown)]
            animate-fade-in
          `}>
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value as Theme)
                  setIsOpen(false)
                }}
                className={`
                  w-full px-3 py-2
                  flex items-center gap-3
                  text-sm text-[var(--text-primary)]
                  hover:bg-[var(--bg-secondary)]
                  transition-colors duration-[var(--transition-fast)]
                  first:rounded-t-[calc(var(--radius-lg)-1px)]
                  last:rounded-b-[calc(var(--radius-lg)-1px)]
                  ${theme === themeOption.value ? 'bg-[var(--bg-secondary)]' : ''}
                `}
                role="menuitemradio"
                aria-checked={theme === themeOption.value}
              >
                <themeOption.icon className="h-4 w-4" />
                {themeOption.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}