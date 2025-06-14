/**
 * Accessibility utilities and components index
 * Central export point for all accessibility features
 */

// Announcement utilities
export {
  screenReaderAnnouncer,
  useScreenReaderAnnouncements,
  announce
} from './announce'

// Focus management
export {
  getFocusableElements,
  getFocusBoundaries,
  useFocusTrap,
  useFocusOnMount,
  useFocusRestore,
  useRovingTabIndex,
  focusElement,
  isFocusable
} from './focus-management'

// Keyboard navigation
export {
  KEYBOARD_KEYS,
  useKeyboardShortcuts,
  useEscapeKey,
  useArrowNavigation,
  useDropdownNavigation,
  useTableNavigation,
  useFormNavigation,
  useModalNavigation,
  useButtonAccessibility,
  createKeyboardHandler
} from './keyboard-navigation'

// ARIA utilities
export {
  useFormFieldAria,
  generateButtonAria,
  generateTabAria,
  generateTabPanelAria,
  generateTableAria,
  generateTableHeaderAria,
  generateTableCellAria,
  generateMenuAria,
  generateMenuItemAria,
  generateListboxAria,
  generateOptionAria,
  generateDisclosureAria,
  generateDialogAria,
  generateProgressAria,
  generateStatusAria,
  cleanAriaProps,
  validateAriaProps
} from './aria-utils'

// Color contrast
export {
  WCAG_CONTRAST_RATIOS,
  hexToRgb,
  rgbToHex,
  parseRgb,
  getRelativeLuminance,
  getContrastRatio,
  checkContrastRatio,
  checkContrast,
  getCompliantColor,
  generateAccessiblePalette,
  getCSSColor,
  validateThemeContrast,
  useContrastValidation,
  COMMON_COLOR_COMBINATIONS
} from './color-contrast'

// High contrast and theming
export {
  prefersHighContrast,
  prefersReducedMotion,
  hasForcedColors,
  getAccessibilityPreferences,
  applyHighContrastTheme,
  removeHighContrastTheme,
  toggleHighContrastMode,
  initializeHighContrastMode,
  useAccessibilityPreferences,
  accessibilityClasses,
  generateAccessibilityClasses,
  DEFAULT_HIGH_CONTRAST_COLORS,
  DARK_HIGH_CONTRAST_COLORS
} from './high-contrast'

// Testing utilities
export {
  runAccessibilityTests,
  generateAccessibilityReport,
  quickAccessibilityCheck
} from './testing'

// Type exports
export type {
  AnnouncementPriority,
  KeyboardEventHandler,
  AriaLive,
  AriaExpanded,
  AriaPressed,
  AriaSort,
  AriaCurrent,
  FormFieldAriaProps,
  ButtonAriaProps,
  TabAriaProps,
  TabPanelAriaProps,
  TableAriaProps,
  TableHeaderAriaProps,
  TableCellAriaProps,
  MenuAriaProps,
  MenuItemAriaProps,
  ListboxAriaProps,
  OptionAriaProps,
  DisclosureAriaProps,
  DialogAriaProps,
  ProgressAriaProps,
  StatusAriaProps,
  ColorFormat,
  RGBColor,
  HSLColor,
  ContrastResult,
  HighContrastPreference,
  ThemeMode,
  AccessibilityPreferences,
  HighContrastColors,
  ViolationType,
  ViolationSeverity,
  AccessibilityViolation,
  AccessibilityTestResult,
  TestConfig
} from './announce'

/**
 * Complete accessibility setup function
 * Call this once in your app to initialize all accessibility features
 */
export function setupAccessibility(options: {
  /**
   * Whether to initialize high contrast mode
   */
  enableHighContrast?: boolean
  
  /**
   * Whether to enable reduced motion support
   */
  enableReducedMotion?: boolean
  
  /**
   * Whether to show accessibility floating button
   */
  showAccessibilityButton?: boolean
  
  /**
   * Custom keyboard shortcuts
   */
  keyboardShortcuts?: Record<string, () => void>
  
  /**
   * Custom high contrast colors
   */
  highContrastColors?: any
} = {}) {
  const {
    enableHighContrast = true,
    enableReducedMotion = true,
    showAccessibilityButton = false,
    keyboardShortcuts = {},
    highContrastColors
  } = options
  
  if (typeof window === 'undefined') return
  
  // Initialize high contrast mode
  if (enableHighContrast) {
    if (highContrastColors) {
      import('./high-contrast').then(({ applyHighContrastTheme }) => {
        applyHighContrastTheme(highContrastColors)
      })
    } else {
      import('./high-contrast').then(({ initializeHighContrastMode }) => {
        initializeHighContrastMode()
      })
    }
  }
  
  // Set up reduced motion
  if (enableReducedMotion) {
    import('./high-contrast').then(({ prefersReducedMotion }) => {
      if (prefersReducedMotion()) {
        document.documentElement.classList.add('reduce-motion')
      }
    })
  }
  
  // Add keyboard shortcuts
  if (Object.keys(keyboardShortcuts).length > 0) {
    import('./keyboard-navigation').then(({ useKeyboardShortcuts }) => {
      // Note: This would need to be used within a React component
      console.warn('Keyboard shortcuts setup requires React context. Use useKeyboardShortcuts hook in a component.')
    })
  }
  
  // Add accessibility floating button
  if (showAccessibilityButton) {
    import('../components/accessibility/AccessibilityProvider').then(({ AccessibilityButton }) => {
      // Note: This would need to be rendered in React
      console.warn('Accessibility button requires React rendering. Use AccessibilityButton component.')
    })
  }
  
  // Add global accessibility CSS
  const style = document.createElement('style')
  style.textContent = `
    /* Screen reader only class */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    
    /* High contrast mode styles */
    .high-contrast {
      --tw-ring-color: var(--hc-accent);
    }
    
    .high-contrast * {
      transition: none !important;
      animation: none !important;
    }
    
    .high-contrast button {
      border: 2px solid var(--hc-border) !important;
    }
    
    .high-contrast input, .high-contrast select, .high-contrast textarea {
      border: 2px solid var(--hc-border) !important;
      background: var(--hc-bg) !important;
      color: var(--hc-fg) !important;
    }
    
    .high-contrast a {
      color: var(--hc-link) !important;
      text-decoration: underline !important;
    }
    
    .high-contrast a:visited {
      color: var(--hc-link-visited) !important;
    }
    
    .high-contrast a:focus, .high-contrast button:focus, .high-contrast input:focus, .high-contrast select:focus, .high-contrast textarea:focus {
      outline: 3px solid var(--hc-accent) !important;
      outline-offset: 2px !important;
    }
    
    /* Reduced motion styles */
    .reduce-motion *, .reduce-motion *::before, .reduce-motion *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
    
    /* Forced colors mode support */
    @media (forced-colors: active) {
      .forced-colors-border {
        border: 1px solid !important;
      }
      
      .forced-colors-bg {
        background: ButtonFace !important;
        color: ButtonText !important;
      }
      
      .forced-colors-link {
        color: LinkText !important;
      }
      
      .forced-colors-focus {
        outline: 2px solid Highlight !important;
      }
    }
    
    /* Large text support */
    .large-text {
      font-size: calc(1rem * var(--accessibility-font-scale, 1));
    }
    
    .large-text h1 { font-size: calc(2.25rem * var(--accessibility-font-scale, 1)); }
    .large-text h2 { font-size: calc(1.875rem * var(--accessibility-font-scale, 1)); }
    .large-text h3 { font-size: calc(1.5rem * var(--accessibility-font-scale, 1)); }
    .large-text h4 { font-size: calc(1.25rem * var(--accessibility-font-scale, 1)); }
    .large-text h5 { font-size: calc(1.125rem * var(--accessibility-font-scale, 1)); }
    .large-text h6 { font-size: calc(1rem * var(--accessibility-font-scale, 1)); }
    
    /* Focus visible polyfill */
    [data-focus-visible-added] {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }
    
    /* Skip link styles */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 1000;
      border-radius: 4px;
    }
    
    .skip-link:focus {
      top: 6px;
    }
  `
  
  document.head.appendChild(style)
  
  console.log('Accessibility features initialized')
}

/**
 * Quick accessibility audit function
 */
export async function auditAccessibility(element?: Element): Promise<void> {
  const { runAccessibilityTests, generateAccessibilityReport } = await import('./testing')
  
  const results = runAccessibilityTests(element)
  const report = generateAccessibilityReport(results)
  
  console.group('Accessibility Audit Results')
  console.log(report)
  
  if (!results.passed) {
    console.warn(`Found ${results.violations.length} accessibility issues`)
    results.violations.forEach((violation, index) => {
      console.warn(`${index + 1}. ${violation.message}`, violation.element)
    })
  } else {
    console.log('✅ No accessibility violations found!')
  }
  
  console.groupEnd()
  
  return results
}