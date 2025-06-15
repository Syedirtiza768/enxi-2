import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/styles/design-system.css'
import { Providers } from './providers'
import { ThemeScript } from '@/components/design-system/ThemeScript'
import { WebVitals } from '@/components/performance/web-vitals'
import { preloadCriticalComponents } from '@/lib/utils/dynamic-imports'
import '@/lib/utils/robust-system-init'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Enxi ERP',
  description: 'Enterprise Resource Planning System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  // Preload critical components
  // Temporarily disabled to fix chunk loading error
  // if (typeof window !== 'undefined') {
  //   preloadCriticalComponents()
  // }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <WebVitals />
      </body>
    </html>
  )
}