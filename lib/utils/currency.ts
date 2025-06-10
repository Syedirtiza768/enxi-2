import { CompanySettings } from '@prisma/client'

// Currency formatting utility that can work both client and server side
export interface CurrencyFormatOptions {
  currency?: string
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

// Default company currency - this should be loaded from CompanySettings
let defaultCurrency = 'USD'

// Set the default currency (called from server-side when settings are loaded)
export function setDefaultCurrency(currency: string) {
  defaultCurrency = currency
}

// Get the current default currency
export function getDefaultCurrency(): string {
  return defaultCurrency
}

// Format currency with proper locale and currency code
export function formatCurrency(
  amount: number, 
  options: CurrencyFormatOptions = {}
): string {
  const {
    currency = defaultCurrency,
    locale = 'en-US',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(amount)
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency} ${amount.toFixed(maximumFractionDigits)}`
  }
}

// Get currency symbol
export function getCurrencySymbol(currency: string = defaultCurrency): string {
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
    
    return formatter.format(0).replace(/[0-9]/g, '').trim()
  } catch {
    // Return currency code if symbol can't be determined
    return currency
  }
}

// Parse amount from formatted currency string
export function parseCurrencyAmount(formattedAmount: string): number {
  // Remove currency symbols, spaces, and thousands separators
  const cleanedAmount = formattedAmount
    .replace(/[^0-9.-]/g, '')
    .replace(/,/g, '')
  
  return parseFloat(cleanedAmount) || 0
}

// Currency metadata
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' }
]

// Get currency info
export function getCurrencyInfo(code: string) {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)
}