'use client'

import { AuthProvider } from '@/lib/hooks/use-auth'
import { ThemeProvider } from '@/lib/design-system/theme-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}