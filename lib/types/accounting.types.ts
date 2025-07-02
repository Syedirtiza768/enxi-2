// Import enums from shared-enums since they're not in Prisma schema
import { AccountType } from '@/lib/constants/account-type';
import { AccountStatus, JournalStatus } from "@/lib/types/shared-enums"
export { AccountType, AccountStatus, JournalStatus }

export enum TransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  currency: string
  description?: string
  parentId?: string | null
  balance: number
  status: AccountStatus
  isSystemAccount: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AccountTree extends Account {
  children?: AccountTree[]
}

export interface CreateAccountInput {
  code: string
  name: string
  type: AccountType
  currency: string
  description?: string
  parentId?: string | null
}

export interface UpdateAccountInput {
  code?: string
  name?: string
  type?: AccountType
  currency?: string
  description?: string
  parentId?: string | null
  status?: AccountStatus
}

export interface JournalEntry {
  id: string
  date: Date
  description: string
  reference?: string
  currency: string
  exchangeRate: number
  lines: JournalLine[]
  status: JournalStatus
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface JournalLine {
  id: string
  journalEntryId: string
  accountId: string
  account?: Account
  description?: string
  debitAmount: number
  creditAmount: number
  currency: string
  exchangeRate: number
  baseDebitAmount: number // Amount in base currency
  baseCreditAmount: number // Amount in base currency
}

// JournalStatus is imported from Prisma client above

export interface CreateJournalEntryInput {
  date: Date
  description: string
  reference?: string
  currency: string
  exchangeRate?: number
  lines: CreateJournalLineInput[]
  status?: JournalStatus // Optional status for direct creation as POSTED
}

export interface CreateJournalLineInput {
  accountId: string
  description?: string
  debitAmount: number
  creditAmount: number
}

export interface TrialBalance {
  asOfDate: Date
  accounts: TrialBalanceAccount[]
  totalDebits: number
  totalCredits: number
  isBalanced: boolean
}

export interface TrialBalanceAccount {
  accountCode: string
  accountName: string
  accountType: AccountType
  debitBalance: number
  creditBalance: number
}

export interface BalanceSheet {
  asOfDate: Date
  assets: BalanceSheetSection
  liabilities: BalanceSheetSection
  equity: BalanceSheetSection
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  isBalanced: boolean
}

export interface IncomeStatement {
  startDate: Date
  endDate: Date
  income: IncomeStatementSection
  expenses: IncomeStatementSection
  totalIncome: number
  totalExpenses: number
  netIncome: number
}

export interface BalanceSheetSection {
  accounts: AccountBalance[]
  total: number
}

export interface IncomeStatementSection {
  accounts: AccountBalance[]
  total: number
}

export interface AccountBalance {
  accountCode: string
  accountName: string
  balance: number
}

// Helper functions for account types
export function getNormalBalance(accountType: AccountType): TransactionType {
  switch (accountType) {
    case AccountType.ASSET:
    case AccountType.EXPENSE:
      return TransactionType.DEBIT
    case AccountType.LIABILITY:
    case AccountType.EQUITY:
    case AccountType.INCOME:
      return TransactionType.CREDIT
  }
}

export function isDebitAccount(accountType: AccountType): boolean {
  return getNormalBalance(accountType) === TransactionType.DEBIT
}

export function isCreditAccount(accountType: AccountType): boolean {
  return getNormalBalance(accountType) === TransactionType.CREDIT
}