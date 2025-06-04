import { prisma } from '@/lib/db/prisma'
import { AccountType } from '@/lib/generated/prisma'
import { 
  TrialBalance,
  TrialBalanceAccount,
  getNormalBalance,
  TransactionType
} from '@/lib/types/accounting.types'

export class TrialBalanceService {
  
  async generateTrialBalance(asOfDate: Date, currency: string = 'USD'): Promise<TrialBalance> {
    // Get all accounts with their current balances
    const accounts = await prisma.account.findMany({
      where: {
        currency,
        status: 'ACTIVE'
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              date: {
                lte: asOfDate
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

    const trialBalanceAccounts: TrialBalanceAccount[] = []
    let totalDebits = 0
    let totalCredits = 0

    for (const account of accounts) {
      // Calculate account balance from journal lines
      let debitTotal = 0
      let creditTotal = 0

      for (const line of account.journalLines) {
        debitTotal += line.baseDebitAmount
        creditTotal += line.baseCreditAmount
      }

      // Determine if this account normally has a debit or credit balance
      const normalBalance = getNormalBalance(account.type)
      let debitBalance = 0
      let creditBalance = 0

      const netBalance = debitTotal - creditTotal

      if (normalBalance === TransactionType.DEBIT) {
        // Asset and Expense accounts: positive balance goes to debit side
        if (netBalance >= 0) {
          debitBalance = netBalance
        } else {
          creditBalance = Math.abs(netBalance)
        }
      } else {
        // Liability, Equity, and Income accounts: positive balance goes to credit side
        if (netBalance <= 0) {
          creditBalance = Math.abs(netBalance)
        } else {
          debitBalance = netBalance
        }
      }

      // Only include accounts with non-zero balances
      if (debitBalance > 0 || creditBalance > 0) {
        trialBalanceAccounts.push({
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          debitBalance,
          creditBalance
        })

        totalDebits += debitBalance
        totalCredits += creditBalance
      }
    }

    // Check if trial balance is balanced
    const tolerance = 0.01 // Allow small rounding differences
    const isBalanced = Math.abs(totalDebits - totalCredits) <= tolerance

    return {
      asOfDate,
      accounts: trialBalanceAccounts,
      totalDebits,
      totalCredits,
      isBalanced
    }
  }

  async getAccountBalanceHistory(
    accountId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<Array<{ date: Date; runningBalance: number; debit: number; credit: number }>> {
    const journalLines = await prisma.journalLine.findMany({
      where: {
        accountId,
        journalEntry: {
          date: {
            gte: fromDate,
            lte: toDate
          },
          status: 'POSTED'
        }
      },
      include: {
        journalEntry: true,
        account: true
      },
      orderBy: {
        journalEntry: {
          date: 'asc'
        }
      }
    })

    // Get starting balance (all transactions before fromDate)
    const startingBalanceLines = await prisma.journalLine.findMany({
      where: {
        accountId,
        journalEntry: {
          date: {
            lt: fromDate
          },
          status: 'POSTED'
        }
      }
    })

    let runningBalance = 0
    const account = journalLines[0]?.account

    if (account && startingBalanceLines.length > 0) {
      const normalBalance = getNormalBalance(account.type)
      let startingDebits = 0
      let startingCredits = 0

      for (const line of startingBalanceLines) {
        startingDebits += line.baseDebitAmount
        startingCredits += line.baseCreditAmount
      }

      if (normalBalance === TransactionType.DEBIT) {
        runningBalance = startingDebits - startingCredits
      } else {
        runningBalance = startingCredits - startingDebits
      }
    }

    const history: Array<{ date: Date; runningBalance: number; debit: number; credit: number }> = []

    for (const line of journalLines) {
      const normalBalance = getNormalBalance(line.account.type)
      
      if (normalBalance === TransactionType.DEBIT) {
        runningBalance += line.baseDebitAmount - line.baseCreditAmount
      } else {
        runningBalance += line.baseCreditAmount - line.baseDebitAmount
      }

      history.push({
        date: line.journalEntry.date,
        runningBalance,
        debit: line.baseDebitAmount,
        credit: line.baseCreditAmount
      })
    }

    return history
  }

  async getAccountsByType(accountType: AccountType, asOfDate: Date): Promise<TrialBalanceAccount[]> {
    const trialBalance = await this.generateTrialBalance(asOfDate)
    return trialBalance.accounts.filter(account => account.accountType === accountType)
  }

  async validateTrialBalance(asOfDate: Date, currency: string = 'USD'): Promise<{
    isValid: boolean
    errors: string[]
    totalDebits: number
    totalCredits: number
    difference: number
  }> {
    const errors: string[] = []
    
    try {
      const trialBalance = await this.generateTrialBalance(asOfDate, currency)
      
      const difference = Math.abs(trialBalance.totalDebits - trialBalance.totalCredits)
      const tolerance = 0.01
      
      if (difference > tolerance) {
        errors.push(`Trial balance is not balanced. Difference: ${difference.toFixed(2)}`)
      }

      // Additional validations
      if (trialBalance.accounts.length === 0) {
        errors.push('No accounts found with balances')
      }

      // Check for accounts with unusual balances
      for (const account of trialBalance.accounts) {
        const normalBalance = getNormalBalance(account.accountType)
        
        if (normalBalance === TransactionType.DEBIT && account.creditBalance > account.debitBalance) {
          errors.push(`${account.accountCode} - ${account.accountName} has unusual credit balance for ${account.accountType} account`)
        } else if (normalBalance === TransactionType.CREDIT && account.debitBalance > account.creditBalance) {
          errors.push(`${account.accountCode} - ${account.accountName} has unusual debit balance for ${account.accountType} account`)
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        totalDebits: trialBalance.totalDebits,
        totalCredits: trialBalance.totalCredits,
        difference
      }
    } catch (error) {
      errors.push(`Error generating trial balance: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      return {
        isValid: false,
        errors,
        totalDebits: 0,
        totalCredits: 0,
        difference: 0
      }
    }
  }
}