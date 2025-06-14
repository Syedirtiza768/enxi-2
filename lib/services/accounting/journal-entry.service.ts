import { BaseService } from '../base.service'
import { prisma } from '@/lib/db/prisma'
import { AuditService } from '../audit.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { ChartOfAccountsService } from './chart-of-accounts.service'
import { CurrencyService } from './currency.service'
import { 
  JournalStatus,
  JournalEntry,
  JournalLine,
  Prisma
} from '@/lib/generated/prisma'
import { 
  CreateJournalEntryInput,
  _CreateJournalLineInput
} from '@/lib/types/accounting.types'

export class JournalEntryService extends BaseService {
  private auditService: AuditService
  private chartOfAccountsService: ChartOfAccountsService
  private currencyService: CurrencyService

  constructor() {
    super('JournalEntryService')
    this.auditService = new AuditService()
    this.chartOfAccountsService = new ChartOfAccountsService()
    this.currencyService = new CurrencyService()
  }

  async createJournalEntry(
    data: CreateJournalEntryInput & { createdBy: string },
    transactionClient?: Prisma.TransactionClient
  ): Promise<JournalEntry & { lines: JournalLine[] }> {
    return this.withLogging('createJournalEntry', async () => {
      if (transactionClient) {
        // When called within an existing transaction, use that transaction
        return this.createJournalEntryInTransaction(data, transactionClient)
      }

      // Validate double-entry bookkeeping rules
      await this.validateJournalEntry(data)

      // Generate unique entry number
      const entryNumber = await this.generateEntryNumber()

      // Create journal entry with lines in a transaction
      const result = await prisma.$transaction(async (tx) => {
        return this.createJournalEntryInTransaction({ ...data, entryNumber }, tx)
      })

      return result
    })
  }

  private async createJournalEntryInTransaction(
    data: CreateJournalEntryInput & { createdBy: string, entryNumber?: string },
    tx: Prisma.TransactionClient
  ): Promise<JournalEntry & { lines: JournalLine[] }> {
    // Validate double-entry bookkeeping rules within transaction
    await this.validateJournalEntry(data, tx)

    // Generate unique entry number if not provided
    const entryNumber = data.entryNumber || await this.generateEntryNumber(tx)
    
    // Get exchange rate if not provided and currency is not USD
    let exchangeRate = data.exchangeRate
    if (!exchangeRate && data.currency !== 'USD') {
      try {
        exchangeRate = await this.currencyService.getExchangeRate(data.currency, 'USD')
      } catch {
        exchangeRate = 1.0
      }
    } else if (!exchangeRate) {
      exchangeRate = 1.0
    }
    
    // Create the journal entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber,
        date: data.date,
        description: data.description,
        reference: data.reference,
        currency: data.currency,
        exchangeRate,
        status: JournalStatus.DRAFT,
        createdBy: data.createdBy,
      }
    })

    // Create journal lines
    const lines = await Promise.all(
      data.lines.map(async (lineData) => {
        const line = await tx.journalLine.create({
          data: {
            journalEntryId: journalEntry.id,
            accountId: lineData.accountId,
            description: lineData.description,
            debitAmount: lineData.debitAmount,
            creditAmount: lineData.creditAmount,
            currency: data.currency,
            exchangeRate,
            baseDebitAmount: lineData.debitAmount * exchangeRate,
            baseCreditAmount: lineData.creditAmount * exchangeRate,
          }
        })
        return line
      })
    )

    return { ...journalEntry, lines }
  }

  async postJournalEntry(
    entryId: string,
    userId: string
  ): Promise<JournalEntry & { lines: JournalLine[] }> {
    return this.withLogging('postJournalEntry', async () => {
      const entry = await this.getJournalEntry(entryId)
      if (!entry) {
        throw new Error('Journal entry not found')
      }

      if (entry.status !== JournalStatus.DRAFT) {
        throw new Error('Only draft journal entries can be posted')
      }

      // Post the entry and update account balances in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update journal entry status
        const postedEntry = await tx.journalEntry.update({
          where: { id: entryId },
          data: {
            status: JournalStatus.POSTED,
            postedBy: userId,
            postedAt: new Date(),
          },
          include: {
            lines: {
              include: {
                account: true
              }
            }
          }
        })

        // Update account balances
        for (const line of postedEntry.lines) {
          if (line.debitAmount > 0) {
            await this.chartOfAccountsService.updateBalance(
              line.accountId,
              line.baseDebitAmount,
              'debit'
            )
          }
          if (line.creditAmount > 0) {
            await this.chartOfAccountsService.updateBalance(
              line.accountId,
              line.baseCreditAmount,
              'credit'
            )
          }
        }

        return postedEntry
      }, {
        maxWait: 10000, // 10 seconds
        timeout: 30000, // 30 seconds
      })

      // Audit log
      await this.auditService.logAction({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'JournalEntry',
        entityId: entryId,
        beforeData: { status: JournalStatus.DRAFT },
        afterData: { status: JournalStatus.POSTED, postedBy: userId, postedAt: result.postedAt },
      })

      return result
    })
  }

  async getJournalEntry(id: string): Promise<(JournalEntry & { lines: JournalLine[] }) | null> {
    return this.withLogging('getJournalEntry', async () => {
      return prisma.journalEntry.findUnique({
        where: { id },
        include: {
          lines: {
            include: {
              account: true
            }
          }
        }
      })
    })
  }

  async getAllJournalEntries(options?: {
    status?: JournalStatus
    dateFrom?: Date
    dateTo?: Date
    accountId?: string
    reference?: string
    limit?: number
    offset?: number
  }): Promise<(JournalEntry & { lines: JournalLine[] })[]> {
    return this.withLogging('getAllJournalEntries', async () => {
      const where: Prisma.JournalEntryWhereInput = {}

      if (options?.status) {
        where.status = options.status
      }

      if (options?.dateFrom || options?.dateTo) {
        where.date = {}
        if (options.dateFrom) {
          where.date.gte = options.dateFrom
        }
        if (options.dateTo) {
          where.date.lte = options.dateTo
        }
      }

      if (options?.reference) {
        where.reference = {
          contains: options.reference
        }
      }

      if (options?.accountId) {
        where.lines = {
          some: {
            accountId: options.accountId
          }
        }
      }

      return prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        take: options?.limit,
        skip: options?.offset,
      })
    })
  }

  async cancelJournalEntry(
    entryId: string,
    userId: string
  ): Promise<JournalEntry> {
    return this.withLogging('cancelJournalEntry', async () => {
      const entry = await this.getJournalEntry(entryId)
      if (!entry) {
        throw new Error('Journal entry not found')
      }

      if (entry.status === JournalStatus.CANCELLED) {
        throw new Error('Journal entry is already cancelled')
      }

      // For POSTED entries, reverse the account balance changes
      if (entry.status === JournalStatus.POSTED) {
        await prisma.$transaction(async (_tx) => {
          // Reverse account balances
          for (const line of entry.lines) {
            if (line.debitAmount > 0) {
              await this.chartOfAccountsService.updateBalance(
                line.accountId,
                line.baseDebitAmount,
                'credit' // Reverse the debit
              )
            }
            if (line.creditAmount > 0) {
              await this.chartOfAccountsService.updateBalance(
                line.accountId,
                line.baseCreditAmount,
                'debit' // Reverse the credit
              )
            }
          }
        })
      }

      // For DRAFT entries, just mark as cancelled without balance changes
      const cancelledEntry = await prisma.journalEntry.update({
        where: { id: entryId },
        data: {
          status: JournalStatus.CANCELLED,
        }
      })

      // Audit log
      await this.auditService.logAction({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'JournalEntry',
        entityId: entryId,
        beforeData: { status: entry.status },
        afterData: { status: JournalStatus.CANCELLED },
      })

      return cancelledEntry
    })
  }

  private async validateJournalEntry(
    data: CreateJournalEntryInput, 
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    // Must have at least 2 lines
    if (!data.lines || data.lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines')
    }

    // Validate all accounts exist
    for (const line of data.lines) {
      let account
      if (tx) {
        // Use transaction client to find account
        account = await tx.account.findUnique({
          where: { id: line.accountId }
        })
      } else {
        // Use chart of accounts service for validation outside transaction
        account = await this.chartOfAccountsService.getAccount(line.accountId)
      }
      
      if (!account) {
        throw new Error(`Account ${line.accountId} not found`)
      }
    }

    // Calculate totals
    const totalDebits = data.lines.reduce((sum, line) => sum + line.debitAmount, 0)
    const totalCredits = data.lines.reduce((sum, line) => sum + line.creditAmount, 0)

    // Validate double-entry rule: debits must equal credits
    const tolerance = 0.01 // Allow small rounding differences
    if (Math.abs(totalDebits - totalCredits) > tolerance) {
      throw new Error(
        `Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`
      )
    }

    // Validate each line has either debit or credit (but not both)
    for (const line of data.lines) {
      const hasDebit = line.debitAmount > 0
      const hasCredit = line.creditAmount > 0

      if (hasDebit && hasCredit) {
        throw new Error('Journal line cannot have both debit and credit amounts')
      }

      if (!hasDebit && !hasCredit) {
        throw new Error('Journal line must have either debit or credit amount')
      }
    }
  }

  private async generateEntryNumber(tx?: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `JE${year}`
    
    const client = tx || prisma
    
    // Get the latest entry number for this year
    const latestEntry = await client.journalEntry.findFirst({
      where: {
        entryNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        entryNumber: 'desc'
      }
    })

    let nextNumber = 1
    if (latestEntry) {
      const currentNumber = parseInt(latestEntry.entryNumber.substring(prefix.length))
      nextNumber = currentNumber + 1
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`
  }

  /**
   * Convert journal entry amounts to a target currency
   */
  async convertJournalEntryToCurrency(
    entryId: string,
    targetCurrency: string
  ): Promise<JournalEntry & { lines: JournalLine[] }> {
    return this.withLogging('convertJournalEntryToCurrency', async () => {
      const entry = await this.getJournalEntry(entryId)
      if (!entry) {
        throw new Error('Journal entry not found')
      }

      if (entry.currency === targetCurrency) {
        return entry // No conversion needed
      }

      const exchangeRate = await this.currencyService.getExchangeRate(entry.currency, targetCurrency)

      // Convert entry header
      const convertedEntry = {
        ...entry,
        currency: targetCurrency,
        exchangeRate,
        lines: entry.lines.map(line => ({
          ...line,
          currency: targetCurrency,
          exchangeRate,
          debitAmount: line.debitAmount * exchangeRate,
          creditAmount: line.creditAmount * exchangeRate,
          // Keep original base amounts for audit trail
          baseDebitAmount: line.baseDebitAmount,
          baseCreditAmount: line.baseCreditAmount
        }))
      }

      return convertedEntry
    })
  }

  /**
   * Calculate foreign exchange gain/loss for a journal entry
   */
  async calculateFXGainLoss(
    entryId: string,
    _currentDate?: Date
  ): Promise<{
    fxGainLoss: number
    isGain: boolean
    originalValue: number
    currentValue: number
    currency: string
  }> {
    return this.withLogging('calculateFXGainLoss', async () => {
      const entry = await this.getJournalEntry(entryId)
      if (!entry) {
        throw new Error('Journal entry not found')
      }

      if (entry.currency === 'USD') {
        return {
          fxGainLoss: 0,
          isGain: false,
          originalValue: entry.lines.reduce((sum, line) => sum + line.debitAmount, 0),
          currentValue: entry.lines.reduce((sum, line) => sum + line.debitAmount, 0),
          currency: 'USD'
        }
      }

      // Get current exchange rate
      const currentRate = await this.currencyService.getExchangeRate(entry.currency, 'USD')
      const originalRate = entry.exchangeRate

      const originalValue = entry.lines.reduce((sum, line) => sum + line.debitAmount, 0)
      const currentValue = originalValue * currentRate / originalRate

      const fxGainLoss = Math.abs(currentValue - originalValue)
      const isGain = currentValue > originalValue

      return {
        fxGainLoss,
        isGain,
        originalValue,
        currentValue,
        currency: entry.currency
      }
    })
  }

  /**
   * Create FX revaluation journal entry
   */
  async createFXRevaluationEntry(
    originalEntryId: string,
    userId: string,
    revaluationDate: Date = new Date()
  ): Promise<JournalEntry & { lines: JournalLine[] }> {
    return this.withLogging('createFXRevaluationEntry', async () => {
      const fxResult = await this.calculateFXGainLoss(originalEntryId, revaluationDate)
      
      if (fxResult.fxGainLoss === 0) {
        throw new Error('No FX gain/loss to revalue')
      }

      // Get FX gain/loss accounts (would need to be configured)
      const fxGainAccountId = await this.getFXAccount(true) // FX Gain account
      const fxLossAccountId = await this.getFXAccount(false) // FX Loss account
      const retainedEarningsAccountId = await this.getRetainedEarningsAccount()

      const lines = []
      
      if (fxResult.isGain) {
        // Debit Retained Earnings, Credit FX Gain
        lines.push({
          accountId: retainedEarningsAccountId,
          description: 'FX revaluation adjustment',
          debitAmount: fxResult.fxGainLoss,
          creditAmount: 0
        })
        lines.push({
          accountId: fxGainAccountId,
          description: 'FX gain recognized',
          debitAmount: 0,
          creditAmount: fxResult.fxGainLoss
        })
      } else {
        // Debit FX Loss, Credit Retained Earnings
        lines.push({
          accountId: fxLossAccountId,
          description: 'FX loss recognized',
          debitAmount: fxResult.fxGainLoss,
          creditAmount: 0
        })
        lines.push({
          accountId: retainedEarningsAccountId,
          description: 'FX revaluation adjustment',
          debitAmount: 0,
          creditAmount: fxResult.fxGainLoss
        })
      }

      return this.createJournalEntry({
        date: revaluationDate,
        description: `FX revaluation for ${fxResult.currency} - ${fxResult.isGain ? 'Gain' : 'Loss'}`,
        reference: `FX-${originalEntryId}`,
        currency: 'USD',
        exchangeRate: 1.0,
        lines,
        createdBy: userId
      })
    })
  }

  // Helper methods for FX accounts (would need to be configured per organization)
  private async getFXAccount(isGain: boolean): Promise<string> {
    const accountCode = isGain ? '4900' : '5900' // Common codes for FX accounts
    const account = await prisma.account.findFirst({
      where: { code: accountCode }
    })
    
    if (!account) {
      throw new Error(`${isGain ? 'FX Gain' : 'FX Loss'} account not found. Please create account ${accountCode}`)
    }
    
    return account.id
  }

  private async getRetainedEarningsAccount(): Promise<string> {
    const account = await prisma.account.findFirst({
      where: { code: '3000' } // Common code for Retained Earnings
    })
    
    if (!account) {
      throw new Error('Retained Earnings account not found. Please create account 3000')
    }
    
    return account.id
  }
}