'use client'

import { AuthProvider } from '@/lib/hooks/use-auth'
import { ThemeProvider } from '@/lib/design-system/theme-context'
import { CurrencyProvider } from '@/lib/contexts/currency-context'

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