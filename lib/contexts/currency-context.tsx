'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { setDefaultCurrency as setGlobalDefaultCurrency, formatCurrency as formatCurrencyUtil } from '@/lib/utils/currency'

interface CurrencyContextType {
  defaultCurrency: string
  supportedCurrencies: Array<{ code: string; name: string }>
  formatCurrency: (amount: number, currency?: string) => string
  isLoading: boolean
  refreshSettings: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [defaultCurrency, setDefaultCurrency] = useState<string>('USD')
  const [supportedCurrencies, setSupportedCurrencies] = useState<Array<{ code: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadCurrencySettings()

    // Listen for company settings changes
    const handleSettingsChange = (event: Event): void => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.defaultCurrency) {
        const currency = customEvent.detail.defaultCurrency
        setDefaultCurrency(currency)
        setGlobalDefaultCurrency(currency) // Update global default
      }
    }

    window.addEventListener('companySettingsChanged', handleSettingsChange)
    return (): void => {
      window.removeEventListener('companySettingsChanged', handleSettingsChange)
    }
  }, [])

  const loadCurrencySettings = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        // If no token, use defaults
        setSupportedCurrencies([
          { code: 'USD', name: 'US Dollar' },
          { code: 'EUR', name: 'Euro' },
          { code: 'GBP', name: 'British Pound' },
          { code: 'AED', name: 'UAE Dirham' },
          { code: 'PKR', name: 'Pakistani Rupee' }
        ])
        return
      }

      const response = await fetch('/api/settings/company', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const currency = data.settings.defaultCurrency
        setDefaultCurrency(currency)
        setGlobalDefaultCurrency(currency) // Update global default
        setSupportedCurrencies(data.supportedCurrencies)
      }
    } catch (error) {
      console.error('Error loading currency settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency?: string): string => {
    return formatCurrencyUtil(amount, {
      currency: currency || defaultCurrency
    })
  }

  const refreshSettings = async (): Promise<void> => {
    await loadCurrencySettings()
  }

  const value: CurrencyContextType = {
    defaultCurrency,
    supportedCurrencies,
    formatCurrency,
    isLoading,
    refreshSettings
  }

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}

// Utility hook for formatting currency with default currency
export function useCurrencyFormatter() {
  const { formatCurrency, defaultCurrency } = useCurrency()
  
  return {
    format: (amount: number, currency?: string): string => formatCurrency(amount, currency),
    defaultCurrency
  }
}