import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { SalesCaseWithDetails } from './sales-case.service'
import { AuditService } from './audit.service'
import { ChartOfAccountsService } from './accounting/chart-of-accounts.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { 
  Customer,
  AccountType,
  LeadStatus,
  Prisma
} from '@/lib/generated/prisma'

export interface CreateCustomerInput {
  name: string
  email: string
  phone?: string
  industry?: string
  website?: string
  address?: string
  taxId?: string
  currency?: string
  creditLimit?: number
  paymentTerms?: number
  leadId?: string
}

export interface UpdateCustomerInput {
  name?: string
  email?: string
  phone?: string
  industry?: string
  website?: string
  address?: string
  taxId?: string
  currency?: string
  creditLimit?: number
  paymentTerms?: number
}

export interface CreditCheckResult {
  customerId: string
  creditLimit: number
  usedCredit: number
  availableCredit: number
  isWithinLimit: boolean
  outstandingInvoices: number
  overdueAmount: number
}

export class CustomerService extends BaseService {
  private auditService: AuditService
  private coaService: ChartOfAccountsService

  constructor() {
    super('CustomerService')
    this.auditService = new AuditService()
    this.coaService = new ChartOfAccountsService()
  }

  async createCustomer(
    data: CreateCustomerInput & { createdBy: string }
  ): Promise<Customer> {
    return this.withLogging('createCustomer', async () => {

      // Check if email already exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { email: data.email }
      })

      if (existingCustomer) {
        throw new Error('Customer with this email already exists')
      }

      // First, prepare all data outside the transaction
      const customerNumber = await this.generateCustomerNumber()
      const parentAccountId = await this.getOrCreateARParentAccount(data.createdBy)

      // Create AR account first (outside transaction to avoid timeout)
      let arAccount
      try {
        // Generate unique account code with timestamp to avoid conflicts
        const timestamp = Date.now().toString().slice(-6)
        const accountCode = `1200-${customerNumber}-${timestamp}`
        
        arAccount = await prisma.account.create({
          data: {
            code: accountCode,
            name: `AR - ${data.name}`,
            type: AccountType.ASSET,
            currency: data.currency || 'AED',
            description: `Accounts Receivable for ${data.name}`,
            parentId: parentAccountId || undefined,
            createdBy: data.createdBy
          }
        })
      } catch (error) {
        // Fallback: create without parent if there's an issue
        const fallbackCode = `AR-${customerNumber}-${Date.now()}`
        arAccount = await prisma.account.create({
          data: {
            code: fallbackCode,
            name: `AR - ${data.name}`,
            type: AccountType.ASSET,
            currency: data.currency || 'AED',
            description: `Accounts Receivable for ${data.name}`,
            createdBy: data.createdBy
          }
        })
      }

      // Create customer with a shorter transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create customer
        const customer = await tx.customer.create({
          data: {
            customerNumber,
            name: data.name,
            email: data.email,
            phone: data.phone,
            industry: data.industry,
            website: data.website,
            address: data.address,
            taxId: data.taxId,
            currency: data.currency || 'AED',
            creditLimit: data.creditLimit || 0,
            paymentTerms: data.paymentTerms || 30,
            leadId: data.leadId,
            accountId: arAccount.id,
            createdBy: data.createdBy
          },
          include: {
            account: true,
            lead: true
          }
        })

        // Update lead status if converting from lead
        if (data.leadId) {
          await tx.lead.update({
            where: { id: data.leadId },
            data: { status: LeadStatus.CONVERTED }
          })
        }

        return customer
      }, {
        maxWait: 10000, // Increase max wait time
        timeout: 20000  // Increase timeout
      })

      // Audit log
      await this.auditService.logAction({
        userId: data.createdBy,
        action: AuditAction.CREATE,
        entityType: 'Customer',
        entityId: result.id,
        afterData: result,
      })

      return result
    })
  }

  async updateCustomer(
    id: string,
    data: UpdateCustomerInput,
    userId: string
  ): Promise<Customer> {
    return this.withLogging('updateCustomer', async () => {

      const existingCustomer = await this.getCustomer(id)
      if (!existingCustomer) {
        throw new Error('Customer not found')
      }

      // Check if email is being changed and already exists
      if (data.email && data.email !== existingCustomer.email) {
        const emailExists = await prisma.customer.findUnique({
          where: { email: data.email }
        })
        if (emailExists) {
          throw new Error('Customer with this email already exists')
        }
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          account: true,
          lead: true
        }
      })

      // Audit log
      await this.auditService.logAction({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Customer',
        entityId: id,
        beforeData: existingCustomer,
        afterData: updatedCustomer,
      })

      return updatedCustomer
    })
  }

  async getCustomer(id: string) {
    return this.withLogging('getCustomer', async () => {
      
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          account: true,
          lead: true,
          salesCases: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      })

      if (!customer) {
      } else {
      }

      return customer
    })
  }

  async getAllCustomers(options?: {
    search?: string
    currency?: string
    limit?: number
    offset?: number
  }): Promise<Customer[]> {
    return this.withLogging('getAllCustomers', async () => {

      const where: Prisma.CustomerWhereInput = {}

      if (options?.search) {
        where.OR = [
          { name: { contains: options.search } },
          { email: { contains: options.search } },
          { customerNumber: { contains: options.search } }
        ]
      }

      if (options?.currency) {
        where.currency = options.currency
      }

      const customers = await prisma.customer.findMany({
        where,
        include: {
          account: true,
          lead: true
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit,
        skip: options?.offset
      })


      return customers
    })
  }

  async convertLeadToCustomer(
    leadId: string,
    additionalData: Partial<CreateCustomerInput> & { createSalesCase?: boolean; salesCaseTitle?: string },
    userId: string
  ): Promise<{ customer: Customer; salesCase?: SalesCaseWithDetails }> {
    return this.withLogging('convertLeadToCustomer', async () => {

      const lead = await prisma.lead.findUnique({
        where: { id: leadId }
      })

      if (!lead) {
        throw new Error('Lead not found')
      }

      if (lead.status === LeadStatus.CONVERTED) {
        throw new Error('Lead has already been converted')
      }

      // Use the enhanced lead service for conversion
      const { LeadService } = await import('./lead.service')
      const leadService = new LeadService()
      
      const customerData = {
        name: additionalData.name || lead.company || `${lead.firstName} ${lead.lastName}`,
        email: additionalData.email || lead.email,
        phone: additionalData.phone || lead.phone || undefined,
        industry: additionalData.industry,
        website: additionalData.website,
        address: additionalData.address,
        taxId: additionalData.taxId,
        currency: additionalData.currency || 'AED',
        creditLimit: additionalData.creditLimit || 0,
        paymentTerms: additionalData.paymentTerms || 30
      }


      const result = await leadService.convertLead({
        leadId,
        customerData,
        createSalesCase: additionalData.createSalesCase,
        salesCaseTitle: additionalData.salesCaseTitle,
        convertedBy: userId
      })


      return result
    })
  }

  async performCreditCheck(customerId: string): Promise<CreditCheckResult> {
    return this.withLogging('performCreditCheck', async () => {

      const customer = await this.getCustomer(customerId)
      if (!customer) {
        throw new Error('Customer not found')
      }

      // Get outstanding invoices (placeholder - will be implemented with invoice module)
      // For now, we'll use the account balance as a proxy
      const accountBalance = customer.account?.balance || 0
      const outstandingInvoices = Math.max(0, accountBalance)
      
      // Calculate overdue amount (placeholder)
      const overdueAmount = 0 // Will be calculated from invoice due dates

      const usedCredit = outstandingInvoices
      const availableCredit = Math.max(0, customer.creditLimit - usedCredit)

      const creditCheckResult: CreditCheckResult = {
        customerId: customer.id,
        creditLimit: customer.creditLimit,
        usedCredit,
        availableCredit,
        isWithinLimit: usedCredit <= customer.creditLimit,
        outstandingInvoices,
        overdueAmount
      }


      return creditCheckResult
    })
  }

  async updateCreditLimit(
    customerId: string,
    newCreditLimit: number,
    userId: string
  ): Promise<Customer> {
    return this.withLogging('updateCreditLimit', async () => {

      const customer = await this.getCustomer(customerId)
      if (!customer) {
        throw new Error('Customer not found')
      }

      // Perform credit check before updating
      const creditCheck = await this.performCreditCheck(customerId)
      
      if (newCreditLimit < creditCheck.usedCredit) {
        throw new Error(
          `Cannot set credit limit below current used credit of ${creditCheck.usedCredit}`
        )
      }

      const updatedCustomer = await this.updateCustomer(
        customerId,
        { creditLimit: newCreditLimit },
        userId
      )


      return updatedCustomer
    })
  }

  async getCustomerBalance(customerId: string): Promise<{
    customer: Customer
    accountBalance: number
    creditStatus: CreditCheckResult
  }> {
    return this.withLogging('getCustomerBalance', async () => {

      const customer = await this.getCustomer(customerId)
      if (!customer) {
        throw new Error('Customer not found')
      }

      const accountBalance = customer.account?.balance || 0

      const creditStatus = await this.performCreditCheck(customerId)

      const result = {
        customer,
        accountBalance,
        creditStatus
      }


      return result
    })
  }

  private async generateCustomerNumber(): Promise<string> {
    // Use a more robust approach with retry logic
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      try {
        // Get the count of existing customers
        const customerCount = await prisma.customer.count()
        
        // Generate a number based on count + timestamp for uniqueness
        const timestamp = Date.now().toString().slice(-4)
        const baseNumber = customerCount + 1
        const customerNumber = `CUST-${baseNumber.toString().padStart(4, '0')}-${timestamp}`
        
        // Check if this number already exists
        const exists = await prisma.customer.findFirst({
          where: { customerNumber }
        })
        
        if (!exists) {
          return customerNumber
        }
        
        attempts++
      } catch (error) {
        attempts++
        if (attempts >= maxAttempts) {
          // Final fallback: use full timestamp
          return `CUST-${Date.now()}`
        }
      }
    }
    
    // Ultimate fallback
    return `CUST-${Date.now()}`
  }

  private async getOrCreateARParentAccount(userId: string): Promise<string> {
    try {
      // Find or create parent AR account
      let parentAccount = await prisma.account.findFirst({
        where: {
          code: '1200',
          type: AccountType.ASSET
        }
      })

      if (!parentAccount) {
        // Try to create the parent account
        try {
          parentAccount = await prisma.account.create({
            data: {
              code: '1200',
              name: 'Accounts Receivable',
              type: AccountType.ASSET,
              currency: 'USD',
              description: 'Customer accounts receivable',
              createdBy: userId
            }
          })
        } catch (error) {
          // If creation fails due to race condition, try to find it again
          parentAccount = await prisma.account.findFirst({
            where: {
              code: '1200',
              type: AccountType.ASSET
            }
          })
          
          if (!parentAccount) {
            // If still not found, create with unique code
            parentAccount = await prisma.account.create({
              data: {
                code: `1200-AR-${Date.now()}`,
                name: 'Accounts Receivable',
                type: AccountType.ASSET,
                currency: 'USD',
                description: 'Customer accounts receivable',
                createdBy: userId
              }
            })
          }
        }
      }

      return parentAccount.id
    } catch (error) {
      console.error('Error in getOrCreateARParentAccount:', error)
      // Return empty string to allow customer creation to continue without parent
      return ''
    }
  }
}