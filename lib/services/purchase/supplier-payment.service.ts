import { BaseService } from '@/lib/services/base.service'
import { PrismaClient, PaymentMethod, Prisma } from '@/lib/generated/prisma'
import { getAuditedPrisma } from '@/lib/utils/get-audited-prisma'

interface CreateSupplierPaymentInput {
  supplierId: string
  supplierInvoiceId?: string
  amount: number
  paymentDate: Date
  paymentMethod: PaymentMethod
  reference?: string
  notes?: string
  currency?: string
  exchangeRate?: number
  bankAccountId: string
  createdBy: string
}

interface UpdateSupplierPaymentInput {
  reference?: string
  notes?: string
  paymentMethod?: PaymentMethod
}

interface GetSupplierPaymentsFilter {
  supplierId?: string
  paymentMethod?: PaymentMethod
  dateFrom?: Date
  dateTo?: Date
  search?: string
  limit?: number
  offset?: number
}

interface SupplierBalance {
  supplierId: string
  totalOutstanding: number
  totalPaid: number
  openInvoices: number
  overdueAmount: number
  currency: string
}

export class SupplierPaymentService extends BaseService {
  private auditedPrisma: PrismaClient

  constructor() {
    super('SupplierPaymentService')
    this.auditedPrisma = getAuditedPrisma()
  }

  async createSupplierPayment(data: CreateSupplierPaymentInput) {
    return this.withLogging('createSupplierPayment', async () => {
      // Validate input
      this.validateCreatePaymentInput(data)

      // Get supplier and validate
      const supplier = await this.auditedPrisma.supplier.findUnique({
        where: { id: data.supplierId },
        include: { apAccount: true }
      })

      if (!supplier) {
        throw new Error('Supplier not found')
      }

      if (!supplier.isActive) {
        throw new Error('Cannot create payment for inactive supplier')
      }

      if (!supplier.apAccount) {
        throw new Error('Supplier does not have an AP account configured')
      }

      // Get bank account and validate
      const bankAccount = await this.auditedPrisma.account.findUnique({
        where: { id: data.bankAccountId }
      })

      if (!bankAccount) {
        throw new Error('Bank account not found')
      }

      if (bankAccount.type !== 'ASSET') {
        throw new Error('Selected account is not a bank/cash account')
      }

      let supplierInvoice = null
      if (data.supplierInvoiceId) {
        // Validate invoice and check remaining balance
        supplierInvoice = await this.auditedPrisma.supplierInvoice.findUnique({
          where: { id: data.supplierInvoiceId },
          include: {
            payments: true
          }
        })

        if (!supplierInvoice) {
          throw new Error('Supplier invoice not found')
        }

        if (supplierInvoice.supplierId !== data.supplierId) {
          throw new Error('Invoice does not belong to the specified supplier')
        }

        if (supplierInvoice.status === 'CANCELLED') {
          throw new Error('Cannot make payment against cancelled invoice')
        }

        // Calculate remaining balance
        const totalPaid = supplierInvoice.paidAmount || 0
        const remainingBalance = supplierInvoice.totalAmount - totalPaid

        if (data.amount > remainingBalance) {
          throw new Error(`Payment amount exceeds remaining invoice balance of ${remainingBalance.toFixed(2)}`)
        }
      }

      // Generate payment number
      const paymentNumber = await this.generatePaymentNumber()

      // Handle currency and exchange rates
      const currency = data.currency || supplier.currency || 'USD'
      const exchangeRate = data.exchangeRate || 1.0
      const baseAmount = data.amount * exchangeRate

      // Create payment in transaction
      const result = await this.auditedPrisma.$transaction(async (prisma) => {
        // Create the payment
        const payment = await prisma.supplierPayment.create({
          data: {
            paymentNumber,
            supplierId: data.supplierId,
            supplierInvoiceId: data.supplierInvoiceId || null,
            amount: data.amount,
            paymentDate: data.paymentDate,
            paymentMethod: data.paymentMethod,
            reference: data.reference,
            notes: data.notes,
            currency,
            exchangeRate,
            baseAmount,
            createdBy: data.createdBy
          },
          include: {
            supplier: true,
            supplierInvoice: true
          }
        })

        // Create journal entry for the payment
        const journalEntry = await this.createPaymentJournalEntry(
          prisma,
          payment,
          supplier.apAccount!,
          bankAccount,
          data.createdBy
        )

        // Update payment with journal entry reference
        await prisma.supplierPayment.update({
          where: { id: payment.id },
          data: { journalEntryId: journalEntry.id }
        })

        // Update invoice if payment is against specific invoice
        if (data.supplierInvoiceId && supplierInvoice) {
          const newPaidAmount = (supplierInvoice.paidAmount || 0) + data.amount
          const newBalanceAmount = supplierInvoice.totalAmount - newPaidAmount
          const newStatus = newBalanceAmount <= 0.01 ? 'PAID' : supplierInvoice.status

          await prisma.supplierInvoice.update({
            where: { id: data.supplierInvoiceId },
            data: {
              paidAmount: newPaidAmount,
              balanceAmount: newBalanceAmount,
              status: newStatus
            }
          })
        }

        return payment
      })

      // Return payment with all relations
      return this.auditedPrisma.supplierPayment.findUnique({
        where: { id: result.id },
        include: {
          supplier: true,
          supplierInvoice: true,
          journalEntry: {
            include: {
              lines: {
                include: { account: true }
              }
            }
          }
        }
      })
    })
  }

  async updateSupplierPayment(paymentId: string, data: UpdateSupplierPaymentInput, updatedBy: string) {
    return this.withLogging('updateSupplierPayment', async () => {
      const payment = await this.auditedPrisma.supplierPayment.findUnique({
        where: { id: paymentId }
      })

      if (!payment) {
        throw new Error('Supplier payment not found')
      }

      // Prevent modification of financial data
      const updateData: any = {}
      if (data.reference !== undefined) updateData.reference = data.reference
      if (data.notes !== undefined) updateData.notes = data.notes
      if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod

      const updatedPayment = await this.auditedPrisma.supplierPayment.update({
        where: { id: paymentId },
        data: updateData,
        include: {
          supplier: true,
          supplierInvoice: true,
          journalEntry: {
            include: {
              lines: {
                include: { account: true }
              }
            }
          }
        }
      })

      return updatedPayment
    })
  }

  async getSupplierPayment(paymentId: string) {
    return this.withLogging('getSupplierPayment', async () => {
      const payment = await this.auditedPrisma.supplierPayment.findUnique({
        where: { id: paymentId },
        include: {
          supplier: true,
          supplierInvoice: true,
          journalEntry: {
            include: {
              lines: {
                include: { account: true }
              }
            }
          }
        }
      })

      return payment
    })
  }

  async getAllSupplierPayments(filter: GetSupplierPaymentsFilter = {}) {
    return this.withLogging('getAllSupplierPayments', async () => {
      const {
        supplierId,
        paymentMethod,
        dateFrom,
        dateTo,
        search,
        limit = 50,
        offset = 0
      } = filter

      const where: Prisma.SupplierPaymentWhereInput = {}

      if (supplierId) {
        where.supplierId = supplierId
      }

      if (paymentMethod) {
        where.paymentMethod = paymentMethod
      }

      if (dateFrom || dateTo) {
        where.paymentDate = {}
        if (dateFrom) where.paymentDate.gte = dateFrom
        if (dateTo) where.paymentDate.lte = dateTo
      }

      if (search) {
        where.OR = [
          { paymentNumber: { contains: search } },
          { reference: { contains: search } },
          { notes: { contains: search } },
          { supplier: { name: { contains: search } } },
          { supplier: { code: { contains: search } } }
        ]
      }

      const payments = await this.auditedPrisma.supplierPayment.findMany({
        where,
        include: {
          supplier: true,
          supplierInvoice: true
        },
        orderBy: { paymentDate: 'desc' },
        take: limit,
        skip: offset
      })

      return payments
    })
  }

  async getPaymentsBySupplier(supplierId: string, options: { limit?: number; offset?: number } = {}) {
    return this.withLogging('getPaymentsBySupplier', async () => {
      const payments = await this.auditedPrisma.supplierPayment.findMany({
        where: { supplierId },
        include: {
          supplier: true,
          supplierInvoice: true
        },
        orderBy: { paymentDate: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0
      })

      return payments
    })
  }

  async getPaymentsByInvoice(supplierInvoiceId: string) {
    return this.withLogging('getPaymentsByInvoice', async () => {
      const payments = await this.auditedPrisma.supplierPayment.findMany({
        where: { supplierInvoiceId },
        include: {
          supplier: true,
          supplierInvoice: true
        },
        orderBy: { paymentDate: 'asc' }
      })

      return payments
    })
  }

  async getSupplierBalance(supplierId: string): Promise<SupplierBalance> {
    return this.withLogging('getSupplierBalance', async () => {
      const supplier = await this.auditedPrisma.supplier.findUnique({
        where: { id: supplierId }
      })

      if (!supplier) {
        throw new Error('Supplier not found')
      }

      // Get all invoices for the supplier
      const invoices = await this.auditedPrisma.supplierInvoice.findMany({
        where: {
          supplierId,
          status: { in: ['POSTED', 'PAID'] }
        },
        include: {
          payments: true
        }
      })

      // Get all payments for the supplier
      const allPayments = await this.auditedPrisma.supplierPayment.findMany({
        where: { supplierId }
      })

      // Calculate totals
      const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
      const totalPaid = allPayments.reduce((sum, pay) => sum + pay.amount, 0)
      const totalOutstanding = totalInvoiced - totalPaid
      
      // Count open invoices (not fully paid)
      const openInvoices = invoices.filter(inv => (inv.balanceAmount || 0) > 0.01).length

      // Calculate overdue amount
      const now = new Date()
      const overdueAmount = invoices
        .filter(inv => new Date(inv.dueDate) < now && (inv.balanceAmount || 0) > 0.01)
        .reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0)

      return {
        supplierId,
        totalOutstanding: Math.max(0, totalOutstanding),
        totalPaid,
        openInvoices,
        overdueAmount,
        currency: supplier.currency || 'USD'
      }
    })
  }

  private async generatePaymentNumber(): Promise<string> {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `SPY-${timestamp}-${random}`
  }

  private validateCreatePaymentInput(data: CreateSupplierPaymentInput) {
    if (!data.supplierId) {
      throw new Error('Supplier ID is required')
    }

    if (!data.amount || data.amount <= 0) {
      throw new Error('Payment amount must be positive')
    }

    if (!data.paymentMethod) {
      throw new Error('Payment method is required')
    }

    if (!data.bankAccountId) {
      throw new Error('Bank account ID is required')
    }

    if (!data.createdBy) {
      throw new Error('Created by user ID is required')
    }

    if (data.exchangeRate && data.exchangeRate <= 0) {
      throw new Error('Exchange rate must be positive')
    }
  }

  private async createPaymentJournalEntry(
    prisma: PrismaClient,
    payment: any,
    apAccount: any,
    bankAccount: any,
    createdBy: string
  ) {
    const description = payment.supplierInvoiceId
      ? `Payment for invoice ${payment.supplierInvoice?.invoiceNumber || 'N/A'}`
      : `Prepayment to ${payment.supplier?.name || 'supplier'}`

    const journalEntry = await prisma.journalEntry.create({
      data: {
        reference: `Payment ${payment.paymentNumber}`,
        description,
        date: payment.paymentDate,
        status: 'POSTED',
        createdBy,
        lines: {
          create: [
            {
              // Debit AP (reduces liability)
              accountId: apAccount.id,
              description: `Payment - ${payment.paymentNumber}`,
              debitAmount: payment.baseAmount,
              creditAmount: 0
            },
            {
              // Credit Bank (reduces asset)
              accountId: bankAccount.id,
              description: `Payment - ${payment.paymentNumber}`,
              debitAmount: 0,
              creditAmount: payment.baseAmount
            }
          ]
        }
      },
      include: {
        lines: {
          include: { account: true }
        }
      }
    })

    return journalEntry
  }
}