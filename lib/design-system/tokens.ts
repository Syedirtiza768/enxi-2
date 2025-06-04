// Design System Tokens - Type-safe design tokens for the ERP application
export const designTokens = {
  color: {
    brand: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554'
      },
      secondary: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617'
      }
    },
    semantic: {
      success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
        950: '#052e16' // Added missing shade
      },
      warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
        950: '#451a03' // Added missing shade
      },
      error: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
        950: '#450a0a' // Added missing shade
      },
      info: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
        950: '#082f49' // Added missing shade
      }
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a'
    }
  },
  spacing: {
    0: '0px',
    px: '1px',
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    2.5: '10px',
    3: '12px',
    3.5: '14px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    9: '36px',
    10: '40px',
    11: '44px',
    12: '48px',
    14: '56px',
    16: '64px',
    20: '80px',
    24: '96px',
    28: '112px',
    32: '128px',
    36: '144px',
    40: '160px',
    44: '176px',
    48: '192px',
    52: '208px',
    56: '224px',
    60: '240px',
    64: '256px',
    72: '288px',
    80: '320px',
    96: '384px'
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", Consolas, Monaco, monospace'
    },
    fontSize: {
      xs: { size: '12px', lineHeight: '16px', letterSpacing: '0.025em' },
      sm: { size: '14px', lineHeight: '20px', letterSpacing: '0.025em' },
      base: { size: '16px', lineHeight: '24px', letterSpacing: '0em' },
      lg: { size: '18px', lineHeight: '28px', letterSpacing: '-0.025em' },
      xl: { size: '20px', lineHeight: '28px', letterSpacing: '-0.025em' },
      '2xl': { size: '24px', lineHeight: '32px', letterSpacing: '-0.025em' },
      '3xl': { size: '30px', lineHeight: '36px', letterSpacing: '-0.025em' },
      '4xl': { size: '36px', lineHeight: '40px', letterSpacing: '-0.025em' },
      '5xl': { size: '48px', lineHeight: '1', letterSpacing: '-0.025em' },
      '6xl': { size: '60px', lineHeight: '1', letterSpacing: '-0.025em' },
      '7xl': { size: '72px', lineHeight: '1', letterSpacing: '-0.025em' },
      '8xl': { size: '96px', lineHeight: '1', letterSpacing: '-0.025em' },
      '9xl': { size: '128px', lineHeight: '1', letterSpacing: '-0.025em' }
    },
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900'
    }
  },
  borderRadius: {
    none: '0px',
    sm: '2px',
    base: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    '3xl': '24px',
    full: '9999px'
  },
  shadow: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '2xl': '0 35px 60px -15px rgb(0 0 0 / 0.3)', // Fixed duplicate value
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none'
  },
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1400px'
  },
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800
  },
  // Additional tokens for animations and transitions
  transition: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    timing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  blur: {
    sm: '4px',
    base: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px'
  }
} as const

// Type exports for TypeScript support
export type DesignTokens = typeof designTokens
export type ColorToken = keyof typeof designTokens.color
export type SpacingToken = keyof typeof designTokens.spacing
export type FontSizeToken = keyof typeof designTokens.typography.fontSize
export type FontWeightToken = keyof typeof designTokens.typography.fontWeight
export type BorderRadiusToken = keyof typeof designTokens.borderRadius
export type ShadowToken = keyof typeof designTokens.shadow
export type BreakpointToken = keyof typeof designTokens.breakpoints
export type ZIndexToken = keyof typeof designTokens.zIndex