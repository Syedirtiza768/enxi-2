import { prisma } from '@/lib/db/prisma'
import { AuditService } from '../audit.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { 
  AccountType, 
  AccountStatus,
  Account,
  Prisma
} from '@/lib/generated/prisma'
import { 
  CreateAccountInput, 
  UpdateAccountInput, 
  AccountTree,
  getNormalBalance,
  TransactionType
} from '@/lib/types/accounting.types'

export class ChartOfAccountsService {
  private auditService: AuditService

  constructor() {
    this.auditService = new AuditService()
  }

  async createAccount(data: CreateAccountInput & { createdBy: string }): Promise<Account> {
    // Check if account code already exists
    const existingAccount = await prisma.account.findUnique({
      where: { code: data.code }
    })

    if (existingAccount) {
      throw new Error('Account code already exists')
    }

    // If parent is specified, validate it exists and types match
    if (data.parentId) {
      const parentAccount = await prisma.account.findUnique({
        where: { id: data.parentId }
      })

      if (!parentAccount) {
        throw new Error('Parent account not found')
      }

      if (parentAccount.type !== data.type) {
        throw new Error('Account type must match parent account type')
      }
    }

    const account = await prisma.account.create({
      data: {
        ...data,
        createdBy: data.createdBy,
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId: data.createdBy,
      action: AuditAction.CREATE,
      entityType: 'Account',
      entityId: account.id,
      afterData: account,
    })

    return account
  }

  async updateAccount(
    id: string,
    data: UpdateAccountInput,
    userId: string
  ): Promise<Account> {
    const existingAccount = await prisma.account.findUnique({
      where: { id }
    })

    if (!existingAccount) {
      throw new Error('Account not found')
    }

    if (existingAccount.isSystemAccount) {
      throw new Error('System accounts cannot be modified')
    }

    const account = await prisma.account.update({
      where: { id },
      data
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Account',
      entityId: account.id,
      beforeData: existingAccount,
      afterData: account,
    })

    return account
  }

  async getAccount(id: string): Promise<Account | null> {
    return prisma.account.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      }
    })
  }

  async getAllAccounts(options?: {
    type?: AccountType
    status?: AccountStatus
    currency?: string
  }): Promise<Account[]> {
    const where: Prisma.AccountWhereInput = {}

    if (options?.type) {
      where.type = options.type
    }
    if (options?.status) {
      where.status = options.status
    }
    if (options?.currency) {
      where.currency = options.currency
    }

    return prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        parent: true,
      }
    })
  }

  async getAccountTree(): Promise<AccountTree[]> {
    const accounts = await prisma.account.findMany({
      orderBy: { code: 'asc' },
      include: {
        children: {
          orderBy: { code: 'asc' },
          include: {
            children: {
              orderBy: { code: 'asc' }
            }
          }
        }
      }
    })

    // Build tree structure - only return top-level accounts
    return accounts
      .filter(account => !account.parentId)
      .map(account => this.mapToAccountTree(account))
  }

  private mapToAccountTree(account: Account & { children?: (Account & { children?: Account[] })[] }): AccountTree {
    return {
      ...account,
      children: account.children?.map((child) => this.mapToAccountTree(child)) || []
    }
  }

  async updateBalance(
    accountId: string,
    amount: number,
    type: 'debit' | 'credit'
  ): Promise<Account> {
    const account = await prisma.account.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // Calculate new balance based on normal balance
    const normalBalance = getNormalBalance(account.type)
    let balanceChange = amount

    // If transaction type matches normal balance, increase balance
    // If opposite, decrease balance
    if (
      (normalBalance === TransactionType.DEBIT && type === 'credit') ||
      (normalBalance === TransactionType.CREDIT && type === 'debit')
    ) {
      balanceChange = -amount
    }

    return prisma.account.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: balanceChange
        }
      }
    })
  }

  async createStandardCOA(currency: string, userId: string): Promise<void> {
    const standardAccounts = [
      // Assets (1000s)
      { code: '1000', name: 'Assets', type: AccountType.ASSET },
      { code: '1100', name: 'Current Assets', type: AccountType.ASSET, parentCode: '1000' },
      { code: '1110', name: 'Cash', type: AccountType.ASSET, parentCode: '1100' },
      { code: '1120', name: 'Accounts Receivable', type: AccountType.ASSET, parentCode: '1100' },
      { code: '1130', name: 'Inventory', type: AccountType.ASSET, parentCode: '1100' },
      { code: '1200', name: 'Fixed Assets', type: AccountType.ASSET, parentCode: '1000' },
      { code: '1210', name: 'Equipment', type: AccountType.ASSET, parentCode: '1200' },
      { code: '1220', name: 'Accumulated Depreciation', type: AccountType.ASSET, parentCode: '1200' },

      // Liabilities (2000s)
      { code: '2000', name: 'Liabilities', type: AccountType.LIABILITY },
      { code: '2100', name: 'Current Liabilities', type: AccountType.LIABILITY, parentCode: '2000' },
      { code: '2110', name: 'Accounts Payable', type: AccountType.LIABILITY, parentCode: '2100' },
      { code: '2120', name: 'Accrued Expenses', type: AccountType.LIABILITY, parentCode: '2100' },
      { code: '2200', name: 'Long-term Liabilities', type: AccountType.LIABILITY, parentCode: '2000' },

      // Equity (3000s)
      { code: '3000', name: 'Equity', type: AccountType.EQUITY },
      { code: '3100', name: 'Share Capital', type: AccountType.EQUITY, parentCode: '3000' },
      { code: '3200', name: 'Retained Earnings', type: AccountType.EQUITY, parentCode: '3000' },

      // Income (4000s)
      { code: '4000', name: 'Income', type: AccountType.INCOME },
      { code: '4100', name: 'Sales Revenue', type: AccountType.INCOME, parentCode: '4000' },
      { code: '4200', name: 'Service Revenue', type: AccountType.INCOME, parentCode: '4000' },
      { code: '4300', name: 'Other Income', type: AccountType.INCOME, parentCode: '4000' },

      // Expenses (5000s)
      { code: '5000', name: 'Expenses', type: AccountType.EXPENSE },
      { code: '5100', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, parentCode: '5000' },
      { code: '5200', name: 'Operating Expenses', type: AccountType.EXPENSE, parentCode: '5000' },
      { code: '5210', name: 'Salaries and Wages', type: AccountType.EXPENSE, parentCode: '5200' },
      { code: '5220', name: 'Rent Expense', type: AccountType.EXPENSE, parentCode: '5200' },
      { code: '5230', name: 'Utilities Expense', type: AccountType.EXPENSE, parentCode: '5200' },
    ]

    // Create accounts in order (parents first)
    const accountMap = new Map<string, string>() // code -> id mapping

    for (const accountData of standardAccounts) {
      let parentId: string | undefined = undefined
      
      if (accountData.parentCode) {
        parentId = accountMap.get(accountData.parentCode)
      }

      const account = await this.createAccount({
        code: accountData.code,
        name: accountData.name,
        type: accountData.type,
        currency,
        parentId,
        createdBy: userId,
        description: `Standard ${accountData.name} account`,
      })

      accountMap.set(account.code, account.id)
    }
  }
}