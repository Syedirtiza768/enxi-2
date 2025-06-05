import { prisma } from '@/lib/db/prisma'
import { BaseService } from '../base.service'
import { 
  Supplier, 
  Prisma,
  AccountType
} from '@/lib/generated/prisma'

export interface CreateSupplierInput {
  supplierNumber?: string
  name: string
  email?: string
  phone?: string
  website?: string
  address?: string
  taxId?: string
  currency?: string
  paymentTerms?: number
  creditLimit?: number
  discount?: number
  bankName?: string
  bankAccount?: string
  routingNumber?: string
  contactPerson?: string
  contactEmail?: string
  contactPhone?: string
  isPreferred?: boolean
}

export interface UpdateSupplierInput {
  name?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  taxId?: string
  currency?: string
  paymentTerms?: number
  creditLimit?: number
  discount?: number
  bankName?: string
  bankAccount?: string
  routingNumber?: string
  contactPerson?: string
  contactEmail?: string
  contactPhone?: string
  isActive?: boolean
  isPreferred?: boolean
}

export interface SupplierWithDetails extends Supplier {
  account?: {
    id: string
    code: string
    name: string
    balance: number
  } | null
  _count?: {
    purchaseOrders: number
    supplierInvoices: number
    supplierPayments: number
  }
}

export class SupplierService extends BaseService {
  constructor() {
    super('SupplierService')
  }

  async createSupplier(
    data: CreateSupplierInput & { createdBy: string }
  ): Promise<SupplierWithDetails> {
    return this.withLogging('createSupplier', async () => {
      // Generate supplier number if not provided
      const supplierNumber = data.supplierNumber || await this.generateSupplierNumber()

      // Check if supplier number already exists
      const existingSupplier = await prisma.supplier.findUnique({
        where: { supplierNumber }
      })

      if (existingSupplier) {
        throw new Error('Supplier number already exists')
      }

      // Check if email already exists
      if (data.email) {
        const existingEmail = await prisma.supplier.findUnique({
          where: { email: data.email }
        })

        if (existingEmail) {
          throw new Error('Email address already exists')
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create the supplier
        const supplier = await tx.supplier.create({
          data: {
            supplierNumber,
            name: data.name,
            email: data.email,
            phone: data.phone,
            website: data.website,
            address: data.address,
            taxId: data.taxId,
            currency: data.currency || 'USD',
            paymentTerms: data.paymentTerms || 30,
            creditLimit: data.creditLimit || 0,
            discount: data.discount || 0,
            bankName: data.bankName,
            bankAccount: data.bankAccount,
            routingNumber: data.routingNumber,
            contactPerson: data.contactPerson,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            isPreferred: data.isPreferred || false,
            createdBy: data.createdBy
          },
          include: {
            account: true,
            _count: {
              select: {
                purchaseOrders: true,
                supplierInvoices: true,
                supplierPayments: true
              }
            }
          }
        })

        // Create AP account for supplier if it doesn't exist
        const apAccount = await tx.account.create({
          data: {
            code: `2110-${supplierNumber}`,
            name: `AP - ${data.name}`,
            type: AccountType.LIABILITY,
            currency: data.currency || 'USD',
            description: `Accounts Payable for ${data.name}`,
            createdBy: data.createdBy
          }
        })

        // Update supplier with account link
        const updatedSupplier = await tx.supplier.update({
          where: { id: supplier.id },
          data: { accountId: apAccount.id },
          include: {
            account: true,
            _count: {
              select: {
                purchaseOrders: true,
                supplierInvoices: true,
                supplierPayments: true
              }
            }
          }
        })

        return updatedSupplier
      })

      return result
    })
  }

  async updateSupplier(
    id: string,
    data: UpdateSupplierInput,
    _userId: string
  ): Promise<SupplierWithDetails> {
    return this.withLogging('updateSupplier', async () => {
      const existingSupplier = await prisma.supplier.findUnique({
        where: { id }
      })

      if (!existingSupplier) {
        throw new Error('Supplier not found')
      }

      // Check email uniqueness if updating email
      if (data.email && data.email !== existingSupplier.email) {
        const existingEmail = await prisma.supplier.findUnique({
          where: { email: data.email }
        })

        if (existingEmail) {
          throw new Error('Email address already exists')
        }
      }

      return prisma.supplier.update({
        where: { id },
        data,
        include: {
          account: true,
          _count: {
            select: {
              purchaseOrders: true,
              supplierInvoices: true,
              supplierPayments: true
            }
          }
        }
      })
    })
  }

  async getSupplier(id: string): Promise<SupplierWithDetails | null> {
    return this.withLogging('getSupplier', async () => {
      return prisma.supplier.findUnique({
        where: { id },
        include: {
          account: true,
          _count: {
            select: {
              purchaseOrders: true,
              supplierInvoices: true,
              supplierPayments: true
            }
          }
        }
      })
    })
  }

  async getSupplierByNumber(supplierNumber: string): Promise<SupplierWithDetails | null> {
    return this.withLogging('getSupplierByNumber', async () => {
      return prisma.supplier.findUnique({
        where: { supplierNumber },
        include: {
          account: true,
          _count: {
            select: {
              purchaseOrders: true,
              supplierInvoices: true,
              supplierPayments: true
            }
          }
        }
      })
    })
  }

  async getAllSuppliers(options?: {
    isActive?: boolean
    currency?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<SupplierWithDetails[]> {
    return this.withLogging('getAllSuppliers', async () => {
      const where: Prisma.SupplierWhereInput = {}

      if (options?.isActive !== undefined) {
        where.isActive = options.isActive
      }

      if (options?.currency) {
        where.currency = options.currency
      }

      if (options?.search) {
        where.OR = [
          { name: { contains: options.search } },
          { supplierNumber: { contains: options.search } },
          { email: { contains: options.search } },
          { contactPerson: { contains: options.search } }
        ]
      }

      return prisma.supplier.findMany({
        where,
        include: {
          account: true,
          _count: {
            select: {
              purchaseOrders: true,
              supplierInvoices: true,
              supplierPayments: true
            }
          }
        },
        orderBy: { name: 'asc' },
        take: options?.limit,
        skip: options?.offset
      })
    })
  }

  async getSupplierBalance(id: string): Promise<number> {
    return this.withLogging('getSupplierBalance', async () => {
      const supplier = await prisma.supplier.findUnique({
        where: { id },
        include: { account: true }
      })

      if (!supplier?.account) {
        throw new Error('Supplier account not found')
      }

      return supplier.account.balance
    })
  }

  async deactivateSupplier(id: string, userId: string): Promise<SupplierWithDetails> {
    return this.withLogging('deactivateSupplier', async () => {
      // Check if supplier has outstanding balances
      const balance = await this.getSupplierBalance(id)
      if (balance !== 0) {
        throw new Error('Cannot deactivate supplier with outstanding balance')
      }

      return this.updateSupplier(id, { isActive: false }, userId)
    })
  }

  async getPreferredSuppliers(): Promise<SupplierWithDetails[]> {
    return this.withLogging('getPreferredSuppliers', async () => {
      return this.getAllSuppliers({ 
        isActive: true,
        limit: undefined,
        offset: undefined
      }).then(suppliers => suppliers.filter(s => s.isPreferred))
    })
  }

  private async generateSupplierNumber(): Promise<string> {
    const lastSupplier = await prisma.supplier.findFirst({
      orderBy: { supplierNumber: 'desc' }
    })

    if (!lastSupplier) {
      return 'SUP-0001'
    }

    const match = lastSupplier.supplierNumber.match(/SUP-(\d+)$/)
    if (match) {
      const lastNumber = parseInt(match[1])
      const newNumber = lastNumber + 1
      return `SUP-${newNumber.toString().padStart(4, '0')}`
    }

    return 'SUP-0001'
  }
}