import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/styles/design-system.css'
import { Providers } from './providers'
import { ThemeScript } from '@/components/design-system/ThemeScript'
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
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}