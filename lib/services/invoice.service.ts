import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { AuditService } from './audit.service'
import { JournalEntryService } from './accounting/journal-entry.service'
import { SalesOrderService } from './sales-order.service'
import { 
  Invoice,
  InvoiceItem,
  InvoiceType,
  InvoiceStatus,
  Payment,
  PaymentMethod,
  OrderStatus,
  Prisma
} from '@/lib/generated/prisma'

export interface InvoiceWithDetails extends Invoice {
  customer: {
    id: string
    name: string
    email: string
    phone?: string | null
    address?: string | null
  }
  salesOrder?: {
    id: string
    orderNumber: string
  } | null
  items: InvoiceItem[]
  payments: Payment[]
}

export interface CreateInvoiceInput {
  salesOrderId?: string
  customerId: string
  type?: InvoiceType
  dueDate: Date
  paymentTerms?: string
  billingAddress?: string
  notes?: string
  items: CreateInvoiceItemInput[]
}

export interface CreateInvoiceItemInput {
  itemId?: string
  itemCode: string
  description: string
  quantity: number
  unitPrice: number
  discount?: number
  taxRate?: number
}

export interface UpdateInvoiceInput {
  dueDate?: Date
  paymentTerms?: string
  billingAddress?: string
  notes?: string
  items?: CreateInvoiceItemInput[]
}

export interface CreatePaymentInput {
  amount: number
  paymentDate?: Date
  paymentMethod: PaymentMethod
  reference?: string
  notes?: string
}

export class InvoiceService extends BaseService {
  private auditService: AuditService
  private journalEntryService: JournalEntryService
  private salesOrderService: SalesOrderService

  constructor() {
    super('InvoiceService')
    this.auditService = new AuditService()
    this.journalEntryService = new JournalEntryService()
    this.salesOrderService = new SalesOrderService()
  }

  async createInvoice(
    data: CreateInvoiceInput & { createdBy: string }
  ): Promise<InvoiceWithDetails> {
    return this.withLogging('createInvoice', async () => {

      return await prisma.$transaction(async (tx) => {
        // Generate unique invoice number
        const invoiceNumber = await this.generateInvoiceNumber(data.type || InvoiceType.SALES, tx)

        // Validate sales order if provided
        let salesOrder = null
        if (data.salesOrderId) {
          salesOrder = await this.salesOrderService.getSalesOrder(data.salesOrderId)
          if (!salesOrder) {
            throw new Error('Sales order not found')
          }
          if (![OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.SHIPPED].includes(salesOrder.status)) {
            throw new Error('Sales order must be approved, processing, or shipped to create invoice')
          }
        }

        // Calculate totals
        const { subtotal, taxAmount, discountAmount, totalAmount } = this.calculateTotals(data.items)

        // Create invoice
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            salesOrderId: data.salesOrderId,
            customerId: data.customerId,
            type: data.type || InvoiceType.SALES,
            status: InvoiceStatus.DRAFT,
            invoiceDate: new Date(),
            dueDate: data.dueDate,
            subtotal,
            taxAmount,
            discountAmount,
            totalAmount,
            balanceAmount: totalAmount,
            paymentTerms: data.paymentTerms,
            billingAddress: data.billingAddress,
            notes: data.notes,
            createdBy: data.createdBy
          }
        })

        // Create invoice items
        const _items = await Promise.all(
          data.items.map(async (itemData, _index) => {
            const itemCalculations = this.calculateItemTotals(itemData)
            
            return await tx.invoiceItem.create({
              data: {
                invoiceId: invoice.id,
                itemId: itemData.itemId,
                itemCode: itemData.itemCode,
                description: itemData.description,
                quantity: itemData.quantity,
                unitPrice: itemData.unitPrice,
                discount: itemData.discount || 0,
                taxRate: itemData.taxRate || 0,
                subtotal: itemCalculations.subtotal,
                discountAmount: itemCalculations.discountAmount,
                taxAmount: itemCalculations.taxAmount,
                totalAmount: itemCalculations.totalAmount
              }
            })
          })
        )

        // Update sales order invoiced amount if applicable
        if (data.salesOrderId && salesOrder) {
          await tx.salesOrder.update({
            where: { id: data.salesOrderId },
            data: {
              invoicedAmount: {
                increment: totalAmount
              }
            }
          })
        }

        // Audit log
        await this.auditService.logAction({
          userId: data.createdBy,
          action: 'CREATE',
          entityType: 'Invoice',
          entityId: invoice.id,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            type: invoice.type,
            totalAmount: invoice.totalAmount,
            salesOrderId: data.salesOrderId
          }
        })


        return this.getInvoice(invoice.id, tx)
      })
    })
  }

  async getInvoice(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<InvoiceWithDetails | null> {
    return this.withLogging('getInvoice', async () => {

      const client = tx || prisma

      const invoice = await client.invoice.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true
            }
          },
          salesOrder: {
            select: {
              id: true,
              orderNumber: true
            }
          },
          items: true,
          payments: {
            orderBy: { paymentDate: 'desc' }
          }
        }
      })

      if (!invoice) {
      } else {
      }

      return invoice as InvoiceWithDetails | null
    })
  }

  async getAllInvoices(filters: {
    status?: InvoiceStatus
    type?: InvoiceType
    customerId?: string
    dateFrom?: Date
    dateTo?: Date
    overdue?: boolean
  } = {}): Promise<InvoiceWithDetails[]> {
    return this.withLogging('getAllInvoices', async () => {

      const where: Record<string, unknown> = {}

      if (filters.status) {
        where.status = filters.status
      }
      if (filters.type) {
        where.type = filters.type
      }
      if (filters.customerId) {
        where.customerId = filters.customerId
      }

      if (filters.dateFrom || filters.dateTo) {
        where.invoiceDate = {}
        if (filters.dateFrom) where.invoiceDate.gte = filters.dateFrom
        if (filters.dateTo) where.invoiceDate.lte = filters.dateTo
      }

      if (filters.overdue) {
        where.dueDate = { lt: new Date() }
        where.balanceAmount = { gt: 0 }
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true
            }
          },
          salesOrder: {
            select: {
              id: true,
              orderNumber: true
            }
          },
          items: true,
          payments: {
            orderBy: { paymentDate: 'desc' }
          }
        },
        orderBy: { invoiceDate: 'desc' }
      })


      return invoices as InvoiceWithDetails[]
    })
  }

  async updateInvoice(
    id: string,
    data: UpdateInvoiceInput & { updatedBy: string }
  ): Promise<InvoiceWithDetails> {
    const existingInvoice = await this.getInvoice(id)
    if (!existingInvoice) {
      throw new Error('Invoice not found')
    }

    if (existingInvoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('Only draft invoices can be updated')
    }

    return await prisma.$transaction(async (tx) => {
      let updateData: Record<string, unknown> = {
        dueDate: data.dueDate,
        paymentTerms: data.paymentTerms,
        billingAddress: data.billingAddress,
        notes: data.notes,
        updatedAt: new Date()
      }

      if (data.items) {
        // Delete existing items
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: id }
        })

        // Calculate new totals
        const { subtotal, taxAmount, discountAmount, totalAmount } = this.calculateTotals(data.items)
        
        updateData = {
          ...updateData,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          balanceAmount: totalAmount - existingInvoice.paidAmount
        }

        // Create new items
        await Promise.all(
          data.items.map(async (itemData) => {
            const itemCalculations = this.calculateItemTotals(itemData)
            
            return await tx.invoiceItem.create({
              data: {
                invoiceId: id,
                itemId: itemData.itemId,
                itemCode: itemData.itemCode,
                description: itemData.description,
                quantity: itemData.quantity,
                unitPrice: itemData.unitPrice,
                discount: itemData.discount || 0,
                taxRate: itemData.taxRate || 0,
                subtotal: itemCalculations.subtotal,
                discountAmount: itemCalculations.discountAmount,
                taxAmount: itemCalculations.taxAmount,
                totalAmount: itemCalculations.totalAmount
              }
            })
          })
        )
      }

      // Update invoice
      await tx.invoice.update({
        where: { id },
        data: updateData
      })

      // Audit log
      await this.auditService.logAction({
        userId: data.updatedBy,
        action: 'UPDATE',
        entityType: 'Invoice',
        entityId: id,
        metadata: {
          invoiceNumber: existingInvoice.invoiceNumber,
          changes: Object.keys(data).filter(key => key !== 'updatedBy')
        }
      })

      return this.getInvoice(id, tx)
    })
  }

  async sendInvoice(
    id: string,
    userId: string
  ): Promise<InvoiceWithDetails> {
    return this.withLogging('sendInvoice', async () => {

      const invoice = await this.getInvoice(id)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new Error('Only draft invoices can be sent')
      }

      // Create accounting entry for sales invoice
      if (invoice.type === InvoiceType.SALES) {
        await this.createSalesInvoiceJournalEntry(invoice, userId)
      }

      const _updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.SENT,
          sentBy: userId,
          sentAt: new Date()
        }
      })

      // Audit log
      await this.auditService.logAction({
        userId,
        action: 'SEND',
        entityType: 'Invoice',
        entityId: id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          previousStatus: InvoiceStatus.DRAFT,
          newStatus: InvoiceStatus.SENT
        }
      })


      return this.getInvoice(id)
    })
  }

  async recordPayment(
    invoiceId: string,
    paymentData: CreatePaymentInput & { createdBy: string }
  ): Promise<Payment> {
    return this.withLogging('recordPayment', async () => {

      const invoice = await this.getInvoice(invoiceId)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new Error('Cannot record payment for cancelled invoice')
      }

      if (paymentData.amount <= 0) {
        throw new Error('Payment amount must be positive')
      }

      if (paymentData.amount > invoice.balanceAmount) {
        throw new Error('Payment amount cannot exceed invoice balance')
      }

      return await prisma.$transaction(async (tx) => {
        // Generate payment number
        const paymentNumber = await this.generatePaymentNumber(tx)

        // Create payment record
        const payment = await tx.payment.create({
          data: {
            paymentNumber,
            invoiceId,
            customerId: invoice.customerId,
            amount: paymentData.amount,
            paymentDate: paymentData.paymentDate || new Date(),
            paymentMethod: paymentData.paymentMethod,
            reference: paymentData.reference,
            notes: paymentData.notes,
            createdBy: paymentData.createdBy
          }
        })

        // Update invoice amounts
        const newPaidAmount = invoice.paidAmount + paymentData.amount
        const newBalanceAmount = invoice.totalAmount - newPaidAmount
        
        let newStatus = invoice.status
        if (newBalanceAmount === 0) {
          newStatus = InvoiceStatus.PAID
        } else if (newPaidAmount > 0 && newStatus === InvoiceStatus.SENT) {
          newStatus = InvoiceStatus.PARTIAL
        }


        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            status: newStatus,
            paidAt: newBalanceAmount === 0 ? new Date() : invoice.paidAt
          }
        })

        // Create accounting entry for payment
        await this.createPaymentJournalEntry(invoice, payment, paymentData.createdBy, tx)

        // Audit log
        await this.auditService.logAction({
          userId: paymentData.createdBy,
          action: 'PAYMENT',
          entityType: 'Invoice',
          entityId: invoiceId,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            paymentAmount: paymentData.amount,
            paymentMethod: paymentData.paymentMethod,
            newBalance: newBalanceAmount
          }
        })


        return payment
      })
    })
  }

  async createInvoiceFromSalesOrder(
    salesOrderId: string,
    additionalData: Partial<CreateInvoiceInput> & { createdBy: string }
  ): Promise<InvoiceWithDetails> {
    const salesOrder = await this.salesOrderService.getSalesOrder(salesOrderId)
    if (!salesOrder) {
      throw new Error('Sales order not found')
    }

    if (![OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.SHIPPED].includes(salesOrder.status)) {
      throw new Error('Sales order must be approved, processing, or shipped to create invoice')
    }

    // Convert sales order items to invoice items
    const items: CreateInvoiceItemInput[] = salesOrder.items.map(item => ({
      itemId: item.itemId,
      itemCode: item.itemCode,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate
    }))

    // Calculate due date based on payment terms (default 30 days)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const invoiceData: CreateInvoiceInput & { createdBy: string } = {
      salesOrderId,
      customerId: salesOrder.salesCase.customer.id,
      dueDate,
      paymentTerms: salesOrder.paymentTerms,
      billingAddress: salesOrder.billingAddress,
      items,
      ...additionalData
    }

    return this.createInvoice(invoiceData)
  }

  // Private helper methods

  private calculateTotals(items: CreateInvoiceItemInput[]) {
    let subtotal = 0
    let taxAmount = 0
    let discountAmount = 0

    for (const item of items) {
      const itemCalculations = this.calculateItemTotals(item)
      subtotal += itemCalculations.subtotal
      taxAmount += itemCalculations.taxAmount
      discountAmount += itemCalculations.discountAmount
    }

    const totalAmount = subtotal - discountAmount + taxAmount

    return { subtotal, taxAmount, discountAmount, totalAmount }
  }

  private calculateItemTotals(item: CreateInvoiceItemInput) {
    const subtotal = item.quantity * item.unitPrice
    const discountAmount = subtotal * ((item.discount || 0) / 100)
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * ((item.taxRate || 0) / 100)
    const totalAmount = afterDiscount + taxAmount

    return { subtotal, discountAmount, taxAmount, totalAmount }
  }

  private async generateInvoiceNumber(type: InvoiceType, tx?: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = type === InvoiceType.SALES ? `INV${year}` : 
                   type === InvoiceType.CREDIT_NOTE ? `CN${year}` :
                   type === InvoiceType.DEBIT_NOTE ? `DN${year}` : `PRO${year}`
    
    const client = tx || prisma
    
    const latestInvoice = await client.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix
        },
        type
      },
      orderBy: {
        invoiceNumber: 'desc'
      }
    })

    let nextNumber = 1
    if (latestInvoice) {
      const currentNumber = parseInt(latestInvoice.invoiceNumber.substring(prefix.length))
      nextNumber = currentNumber + 1
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`
  }

  private async generatePaymentNumber(tx?: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `PAY${year}`
    
    const client = tx || prisma
    
    const latestPayment = await client.payment.findFirst({
      where: {
        paymentNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        paymentNumber: 'desc'
      }
    })

    let nextNumber = 1
    if (latestPayment) {
      const currentNumber = parseInt(latestPayment.paymentNumber.substring(prefix.length))
      nextNumber = currentNumber + 1
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`
  }

  private async createSalesInvoiceJournalEntry(
    invoice: InvoiceWithDetails,
    userId: string
  ): Promise<void> {
    // Debit: Accounts Receivable, Credit: Sales Revenue & Sales Tax
    const lines = [
      {
        accountId: await this.getAccountByCode('1200'), // Accounts Receivable
        description: `Sales invoice ${invoice.invoiceNumber}`,
        debitAmount: invoice.totalAmount,
        creditAmount: 0
      },
      {
        accountId: await this.getAccountByCode('4000'), // Sales Revenue
        description: `Sales revenue ${invoice.invoiceNumber}`,
        debitAmount: 0,
        creditAmount: invoice.subtotal - invoice.discountAmount
      }
    ]

    if (invoice.taxAmount > 0) {
      lines.push({
        accountId: await this.getAccountByCode('2200'), // Sales Tax Payable
        description: `Sales tax ${invoice.invoiceNumber}`,
        debitAmount: 0,
        creditAmount: invoice.taxAmount
      })
    }

    await this.journalEntryService.createJournalEntry({
      date: invoice.invoiceDate,
      description: `Sales invoice ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      currency: 'USD',
      lines,
      createdBy: userId
    })
  }

  private async createPaymentJournalEntry(
    invoice: InvoiceWithDetails,
    payment: Payment,
    userId: string,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    // Debit: Cash/Bank, Credit: Accounts Receivable
    const cashAccountId = payment.paymentMethod === PaymentMethod.CASH 
      ? await this.getAccountByCode('1000') // Cash
      : await this.getAccountByCode('1010') // Bank

    const lines = [
      {
        accountId: cashAccountId,
        description: `Payment received ${payment.paymentNumber}`,
        debitAmount: payment.amount,
        creditAmount: 0
      },
      {
        accountId: await this.getAccountByCode('1200'), // Accounts Receivable
        description: `Payment for invoice ${invoice.invoiceNumber}`,
        debitAmount: 0,
        creditAmount: payment.amount
      }
    ]

    await this.journalEntryService.createJournalEntry({
      date: payment.paymentDate,
      description: `Payment received for invoice ${invoice.invoiceNumber}`,
      reference: payment.paymentNumber,
      currency: 'USD',
      lines,
      createdBy: userId
    }, tx)
  }

  private async getAccountByCode(code: string): Promise<string> {
    const account = await prisma.account.findFirst({
      where: { code }
    })
    
    if (!account) {
      throw new Error(`Account with code ${code} not found`)
    }
    
    return account.id
  }
}