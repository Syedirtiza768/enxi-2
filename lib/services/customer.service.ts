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

      // Create customer with AR account in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Generate customer number
        const customerNumber = await this.generateCustomerNumber()

        // Create AR account for the customer
        const arAccount = await this.coaService.createAccount({
          code: `1200-${customerNumber}`,
          name: `AR - ${data.name}`,
          type: AccountType.ASSET,
          currency: data.currency || 'USD',
          description: `Accounts Receivable for ${data.name}`,
          parentId: await this.getOrCreateARParentAccount(data.createdBy),
          createdBy: data.createdBy
        })

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
            currency: data.currency || 'USD',
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
        currency: additionalData.currency || 'USD',
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
    
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { customerNumber: 'desc' }
    })

    if (!lastCustomer) {
      return 'CUST-0001'
    }

    const lastNumber = parseInt(lastCustomer.customerNumber.split('-')[1])
    const newNumber = lastNumber + 1
    const generatedNumber = `CUST-${newNumber.toString().padStart(4, '0')}`
    
    
    return generatedNumber
  }

  private async getOrCreateARParentAccount(userId: string): Promise<string> {
    
    // Find or create parent AR account
    let parentAccount = await prisma.account.findFirst({
      where: {
        code: '1200',
        type: AccountType.ASSET
      }
    })

    if (!parentAccount) {
      parentAccount = await this.coaService.createAccount({
        code: '1200',
        name: 'Accounts Receivable',
        type: AccountType.ASSET,
        currency: 'USD',
        description: 'Customer accounts receivable',
        createdBy: userId
      })
    } else {
    }

    return parentAccount.id
  }
}