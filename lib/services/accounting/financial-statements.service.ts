import { prisma } from '@/lib/db/prisma'
import { AccountType } from '@/lib/generated/prisma'
import { TrialBalanceService } from './trial-balance.service'
import { 
  BalanceSheet,
  IncomeStatement,
  BalanceSheetSection,
  IncomeStatementSection,
  AccountBalance,
  TransactionType,
  getNormalBalance
} from '@/lib/types/accounting.types'

export class FinancialStatementsService {
  private trialBalanceService: TrialBalanceService

  constructor() {
    this.trialBalanceService = new TrialBalanceService()
  }

  async generateBalanceSheet(asOfDate: Date, currency: string = 'USD'): Promise<BalanceSheet> {
    // Get trial balance data
    const trialBalance = await this.trialBalanceService.generateTrialBalance(asOfDate, currency)

    // Separate accounts by type
    const assetAccounts = trialBalance.accounts.filter(acc => acc.accountType === AccountType.ASSET)
    const liabilityAccounts = trialBalance.accounts.filter(acc => acc.accountType === AccountType.LIABILITY)
    const equityAccounts = trialBalance.accounts.filter(acc => acc.accountType === AccountType.EQUITY)

    // Calculate retained earnings from income statement
    const incomeStatement = await this.generateIncomeStatement(
      new Date(asOfDate.getFullYear(), 0, 1), // Start of year
      asOfDate,
      currency
    )

    // Add retained earnings to equity if there's net income/loss
    const retainedEarningsBalance: AccountBalance[] = []
    if (incomeStatement.netIncome !== 0) {
      retainedEarningsBalance.push({
        accountCode: 'RE',
        accountName: 'Retained Earnings (Current Period)',
        balance: incomeStatement.netIncome
      })
    }

    // Build balance sheet sections
    const assets: BalanceSheetSection = {
      accounts: assetAccounts.map(acc => ({
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        balance: acc.debitBalance - acc.creditBalance // Assets are debit balance
      })),
      total: assetAccounts.reduce((sum, acc) => sum + (acc.debitBalance - acc.creditBalance), 0)
    }

    const liabilities: BalanceSheetSection = {
      accounts: liabilityAccounts.map(acc => ({
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        balance: acc.creditBalance - acc.debitBalance // Liabilities are credit balance
      })),
      total: liabilityAccounts.reduce((sum, acc) => sum + (acc.creditBalance - acc.debitBalance), 0)
    }

    const equity: BalanceSheetSection = {
      accounts: [
        ...equityAccounts.map(acc => ({
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          balance: acc.creditBalance - acc.debitBalance // Equity is credit balance
        })),
        ...retainedEarningsBalance
      ],
      total: equityAccounts.reduce((sum, acc) => sum + (acc.creditBalance - acc.debitBalance), 0) + incomeStatement.netIncome
    }

    const totalAssets = assets.total
    const totalLiabilities = liabilities.total
    const totalEquity = equity.total

    // Check if balance sheet balances (Assets = Liabilities + Equity)
    const tolerance = 0.01
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) <= tolerance

    return {
      asOfDate,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced
    }
  }

  async generateIncomeStatement(
    startDate: Date,
    endDate: Date,
    currency: string = 'USD'
  ): Promise<IncomeStatement> {
    // Validate date range
    if (startDate >= endDate) {
      throw new Error('fromDate must be before toDate')
    }

    // Get accounts and their balances for the period
    const accounts = await prisma.account.findMany({
      where: {
        currency,
        status: 'ACTIVE',
        OR: [
          { type: AccountType.INCOME },
          { type: AccountType.EXPENSE }
        ]
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              date: {
                gte: startDate,
                lte: endDate
              },
              status: 'POSTED'
            }
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    })

    const incomeAccounts: AccountBalance[] = []
    const expenseAccounts: AccountBalance[] = []

    let totalIncome = 0
    let totalExpenses = 0

    for (const account of accounts) {
      // Calculate account balance for the period
      let debitTotal = 0
      let creditTotal = 0

      for (const line of account.journalLines) {
        debitTotal += line.baseDebitAmount
        creditTotal += line.baseCreditAmount
      }

      const normalBalance = getNormalBalance(account.type)
      let accountBalance = 0

      if (normalBalance === TransactionType.CREDIT) {
        // Income accounts: credit increases income
        accountBalance = creditTotal - debitTotal
      } else {
        // Expense accounts: debit increases expense
        accountBalance = debitTotal - creditTotal
      }

      // Only include accounts with activity
      if (Math.abs(accountBalance) > 0.01) {
        const balanceItem: AccountBalance = {
          accountCode: account.code,
          accountName: account.name,
          balance: Math.abs(accountBalance) // Always show positive amounts
        }

        if (account.type === AccountType.INCOME) {
          incomeAccounts.push(balanceItem)
          totalIncome += Math.abs(accountBalance)
        } else {
          expenseAccounts.push(balanceItem)
          totalExpenses += Math.abs(accountBalance)
        }
      }
    }

    const income: IncomeStatementSection = {
      accounts: incomeAccounts,
      total: totalIncome
    }

    const expenses: IncomeStatementSection = {
      accounts: expenseAccounts,
      total: totalExpenses
    }

    const netIncome = totalIncome - totalExpenses

    return {
      startDate,
      endDate,
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netIncome
    }
  }

  async generateCashFlowStatement(
    startDate: Date,
    endDate: Date,
    currency: string = 'USD'
  ): Promise<{
    startDate: Date
    endDate: Date
    operatingActivities: AccountBalance[]
    investingActivities: AccountBalance[]
    financingActivities: AccountBalance[]
    netCashFlow: number
    beginningCash: number
    endingCash: number
  }> {
    // Get cash accounts
    const cashAccounts = await prisma.account.findMany({
      where: {
        currency,
        status: 'ACTIVE',
        OR: [
          { name: { contains: 'Cash' } },
          { name: { contains: 'Bank' } },
          { code: { startsWith: '1110' } } // Assuming cash accounts start with 1110
        ]
      }
    })

    // Calculate beginning cash balance
    let beginningCash = 0
    for (const account of cashAccounts) {
      const history = await this.trialBalanceService.getAccountBalanceHistory(
        account.id,
        new Date(startDate.getFullYear() - 1, 0, 1),
        new Date(startDate.getTime() - 1)
      )
      if (history.length > 0) {
        beginningCash += history[history.length - 1].runningBalance
      }
    }

    // Calculate ending cash balance
    let endingCash = 0
    for (const account of cashAccounts) {
      const history = await this.trialBalanceService.getAccountBalanceHistory(
        account.id,
        new Date(startDate.getFullYear() - 1, 0, 1),
        endDate
      )
      if (history.length > 0) {
        endingCash += history[history.length - 1].runningBalance
      }
    }

    // For now, we'll use a simplified approach
    // In a full implementation, you'd categorize each transaction by activity type
    const netIncome = await this.generateIncomeStatement(startDate, endDate, currency)
    
    const operatingActivities: AccountBalance[] = [
      {
        accountCode: 'NI',
        accountName: 'Net Income',
        balance: netIncome.netIncome
      }
    ]

    const investingActivities: AccountBalance[] = []
    const financingActivities: AccountBalance[] = []

    const netCashFlow = endingCash - beginningCash

    return {
      startDate,
      endDate,
      operatingActivities,
      investingActivities,
      financingActivities,
      netCashFlow,
      beginningCash,
      endingCash
    }
  }

  async validateFinancialStatements(
    asOfDate: Date,
    currency: string = 'USD'
  ): Promise<{
    isValid: boolean
    errors: string[]
    balanceSheetBalanced: boolean
    trialBalanceBalanced: boolean
  }> {
    const errors: string[] = []

    try {
      // Validate trial balance first
      const trialBalanceValidation = await this.trialBalanceService.validateTrialBalance(asOfDate, currency)
      
      if (!trialBalanceValidation.isValid) {
        errors.push(...trialBalanceValidation.errors)
      }

      // Validate balance sheet
      const balanceSheet = await this.generateBalanceSheet(asOfDate, currency)
      
      if (!balanceSheet.isBalanced) {
        errors.push('Balance sheet does not balance (Assets ≠ Liabilities + Equity)')
      }

      // Additional validations can be added here
      if (balanceSheet.totalAssets < 0) {
        errors.push('Total assets cannot be negative')
      }

      return {
        isValid: errors.length === 0,
        errors,
        balanceSheetBalanced: balanceSheet.isBalanced,
        trialBalanceBalanced: trialBalanceValidation.isValid
      }
    } catch {
      errors.push('Error validating financial statements');
      
      return {
        isValid: false,
        errors,
        balanceSheetBalanced: false,
        trialBalanceBalanced: false
      }
    }
  }
}