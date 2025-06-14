/**
 * Accounting Module - Core accounting functionality for Enxi ERP
 */

export interface AccountingPeriod {
  id: string
  name: string
  startDate: Date
  endDate: Date
  status: 'open' | 'closed'
  fiscalYear: number
}

export interface ChartOfAccount {
  id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  parentId?: string
  isActive: boolean
  balance: number
  currency: string
}

export interface JournalEntry {
  id: string
  entryNumber: string
  date: Date
  description: string
  reference?: string
  status: 'draft' | 'posted' | 'cancelled'
  lines: JournalLine[]
  createdBy: string
  createdAt: Date
  postedAt?: Date
}

export interface JournalLine {
  id: string
  accountId: string
  accountCode: string
  accountName: string
  description?: string
  debit: number
  credit: number
  currency: string
}

export interface FinancialReport {
  id: string
  type: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'trial_balance'
  periodId: string
  generatedAt: Date
  data: any
}

export interface TaxRate {
  id: string
  code: string
  name: string
  rate: number
  type: 'sales' | 'purchase' | 'both'
  isActive: boolean
  effectiveFrom: Date
  effectiveTo?: Date
}

export interface CurrencyExchangeRate {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  effectiveDate: Date
  source?: string
}

// Utility functions
export const calculateBalance = (account: ChartOfAccount, entries: JournalEntry[]): number => {
  let balance = 0
  
  entries.forEach(entry => {
    if (entry.status === 'posted') {
      entry.lines.forEach(line => {
        if (line.accountId === account.id) {
          // For asset and expense accounts, debits increase and credits decrease
          // For liability, equity, and revenue accounts, credits increase and debits decrease
          if (['asset', 'expense'].includes(account.type)) {
            balance += line.debit - line.credit
          } else {
            balance += line.credit - line.debit
          }
        }
      })
    }
  })
  
  return balance
}

export const validateJournalEntry = (entry: JournalEntry): boolean => {
  // Sum of debits must equal sum of credits
  const totalDebits = entry.lines.reduce((sum, line) => sum + line.debit, 0)
  const totalCredits = entry.lines.reduce((sum, line) => sum + line.credit, 0)
  
  return Math.abs(totalDebits - totalCredits) < 0.01 // Allow for small rounding differences
}

export const formatAccountCode = (code: string): string => {
  // Format account code as XXX-XXX-XXX
  return code.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3')
}

export const getAccountType = (code: string): ChartOfAccount['type'] => {
  const firstDigit = code.charAt(0)
  switch (firstDigit) {
    case '1': return 'asset'
    case '2': return 'liability'
    case '3': return 'equity'
    case '4': return 'revenue'
    case '5': return 'expense'
    default: return 'asset'
  }
}

export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: CurrencyExchangeRate[]
): number => {
  if (fromCurrency === toCurrency) return amount
  
  const rate = rates.find(r => 
    r.fromCurrency === fromCurrency && r.toCurrency === toCurrency
  )
  
  if (!rate) {
    throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`)
  }
  
  return amount * rate.rate
}

export const calculateTax = (amount: number, taxRate: TaxRate): number => {
  return amount * (taxRate.rate / 100)
}

// Export default for compatibility
export default {
  calculateBalance,
  validateJournalEntry,
  formatAccountCode,
  getAccountType,
  convertCurrency,
  calculateTax
}