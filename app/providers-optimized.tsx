'use client'

import { memo, Suspense, lazy } from 'react'
import { AuthProvider } from '@/lib/hooks/use-auth'
import { ThemeProvider } from '@/lib/design-system/theme-context'
import { CurrencyProvider } from '@/lib/contexts/currency-context'
import { WebVitals } from '@/components/performance/web-vitals'
import { LoadingSpinner } from '@/lib/utils/lazy-loading'

// Lazy load heavy providers that aren't needed immediately
const AnalyticsProvider = lazy(() => 
  import('@/components/analytics/analytics-provider').then(module => ({
    default: module.AnalyticsProvider
  }))
)

const ErrorBoundary = lazy(() =>
  import('@/components/error/error-boundary').then(module => ({
    default: module.ErrorBoundary
  }))
)

// Memoized core providers to prevent unnecessary re-renders
const CoreProviders = memo(({ children }: { children: React.ReactNode }) => (
  <ThemeProvider defaultTheme="system">
    <AuthProvider>
      <CurrencyProvider>
        {children}
      </CurrencyProvider>
    </AuthProvider>
  </ThemeProvider>
))

CoreProviders.displayName = 'CoreProviders'

// Optimized providers with lazy loading and performance monitoring
export const ProvidersOptimized = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <CoreProviders>
      <Suspense fallback={<LoadingSpinner />}>
        <ErrorBoundary>
          <Suspense fallback={null}>
            <AnalyticsProvider>
              {children}
            </AnalyticsProvider>
          </Suspense>
        </ErrorBoundary>
      </Suspense>
      
      {/* Performance monitoring - only in production */}
      {process.env.NODE_ENV === 'production' && <WebVitals />}
    </CoreProviders>
  )
})

ProvidersOptimized.displayName = 'ProvidersOptimized'

// Keep original providers for backward compatibility
export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme="system">
      <AuthProvider>
        <CurrencyProvider>
          {children}
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}