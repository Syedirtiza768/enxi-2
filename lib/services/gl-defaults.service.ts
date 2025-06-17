import { prisma } from '@/lib/db/prisma';
import { BaseService } from './base.service';
import { Account } from '@prisma/client';

/**
 * Service to manage GL account defaults and mappings
 * Since CompanySettings doesn't have GL fields, this service
 * provides a centralized way to get default accounts
 */
export class GLDefaultsService extends BaseService {
  private static instance: GLDefaultsService;
  private accountCache: Map<string, Account> = new Map();

  constructor() {
    super('GLDefaultsService');
  }

  public static getInstance(): GLDefaultsService {
    if (!GLDefaultsService.instance) {
      GLDefaultsService.instance = new GLDefaultsService();
    }
    return GLDefaultsService.instance;
  }

  /**
   * Get default GL accounts based on system account flags
   */
  async getDefaultAccounts(companyId: string) {
    return this.withLogging('getDefaultAccounts', async () => {
      const systemAccounts = await prisma.account.findMany({
        where: {
          companyId,
          isSystemAccount: true,
          isActive: true
        }
      });

      const defaults = {
        // Assets
        cash: this.findAccountByCode(systemAccounts, '1113'), // Cash in Banks - Checking
        accountsReceivable: this.findAccountByCode(systemAccounts, '1121'), // Trade Receivables
        inventory: this.findAccountByCode(systemAccounts, '1134'), // Merchandise Inventory
        
        // Liabilities
        accountsPayable: this.findAccountByCode(systemAccounts, '2111'), // Trade Payables
        salesTaxPayable: this.findAccountByCode(systemAccounts, '2131'), // Sales Tax Payable
        
        // Income
        salesRevenue: this.findAccountByCode(systemAccounts, '4110'), // Product Sales
        serviceRevenue: this.findAccountByCode(systemAccounts, '4120'), // Service Revenue
        
        // Expenses
        costOfGoodsSold: this.findAccountByCode(systemAccounts, '5110'), // Materials Cost
        officeExpense: this.findAccountByCode(systemAccounts, '6220'), // Office Supplies
        
        // Retained Earnings
        retainedEarnings: this.findAccountByCode(systemAccounts, '3210') // Retained Earnings
      };

      return defaults;
    });
  }

  /**
   * Get account by code with caching
   */
  async getAccountByCode(code: string, companyId: string): Promise<Account | null> {
    const cacheKey = `${companyId}:${code}`;
    
    if (this.accountCache.has(cacheKey)) {
      return this.accountCache.get(cacheKey)!;
    }

    const account = await prisma.account.findFirst({
      where: {
        code,
        companyId,
        isActive: true
      }
    });

    if (account) {
      this.accountCache.set(cacheKey, account);
    }

    return account;
  }

  /**
   * Get GL mapping for a transaction type
   */
  async getTransactionMapping(transactionType: string, companyId: string) {
    const defaults = await this.getDefaultAccounts(companyId);

    const mappings: Record<string, any> = {
      SALES_INVOICE: {
        debit: [
          { account: defaults.accountsReceivable, description: 'Customer receivable' }
        ],
        credit: [
          { account: defaults.salesRevenue, description: 'Sales revenue' },
          { account: defaults.salesTaxPayable, description: 'Sales tax collected' }
        ]
      },
      
      SALES_RECEIPT: {
        debit: [
          { account: defaults.cash, description: 'Cash received' }
        ],
        credit: [
          { account: defaults.accountsReceivable, description: 'Clear receivable' }
        ]
      },
      
      PURCHASE_INVOICE: {
        debit: [
          { account: defaults.inventory, description: 'Inventory received' }
        ],
        credit: [
          { account: defaults.accountsPayable, description: 'Vendor payable' }
        ]
      },
      
      PURCHASE_PAYMENT: {
        debit: [
          { account: defaults.accountsPayable, description: 'Clear payable' }
        ],
        credit: [
          { account: defaults.cash, description: 'Cash paid' }
        ]
      },
      
      COGS_ENTRY: {
        debit: [
          { account: defaults.costOfGoodsSold, description: 'Cost of goods sold' }
        ],
        credit: [
          { account: defaults.inventory, description: 'Reduce inventory' }
        ]
      },
      
      EXPENSE_PAYMENT: {
        debit: [
          { account: defaults.officeExpense, description: 'Expense' }
        ],
        credit: [
          { account: defaults.cash, description: 'Cash paid' }
        ]
      }
    };

    return mappings[transactionType] || null;
  }

  /**
   * Validate GL accounts exist before posting
   */
  async validateAccounts(accountIds: string[], companyId: string): Promise<boolean> {
    const accounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        companyId,
        isActive: true
      }
    });

    return accounts.length === accountIds.length;
  }

  /**
   * Get account for specific item
   */
  async getItemAccounts(itemId: string) {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        inventoryAccount: true,
        cogsAccount: true,
        salesAccount: true
      }
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // If item doesn't have accounts, get defaults
    if (!item.inventoryAccount || !item.cogsAccount || !item.salesAccount) {
      const defaults = await this.getDefaultAccounts(item.categoryId); // Assuming categoryId relates to company
      
      return {
        inventory: item.inventoryAccount || defaults.inventory,
        cogs: item.cogsAccount || defaults.costOfGoodsSold,
        sales: item.salesAccount || defaults.salesRevenue
      };
    }

    return {
      inventory: item.inventoryAccount,
      cogs: item.cogsAccount,
      sales: item.salesAccount
    };
  }

  /**
   * Get tax accounts
   */
  async getTaxAccounts(taxRateId: string) {
    const taxRate = await prisma.taxRate.findUnique({
      where: { id: taxRateId },
      include: {
        collectedAccount: true,
        paidAccount: true
      }
    });

    if (!taxRate) {
      throw new Error('Tax rate not found');
    }

    // If tax rate doesn't have accounts, get defaults
    if (!taxRate.collectedAccount) {
      const defaults = await this.getDefaultAccounts(taxRate.companyId);
      
      return {
        collected: defaults.salesTaxPayable,
        paid: taxRate.paidAccount
      };
    }

    return {
      collected: taxRate.collectedAccount,
      paid: taxRate.paidAccount
    };
  }

  /**
   * Clear account cache (call when accounts are updated)
   */
  clearCache() {
    this.accountCache.clear();
  }

  /**
   * Helper to find account by code
   */
  private findAccountByCode(accounts: Account[], code: string): Account | null {
    return accounts.find(a => a.code === code) || null;
  }
}