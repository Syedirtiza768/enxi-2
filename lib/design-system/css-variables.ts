import { designTokens } from './tokens'

// Helper function to create CSS variable name
const cssVar = (name: string) => `--${name}`

// Generate CSS variables from design tokens
export const generateCSSVariables = (theme: 'light' | 'dark') => {
  const isDark = theme === 'dark'
  
  const cssVariables: Record<string, string> = {}

  // Colors - Light theme uses normal scale, dark theme inverts some values
  Object.entries(designTokens.color).forEach(([category, shades]) => {
    Object.entries(shades).forEach(([shade, value]) => {
      if (typeof value === 'string') {
        cssVariables[cssVar(`color-${category}-${shade}`)] = value
      } else {
        Object.entries(value).forEach(([subShade, subValue]) => {
          cssVariables[cssVar(`color-${category}-${shade}-${subShade}`)] = subValue
        })
      }
    })
  })

  // Background and foreground colors for themes
  if (isDark) {
    // Dark theme overrides
    cssVariables[cssVar('bg-primary')] = designTokens.color.neutral[950]
    cssVariables[cssVar('bg-secondary')] = designTokens.color.neutral[900]
    cssVariables[cssVar('bg-tertiary')] = designTokens.color.neutral[800]
    cssVariables[cssVar('bg-elevated')] = designTokens.color.neutral[800]
    cssVariables[cssVar('bg-muted')] = designTokens.color.neutral[700]
    
    cssVariables[cssVar('text-primary')] = designTokens.color.neutral[50]
    cssVariables[cssVar('text-secondary')] = designTokens.color.neutral[200]
    cssVariables[cssVar('text-tertiary')] = designTokens.color.neutral[400]
    cssVariables[cssVar('text-muted')] = designTokens.color.neutral[500]
    
    cssVariables[cssVar('border-primary')] = designTokens.color.neutral[700]
    cssVariables[cssVar('border-secondary')] = designTokens.color.neutral[600]
    cssVariables[cssVar('border-tertiary')] = designTokens.color.neutral[500]
  } else {
    // Light theme
    cssVariables[cssVar('bg-primary')] = '#ffffff'
    cssVariables[cssVar('bg-secondary')] = designTokens.color.neutral[50]
    cssVariables[cssVar('bg-tertiary')] = designTokens.color.neutral[100]
    cssVariables[cssVar('bg-elevated')] = '#ffffff'
    cssVariables[cssVar('bg-muted')] = designTokens.color.neutral[200]
    
    cssVariables[cssVar('text-primary')] = designTokens.color.neutral[900]
    cssVariables[cssVar('text-secondary')] = designTokens.color.neutral[700]
    cssVariables[cssVar('text-tertiary')] = designTokens.color.neutral[500]
    cssVariables[cssVar('text-muted')] = designTokens.color.neutral[400]
    
    cssVariables[cssVar('border-primary')] = designTokens.color.neutral[200]
    cssVariables[cssVar('border-secondary')] = designTokens.color.neutral[300]
    cssVariables[cssVar('border-tertiary')] = designTokens.color.neutral[400]
  }

  // Spacing
  Object.entries(designTokens.spacing).forEach(([key, value]) => {
    cssVariables[cssVar(`spacing-${key}`)] = value
  })

  // Typography
  cssVariables[cssVar('font-sans')] = designTokens.typography.fontFamily.sans
  cssVariables[cssVar('font-mono')] = designTokens.typography.fontFamily.mono

  Object.entries(designTokens.typography.fontSize).forEach(([key, value]) => {
    cssVariables[cssVar(`font-size-${key}`)] = value.size
    cssVariables[cssVar(`line-height-${key}`)] = value.lineHeight
    cssVariables[cssVar(`letter-spacing-${key}`)] = value.letterSpacing
  })

  Object.entries(designTokens.typography.fontWeight).forEach(([key, value]) => {
    cssVariables[cssVar(`font-weight-${key}`)] = value
  })

  // Border radius
  Object.entries(designTokens.borderRadius).forEach(([key, value]) => {
    cssVariables[cssVar(`radius-${key}`)] = value
  })

  // Shadows - adjust for dark theme
  Object.entries(designTokens.shadow).forEach(([key, value]) => {
    if (isDark && value !== 'none' && !value.includes('inset')) {
      // Reduce shadow opacity for dark theme
      cssVariables[cssVar(`shadow-${key}`)] = value.replace(/rgb\(0 0 0 \/ ([\d.]+)\)/g, (match, opacity) => {
        const newOpacity = parseFloat(opacity) * 0.7
        return `rgb(0 0 0 / ${newOpacity})`
      })
    } else {
      cssVariables[cssVar(`shadow-${key}`)] = value
    }
  })

  // Z-index
  Object.entries(designTokens.zIndex).forEach(([key, value]) => {
    cssVariables[cssVar(`z-${key}`)] = String(value)
  })

  // Transitions
  Object.entries(designTokens.transition).forEach(([key, value]) => {
    cssVariables[cssVar(`transition-${key}`)] = value
  })

  // Blur
  Object.entries(designTokens.blur).forEach(([key, value]) => {
    cssVariables[cssVar(`blur-${key}`)] = value
  })

  return cssVariables
}

// Generate CSS string
export const generateCSSString = (theme: 'light' | 'dark') => {
  const variables = generateCSSVariables(theme)
  const cssString = Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')

  return `:root.${theme} {\n${cssString}\n}`
}

// Generate complete CSS with both themes
export const generateThemeCSS = () => {
  const lightCSS = generateCSSString('light')
  const darkCSS = generateCSSString('dark')
  
  return `/* Auto-generated theme CSS - DO NOT EDIT DIRECTLY */\n\n${lightCSS}\n\n${darkCSS}`
}