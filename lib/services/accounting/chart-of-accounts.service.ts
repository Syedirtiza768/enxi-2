import { prisma } from '@/lib/db/prisma'
import { AuditService } from '../audit.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { 
  Account,
  Prisma
} from "@prisma/client"
import { 
  AccountType,
  AccountStatus,
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
    type: 'debit' | 'credit',
    tx?: Prisma.TransactionClient
  ): Promise<Account> {
    const client = tx || prisma
    
    const account = await client.account.findUnique({
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

    return client.account.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: balanceChange
        }
      }
    })
  }

  async createStandardCOA(currency: string, userId: string): Promise<void> {
    // Import default chart of accounts
    const { DEFAULT_CHART_OF_ACCOUNTS } = await import('@/lib/constants/default-accounts')
    const standardAccounts = DEFAULT_CHART_OF_ACCOUNTS

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
        isSystemAccount: (accountData as any).isSystem || false,
      })

      accountMap.set(account.code, account.id)
    }
  }
}