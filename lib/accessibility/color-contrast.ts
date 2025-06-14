/**
 * Color contrast utilities for accessibility compliance
 * Provides WCAG 2.1 AA compliant color contrast validation and utilities
 */

/**
 * WCAG contrast ratio requirements
 */
export const WCAG_CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5
} as const

/**
 * Color format types
 */
export type ColorFormat = 'hex' | 'rgb' | 'hsl'

/**
 * RGB color representation
 */
export interface RGBColor {
  r: number
  g: number
  b: number
}

/**
 * HSL color representation
 */
export interface HSLColor {
  h: number
  s: number
  l: number
}

/**
 * Contrast check result
 */
export interface ContrastResult {
  ratio: number
  isAANormal: boolean
  isAALarge: boolean
  isAAANormal: boolean
  isAAALarge: boolean
  score: 'fail' | 'aa' | 'aaa'
}

/**
 * Convert hex color to RGB
 * @param hex - Hex color string (e.g., "#ff0000" or "ff0000")
 * @returns RGB color object
 */
export function hexToRgb(hex: string): RGBColor | null {
  const cleanHex = hex.replace('#', '')
  
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16)
    const g = parseInt(cleanHex[1] + cleanHex[1], 16)
    const b = parseInt(cleanHex[2] + cleanHex[2], 16)
    return { r, g, b }
  }
  
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substr(0, 2), 16)
    const g = parseInt(cleanHex.substr(2, 2), 16)
    const b = parseInt(cleanHex.substr(4, 2), 16)
    return { r, g, b }
  }
  
  return null
}

/**
 * Convert RGB color to hex
 * @param rgb - RGB color object
 * @returns Hex color string
 */
export function rgbToHex({ r, g, b }: RGBColor): string {
  const toHex = (n: number): void => {
    const hex = Math.round(n).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Parse RGB color string
 * @param rgb - RGB color string (e.g., "rgb(255, 0, 0)")
 * @returns RGB color object
 */
export function parseRgb(rgb: string): RGBColor | null {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return null
  
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10)
  }
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 specification
 * @param rgb - RGB color object
 * @returns Relative luminance value (0-1)
 */
export function getRelativeLuminance({ r, g, b }: RGBColor): number {
  const getRGB = (color: number): void => {
    const c = color / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  
  const rLum = getRGB(r)
  const gLum = getRGB(g)
  const bLum = getRGB(b)
  
  return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum
}

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.1 specification
 * @param color1 - First color (RGB)
 * @param color2 - Second color (RGB)
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: RGBColor, color2: RGBColor): number {
  const lum1 = getRelativeLuminance(color1)
  const lum2 = getRelativeLuminance(color2)
  
  const lightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (lightest + 0.05) / (darkest + 0.05)
}

/**
 * Check if contrast ratio meets WCAG requirements
 * @param ratio - Contrast ratio
 * @returns Contrast check result
 */
export function checkContrastRatio(ratio: number): ContrastResult {
  return {
    ratio,
    isAANormal: ratio >= WCAG_CONTRAST_RATIOS.AA_NORMAL,
    isAALarge: ratio >= WCAG_CONTRAST_RATIOS.AA_LARGE,
    isAAANormal: ratio >= WCAG_CONTRAST_RATIOS.AAA_NORMAL,
    isAAALarge: ratio >= WCAG_CONTRAST_RATIOS.AAA_LARGE,
    score: ratio >= WCAG_CONTRAST_RATIOS.AAA_NORMAL ? 'aaa' :
           ratio >= WCAG_CONTRAST_RATIOS.AA_NORMAL ? 'aa' : 'fail'
  }
}

/**
 * Check contrast between two colors
 * @param foreground - Foreground color (hex, rgb string, or RGB object)
 * @param background - Background color (hex, rgb string, or RGB object)
 * @returns Contrast check result or null if colors are invalid
 */
export function checkContrast(
  foreground: string | RGBColor,
  background: string | RGBColor
): ContrastResult | null {
  let fgRgb: RGBColor | null
  let bgRgb: RGBColor | null
  
  // Parse foreground color
  if (typeof foreground === 'string') {
    if (foreground.startsWith('#')) {
      fgRgb = hexToRgb(foreground)
    } else if (foreground.startsWith('rgb')) {
      fgRgb = parseRgb(foreground)
    } else {
      return null
    }
  } else {
    fgRgb = foreground
  }
  
  // Parse background color
  if (typeof background === 'string') {
    if (background.startsWith('#')) {
      bgRgb = hexToRgb(background)
    } else if (background.startsWith('rgb')) {
      bgRgb = parseRgb(background)
    } else {
      return null
    }
  } else {
    bgRgb = background
  }
  
  if (!fgRgb || !bgRgb) return null
  
  const ratio = getContrastRatio(fgRgb, bgRgb)
  return checkContrastRatio(ratio)
}

/**
 * Get a compliant color that meets contrast requirements
 * @param baseColor - Base color to adjust
 * @param backgroundColor - Background color to contrast against
 * @param targetRatio - Target contrast ratio (default: AA normal)
 * @param darken - Whether to darken or lighten the base color
 * @returns Adjusted color that meets contrast requirements
 */
export function getCompliantColor(
  baseColor: RGBColor,
  backgroundColor: RGBColor,
  targetRatio: number = WCAG_CONTRAST_RATIOS.AA_NORMAL,
  darken: boolean = true
): RGBColor {
  let adjustedColor = { ...baseColor }
  let currentRatio = getContrastRatio(adjustedColor, backgroundColor)
  
  if (currentRatio >= targetRatio) {
    return adjustedColor
  }
  
  // Binary search for the right adjustment
  let low = 0
  let high = 255
  let bestColor = adjustedColor
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    
    if (darken) {
      adjustedColor = {
        r: Math.max(0, baseColor.r - mid),
        g: Math.max(0, baseColor.g - mid),
        b: Math.max(0, baseColor.b - mid)
      }
    } else {
      adjustedColor = {
        r: Math.min(255, baseColor.r + mid),
        g: Math.min(255, baseColor.g + mid),
        b: Math.min(255, baseColor.b + mid)
      }
    }
    
    currentRatio = getContrastRatio(adjustedColor, backgroundColor)
    
    if (currentRatio >= targetRatio) {
      bestColor = adjustedColor
      high = mid - 1
    } else {
      low = mid + 1
    }
  }
  
  return bestColor
}

/**
 * Generate a color palette with proper contrast ratios
 * @param baseColor - Base color for the palette
 * @param backgroundColor - Background color for contrast calculations
 * @returns Object with compliant color variations
 */
export function generateAccessiblePalette(
  baseColor: string | RGBColor,
  backgroundColor: string | RGBColor = { r: 255, g: 255, b: 255 }
): unknown {
  const baseRgb = typeof baseColor === 'string' ? hexToRgb(baseColor) : baseColor
  const bgRgb = typeof backgroundColor === 'string' ? hexToRgb(backgroundColor) : backgroundColor
  
  if (!baseRgb || !bgRgb) {
    throw new Error('Invalid color format')
  }
  
  return {
    normal: getCompliantColor(baseRgb, bgRgb, WCAG_CONTRAST_RATIOS.AA_NORMAL),
    large: getCompliantColor(baseRgb, bgRgb, WCAG_CONTRAST_RATIOS.AA_LARGE),
    enhanced: getCompliantColor(baseRgb, bgRgb, WCAG_CONTRAST_RATIOS.AAA_NORMAL),
    enhancedLarge: getCompliantColor(baseRgb, bgRgb, WCAG_CONTRAST_RATIOS.AAA_LARGE)
  }
}

/**
 * Get color from CSS custom property
 * @param property - CSS custom property name (e.g., '--color-primary')
 * @returns RGB color object or null if not found
 */
export function getCSSColor(property: string): RGBColor | null {
  if (typeof window === 'undefined') return null
  
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(property)
    .trim()
  
  if (value.startsWith('#')) {
    return hexToRgb(value)
  } else if (value.startsWith('rgb')) {
    return parseRgb(value)
  }
  
  return null
}

/**
 * Validate color contrast for current theme
 * @param colorPairs - Array of [foreground, background] color pairs to check
 * @returns Array of contrast check results
 */
export function validateThemeContrast(
  colorPairs: Array<[string, string]>
): Array<{ colors: [string, string]; result: ContrastResult | null }> {
  return colorPairs.map(([fg, bg]) => ({
    colors: [fg, bg],
    result: checkContrast(fg, bg)
  }))
}

/**
 * Common color combinations to validate
 */
export const COMMON_COLOR_COMBINATIONS = [
  ['--text-primary', '--bg-primary'],
  ['--text-secondary', '--bg-primary'],
  ['--text-tertiary', '--bg-primary'],
  ['--color-brand-primary-600', '--bg-primary'],
  ['--color-semantic-error-600', '--bg-primary'],
  ['--color-semantic-success-600', '--bg-primary'],
  ['--color-semantic-warning-600', '--bg-primary'],
  ['white', '--color-brand-primary-600'],
  ['white', '--color-semantic-error-600'],
  ['white', '--color-semantic-success-600']
] as const

/**
 * Hook for monitoring color contrast in React components
 */
export function useContrastValidation(
  foregroundColor: string,
  backgroundColor: string,
  targetLevel: 'AA' | 'AAA' = 'AA'
): unknown {
  const result = checkContrast(foregroundColor, backgroundColor)
  
  if (!result) return { isValid: false, ratio: 0, result: null }
  
  const isValid = targetLevel === 'AAA' 
    ? result.isAAANormal 
    : result.isAANormal
  
  return {
    isValid,
    ratio: result.ratio,
    result
  }
}