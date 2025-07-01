import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { SalesCaseWithDetails } from './sales-case.service'
import { AuditService } from './audit.service'
import { ChartOfAccountsService } from './accounting/chart-of-accounts.service'
import { AuditAction, EntityType } from '@/lib/validators/audit.validator'
import { 
  Customer,
  Prisma
} from "@prisma/client"
import { LeadStatus } from "@/lib/types/shared-enums"

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

export interface BulkImportCustomerInput {
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
}

export interface BulkImportResult {
  totalRecords: number
  successCount: number
  failureCount: number
  errors: Array<{
    row: number
    email: string
    error: string
  }>
  createdCustomers: Customer[]
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
            type: 'ASSET',
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
            type: 'ASSET',
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
        entityType: EntityType.CUSTOMER,
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
        entityType: EntityType.CUSTOMER,
        entityId: id,
        beforeData: existingCustomer,
        afterData: updatedCustomer,
      })

      return updatedCustomer
    })
  }

  async getCustomer(id: string): Promise<Customer | null> {
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
    industry?: string
    status?: 'active' | 'inactive'
    hasOutstanding?: boolean
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    page?: number
    limit?: number
    offset?: number
  }): Promise<{
    customers: Customer[]
    total: number
    stats: {
      total: number
      active: number
      inactive: number
      totalCreditLimit: number
      totalOutstanding: number
    }
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    return this.withLogging('getAllCustomers', async () => {
      const where: Prisma.CustomerWhereInput = {}

      // Search filter
      if (options?.search) {
        where.OR = [
          { name: { contains: options.search } },
          { email: { contains: options.search } },
          { customerNumber: { contains: options.search } },
          { phone: { contains: options.search } }
        ]
      }

      // Currency filter
      if (options?.currency) {
        where.currency = options.currency
      }

      // Industry filter
      if (options?.industry) {
        where.industry = options.industry
      }

      // Status filter - removed as Customer doesn't have isActive field

      // Outstanding balance filter - removed as account relation doesn't have balance field

      // Date range filter
      if (options?.dateFrom || options?.dateTo) {
        where.createdAt = {}
        if (options.dateFrom) {
          where.createdAt.gte = new Date(options.dateFrom)
        }
        if (options.dateTo) {
          where.createdAt.lte = new Date(options.dateTo)
        }
      }

      // Pagination
      const page = options?.page || 1
      const limit = options?.limit || 20
      const offset = options?.offset || (page - 1) * limit

      // Sorting
      let orderBy: Prisma.CustomerOrderByWithRelationInput = { createdAt: 'desc' }
      if (options?.sortBy) {
        const direction = options.sortOrder || 'asc'
        switch (options.sortBy) {
          case 'name':
            orderBy = { name: direction }
            break
          case 'email':
            orderBy = { email: direction }
            break
          case 'currency':
            orderBy = { currency: direction }
            break
          case 'creditLimit':
            orderBy = { creditLimit: direction }
            break
          case 'createdAt':
            orderBy = { createdAt: direction }
            break
          case 'balance':
            orderBy = { account: { balance: direction } }
            break
          default:
            orderBy = { createdAt: 'desc' }
        }
      }

      // Get customers with pagination - optimize includes
      const [customers, totalCount] = await Promise.all([
        prisma.customer.findMany({
          where,
          include: {
            account: {
              select: {
                id: true,
                balance: true
              }
            },
            assignedTo: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            _count: {
              select: {
                salesCases: true,
                invoices: true
              }
            }
          },
          orderBy,
          take: limit,
          skip: offset
        }),
        prisma.customer.count({ where })
      ])

      // Calculate stats only if needed (skip on subsequent pages)
      const stats = page === 1 
        ? await this.getCustomerStats()
        : {
            total: totalCount,
            active: totalCount,
            inactive: 0,
            totalCreditLimit: 0,
            totalOutstanding: 0
          }

      // Pagination info
      const totalPages = Math.ceil(totalCount / limit)
      const pagination = {
        page,
        limit,
        total: totalCount,
        totalPages
      }

      return {
        customers,
        total: totalCount,
        stats,
        pagination
      }
    })
  }

  async getCustomerStats(): Promise<{
    total: number
    active: number
    inactive: number
    totalCreditLimit: number
    totalOutstanding: number
  }> {
    return this.withLogging('getCustomerStats', async () => {
      // Single aggregation query for customer stats
      const customerStats = await prisma.customer.aggregate({
        _count: true,
        _sum: {
          creditLimit: true
        }
      })

      // Get outstanding balance from accounts
      const totalOutstanding = await prisma.account.aggregate({
        _sum: { balance: true },
        where: {
          customer: {
            isNot: null
          }
        }
      })

      return {
        total: customerStats._count,
        active: customerStats._count, // All customers are active since no isActive field
        inactive: 0,
        totalCreditLimit: customerStats._sum.creditLimit || 0,
        totalOutstanding: totalOutstanding._sum.balance || 0
      }
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
      const accountBalance = 0 // Account balance not available in current schema
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

      const accountBalance = 0 // Account balance not available in current schema

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
    return this.withLogging('generateCustomerNumber', async () => {
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
    })
  }

  private async getOrCreateARParentAccount(userId: string): Promise<string> {
    return this.withLogging('getOrCreateARParentAccount', async () => {
      try {
        // Find or create parent AR account
        let parentAccount = await prisma.account.findFirst({
          where: {
            code: '1200',
            type: 'ASSET'
          }
        })

        if (!parentAccount) {
          // Try to create the parent account
          try {
            parentAccount = await prisma.account.create({
              data: {
                code: '1200',
                name: 'Accounts Receivable',
                type: 'ASSET',
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
                type: 'ASSET'
              }
            })
            
            if (!parentAccount) {
              // If still not found, create with unique code
              parentAccount = await prisma.account.create({
                data: {
                  code: `1200-AR-${Date.now()}`,
                  name: 'Accounts Receivable',
                  type: 'ASSET',
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
    })
  }

  async hasActiveTransactions(customerId: string): Promise<boolean> {
    return this.withLogging('hasActiveTransactions', async () => {
      // Check for active sales orders
      const activeSalesOrders = await prisma.salesOrder.count({
        where: {
          salesCase: {
            customerId
          },
          status: {
            in: ['PENDING', 'APPROVED', 'PROCESSING']
          }
        }
      })

      if (activeSalesOrders > 0) {
        return true
      }

      // Check for unpaid invoices
      const unpaidInvoices = await prisma.invoice.count({
        where: {
          customerId,
          status: {
            in: ['DRAFT', 'SENT', 'PARTIAL']
          }
        }
      })

      if (unpaidInvoices > 0) {
        return true
      }

      // Check for active quotations
      const activeQuotations = await prisma.quotation.count({
        where: {
          salesCase: {
            customerId
          },
          status: {
            in: ['DRAFT', 'SENT', 'ACCEPTED']
          }
        }
      })

      return activeQuotations > 0
    })
  }

  async softDeleteCustomer(customerId: string, userId: string): Promise<void> {
    return this.withLogging('softDeleteCustomer', async () => {
      const existingCustomer = await this.getCustomer(customerId)
      if (!existingCustomer) {
        throw new Error('Customer not found')
      }

      // Update customer to inactive
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          updatedAt: new Date()
        }
      })

      // Update associated account to inactive
      if (existingCustomer.accountId) {
        await prisma.account.update({
          where: { id: existingCustomer.accountId },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        })
      }

      // Log the soft delete action
      await this.auditService.logAction({
        userId,
        action: AuditAction.DELETE,
        entityType: EntityType.CUSTOMER,
        entityId: customerId,
        beforeData: existingCustomer,
        afterData: { /* soft deleted */ }
      })
    })
  }

  async bulkImportCustomers(
    customers: BulkImportCustomerInput[],
    userId: string
  ): Promise<BulkImportResult> {
    return this.withLogging('bulkImportCustomers', async () => {
      const errors: Array<{ row: number; email: string; error: string }> = []
      const createdCustomers: Customer[] = []
      let successCount = 0
      let failureCount = 0

      // Validate all customers first
      const validatedCustomers: Array<{ data: BulkImportCustomerInput; row: number }> = []
      const existingEmails = new Set<string>()

      // Get all existing customer emails
      const existingCustomers = await prisma.customer.findMany({
        select: { email: true }
      })
      existingCustomers.forEach(c => existingEmails.add(c.email))

      // Validate each customer
      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i]
        const row = i + 2 // Account for header row

        // Check for required fields
        if (!customer.name || !customer.email) {
          errors.push({
            row,
            email: customer.email || 'N/A',
            error: 'Name and email are required'
          })
          failureCount++
          continue
        }

        // Check for duplicate email in the batch
        if (validatedCustomers.some(vc => vc.data.email === customer.email)) {
          errors.push({
            row,
            email: customer.email,
            error: 'Duplicate email in import file'
          })
          failureCount++
          continue
        }

        // Check for existing email in database
        if (existingEmails.has(customer.email)) {
          errors.push({
            row,
            email: customer.email,
            error: 'Customer with this email already exists'
          })
          failureCount++
          continue
        }

        validatedCustomers.push({ data: customer, row })
      }

      // Process customers in batches to avoid overwhelming the database
      const batchSize = 10
      for (let i = 0; i < validatedCustomers.length; i += batchSize) {
        const batch = validatedCustomers.slice(i, i + batchSize)
        
        // Process each customer in the batch
        await Promise.all(
          batch.map(async ({ data, row }) => {
            try {
              const customer = await this.createCustomer({
                ...data,
                createdBy: userId
              })
              createdCustomers.push(customer)
              successCount++
            } catch (error) {
              errors.push({
                row,
                email: data.email,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
              failureCount++
            }
          })
        )
      }

      // Log bulk import action
      if (createdCustomers.length > 0) {
        await this.auditService.logBulkActions({
          userId,
          action: AuditAction.BULK_CREATE,
          entityType: EntityType.CUSTOMER,
          entityIds: createdCustomers.map(c => c.id),
          metadata: {
            totalRecords: customers.length,
            successCount,
            failureCount
          }
        })
      }

      return {
        totalRecords: customers.length,
        successCount,
        failureCount,
        errors,
        createdCustomers
      }
    })
  }
}