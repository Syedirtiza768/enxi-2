import { CompanySettings } from '@prisma/client'

// Currency formatting utility that can work both client and server side
export interface CurrencyFormatOptions {
  currency?: string
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

// Default company currency - this should be loaded from CompanySettings
let defaultCurrency = 'AED'

// Set the default currency (called from server-side when settings are loaded)
export function setDefaultCurrency(currency: string): void {
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

  // Always use English literal format: CURRENCY_CODE AMOUNT
  const formattedAmount = amount.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits
  })
  
  return `${currency} ${formattedAmount}`
}

// Get currency symbol - returns currency code for English literal display
export function getCurrencySymbol(currency: string = defaultCurrency): string {
  // Always return the currency code for English literal display
  return currency
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
  { code: 'USD', name: 'US Dollar', symbol: 'USD' },
  { code: 'EUR', name: 'Euro', symbol: 'EUR' },
  { code: 'GBP', name: 'British Pound', symbol: 'GBP' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'PKR' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CAD' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'AUD' },
  { code: 'JPY', name: 'Japanese Yen', symbol: 'JPY' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: 'CNY' },
  { code: 'INR', name: 'Indian Rupee', symbol: 'INR' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZD' }
]

// Get currency info
export function getCurrencyInfo(code: string): unknown {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)
}