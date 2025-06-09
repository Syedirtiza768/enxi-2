'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface CurrencyContextType {
  defaultCurrency: string
  supportedCurrencies: Array<{ code: string; name: string }>
  formatCurrency: (amount: number, currency?: string) => string
  isLoading: boolean
  refreshSettings: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [defaultCurrency, setDefaultCurrency] = useState<string>('USD')
  const [supportedCurrencies, setSupportedCurrencies] = useState<Array<{ code: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadCurrencySettings()

    // Listen for company settings changes
    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.defaultCurrency) {
        setDefaultCurrency(customEvent.detail.defaultCurrency)
      }
    }

    window.addEventListener('companySettingsChanged', handleSettingsChange)
    return () => {
      window.removeEventListener('companySettingsChanged', handleSettingsChange)
    }
  }, [])

  const loadCurrencySettings = async () => {
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
        setDefaultCurrency(data.settings.defaultCurrency)
        setSupportedCurrencies(data.supportedCurrencies)
      }
    } catch (error) {
      console.error('Error loading currency settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency?: string) => {
    const currencyCode = currency || defaultCurrency
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
    } catch (error) {
      // Fallback for unsupported currencies
      return `${currencyCode} ${amount.toFixed(2)}`
    }
  }

  const refreshSettings = async () => {
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

export function useCurrency() {
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
    format: (amount: number, currency?: string) => formatCurrency(amount, currency),
    defaultCurrency
  }
}