import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { AuditService } from './audit.service'
import { AuditAction, EntityType } from '@/lib/validators/audit.validator'
import { JournalEntryService } from './accounting/journal-entry.service'
import { SalesOrderService } from './sales-order.service'
import { taxService } from './tax.service'
import { 
  Invoice,
  InvoiceItem,
  Payment,
  Prisma
} from "@prisma/client"
import { OrderStatus } from '@/lib/constants/order-status'

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
  type?: 'SALES' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'PROFORMA'
  dueDate: Date
  paymentTerms?: string
  billingAddress?: string
  notes?: string
  internalNotes?: string
  items: CreateInvoiceItemInput[]
}

export interface CreateInvoiceItemInput {
  lineNumber: number
  lineDescription?: string
  isLineHeader: boolean
  itemType: string
  itemId?: string
  itemCode: string
  description: string
  internalDescription?: string
  quantity: number
  unitPrice: number
  cost?: number
  discount?: number
  taxRate?: number
  taxRateId?: string // Link to centralized tax configuration
  unitOfMeasureId?: string
  sortOrder: number
}

export interface UpdateInvoiceInput {
  dueDate?: Date
  paymentTerms?: string
  billingAddress?: string
  notes?: string
  internalNotes?: string
  items?: CreateInvoiceItemInput[]
}

export interface CreatePaymentInput {
  amount: number
  paymentDate?: Date
  paymentMethod: 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'CREDIT_CARD' | 'WIRE_TRANSFER' | 'ONLINE'
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
      console.log('Creating invoice with data:', {
        customerId: data.customerId,
        dueDate: data.dueDate,
        itemCount: data.items?.length,
        firstItem: data.items?.[0]
      })

      const result = await prisma.$transaction(async (tx) => {
        // Generate unique invoice number
        const invoiceNumber = await this.generateInvoiceNumber(data.type || 'SALES', tx)

        // Validate sales order if provided
        let salesOrder = null
        if (data.salesOrderId) {
          // Only fetch basic info needed for update
          salesOrder = await tx.salesOrder.findUnique({
            where: { id: data.salesOrderId },
            select: { id: true, status: true }
          })
          if (!salesOrder) {
            throw new Error('Sales order not found')
          }
        }

        // Calculate totals
        const { subtotal, taxAmount, discountAmount, totalAmount } = await this.calculateTotals(data.items, data.customerId)

        // Create invoice
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            salesOrderId: data.salesOrderId,
            customerId: data.customerId,
            type: data.type || 'SALES' as const,
            status: 'DRAFT' as const,
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
            internalNotes: data.internalNotes,
            createdBy: data.createdBy
          }
        })

        // Create invoice items
        const _items = await Promise.all(
          data.items.map(async (itemData, _index) => {
            const itemCalculations = await this.calculateItemTotals(itemData, data.customerId)
            
            return await tx.invoiceItem.create({
              data: {
                invoiceId: invoice.id,
                lineNumber: itemData.lineNumber,
                lineDescription: itemData.lineDescription,
                isLineHeader: itemData.isLineHeader,
                itemType: itemData.itemType,
                itemId: itemData.itemId,
                itemCode: itemData.itemCode,
                description: itemData.description,
                internalDescription: itemData.internalDescription,
                quantity: itemData.quantity,
                unitPrice: itemData.unitPrice,
                cost: itemData.cost,
                discount: itemData.discount || 0,
                taxRate: itemCalculations.effectiveTaxRate, // Use the effective tax rate from calculation
                taxRateId: itemData.taxRateId, // Store the tax rate ID reference
                unitOfMeasureId: itemData.unitOfMeasureId,
                subtotal: itemCalculations.subtotal,
                discountAmount: itemCalculations.discountAmount,
                taxAmount: itemCalculations.taxAmount,
                totalAmount: itemCalculations.totalAmount,
                sortOrder: itemData.sortOrder
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
          action: AuditAction.CREATE,
          entityType: EntityType.INVOICE,
          entityId: invoice.id,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            type: invoice.type,
            totalAmount: invoice.totalAmount,
            salesOrderId: data.salesOrderId
          }
        })


        return this.getInvoice(invoice.id, tx)
      }, {
        timeout: 10000 // 10 seconds timeout
      })
      
      if (!result) {
        throw new Error('Failed to create invoice')
      }
      
      return result
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
    status?: 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
    type?: 'SALES' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'PROFORMA'
    customerId?: string
    dateFrom?: Date
    dateTo?: Date
    overdue?: boolean
  } = {}): Promise<InvoiceWithDetails[]> {
    return this.withLogging('getAllInvoices', async () => {

      const where: Prisma.InvoiceWhereInput = {}

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
        if (filters.dateFrom) {
          where.invoiceDate.gte = filters.dateFrom
        }
        if (filters.dateTo) {
          where.invoiceDate.lte = filters.dateTo
        }
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
    return this.withLogging('updateInvoice', async () => {
      const existingInvoice = await this.getInvoice(id)
      if (!existingInvoice) {
        throw new Error('Invoice not found')
      }

    if (existingInvoice.status !== 'DRAFT') {
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
        const { subtotal, taxAmount, discountAmount, totalAmount } = await this.calculateTotals(data.items, existingInvoice.customerId)
        
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
            const itemCalculations = await this.calculateItemTotals(itemData, existingInvoice.customerId)
            
            return await tx.invoiceItem.create({
              data: {
                invoiceId: id,
                itemId: itemData.itemId,
                itemCode: itemData.itemCode,
                description: itemData.description,
                quantity: itemData.quantity,
                unitPrice: itemData.unitPrice,
                discount: itemData.discount || 0,
                taxRate: itemCalculations.effectiveTaxRate, // Use the effective tax rate from calculation
                taxRateId: itemData.taxRateId, // Store the tax rate ID reference
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
        action: AuditAction.UPDATE,
        entityType: EntityType.INVOICE,
        entityId: id,
        metadata: {
          invoiceNumber: existingInvoice.invoiceNumber,
          changes: Object.keys(data).filter(key => key !== 'updatedBy')
        }
      })

        return this.getInvoice(id, tx) as Promise<InvoiceWithDetails>
      })
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

      if (invoice.status !== 'DRAFT') {
        throw new Error('Only draft invoices can be sent')
      }

      // Create accounting entry based on invoice type
      if (invoice.type === 'SALES') {
        await this.createSalesInvoiceJournalEntry(invoice, userId)
      } else if (invoice.type === 'CREDIT_NOTE') {
        await this.createCreditNoteJournalEntry(invoice, userId)
      }

      const _updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'SENT' as const,
          sentBy: userId,
          sentAt: new Date()
        }
      })

      // Audit log
      await this.auditService.logAction({
        userId,
        action: AuditAction.SUBMIT,
        entityType: EntityType.INVOICE,
        entityId: id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          previousStatus: 'DRAFT',
          newStatus: 'SENT'
        }
      })


      const result = await this.getInvoice(id)
      if (!result) {
        throw new Error('Failed to send invoice')
      }
      return result
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

      if (invoice.status === 'CANCELLED') {
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
          newStatus = 'PAID'
        } else if (newPaidAmount > 0 && newStatus === 'SENT') {
          newStatus = 'PARTIAL'
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
          action: AuditAction.PAYMENT_RECEIVED,
          entityType: EntityType.INVOICE,
          entityId: invoiceId,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            paymentAmount: paymentData.amount,
            paymentMethod: paymentData.paymentMethod,
            newBalance: newBalanceAmount
          }
        })


        return payment
      }, {
        timeout: 20000, // Increase timeout to 20 seconds
        maxWait: 10000, // Maximum time to wait for a transaction slot
      })
    })
  }

  async createInvoiceFromSalesOrder(
    salesOrderId: string,
    additionalData: Partial<CreateInvoiceInput> & { createdBy: string }
  ): Promise<InvoiceWithDetails> {
    return this.withLogging('createInvoiceFromSalesOrder', async () => {
      const salesOrder = await this.salesOrderService.getSalesOrder(salesOrderId)
      if (!salesOrder) {
        throw new Error('Sales order not found')
      }

    if (![OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.SHIPPED].includes(salesOrder.status)) {
      throw new Error('Sales order must be approved, processing, or shipped to create invoice')
    }

    // Convert sales order items to invoice items, preserving line structure
    const items: CreateInvoiceItemInput[] = salesOrder.items.map(item => ({
      lineNumber: item.lineNumber,
      lineDescription: item.lineDescription || undefined,
      isLineHeader: item.isLineHeader,
      itemType: item.itemType,
      itemId: item.itemId || undefined,
      itemCode: item.itemCode,
      description: item.description,
      internalDescription: item.internalDescription || undefined,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      cost: item.cost || undefined,
      discount: item.discount || undefined,
      taxRate: item.taxRate || undefined,
      taxRateId: item.taxRateId || undefined,
      unitOfMeasureId: item.unitOfMeasureId || undefined,
      sortOrder: item.sortOrder
    }))

    // Calculate due date based on payment terms (default 30 days)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const invoiceData: CreateInvoiceInput & { createdBy: string } = {
      salesOrderId,
      customerId: salesOrder.salesCase.customer.id,
      paymentTerms: salesOrder.paymentTerms,
      billingAddress: salesOrder.billingAddress,
      items,
      ...additionalData,
      dueDate: additionalData.dueDate || dueDate,
      createdBy: additionalData.createdBy
    }

      return this.createInvoice(invoiceData)
    })
  }

  async createInvoiceFromQuotation(
    quotationId: string,
    additionalData: Partial<CreateInvoiceInput> & { createdBy: string }
  ): Promise<InvoiceWithDetails> {
    return this.withLogging('createInvoiceFromQuotation', async () => {
      console.log('[InvoiceService] Starting createInvoiceFromQuotation')
      console.log('[InvoiceService] Quotation ID:', quotationId)
      console.log('[InvoiceService] Additional data:', JSON.stringify(additionalData, null, 2))
      
      try {
        // First, create a sales order from the quotation
        const salesOrderService = new SalesOrderService()
        
        console.log('[InvoiceService] Creating sales order from quotation...')
        
        // Create sales order with all quotation details
        const salesOrder = await salesOrderService.createFromQuotation(quotationId, {
          customerPO: additionalData.notes?.includes('PO#') 
            ? additionalData.notes.match(/PO#\s*(\S+)/)?.[1] 
            : undefined,
          createdBy: additionalData.createdBy
        })
        
        console.log('[InvoiceService] Sales order created successfully!')
        console.log('[InvoiceService] Sales Order ID:', salesOrder.id)
        console.log('[InvoiceService] Sales Order Number:', salesOrder.orderNumber)
        console.log('[InvoiceService] Sales Order Status:', salesOrder.status)
        
        // Approve the sales order so it can be invoiced
        console.log('[InvoiceService] Approving sales order...')
        const approvedSalesOrder = await salesOrderService.approveSalesOrder(
          salesOrder.id,
          additionalData.createdBy
        )
        console.log('[InvoiceService] Sales order approved!')
        
        // Now create invoice from the sales order
        console.log('[InvoiceService] Creating invoice from sales order...')
        const invoiceResult = await this.createInvoiceFromSalesOrder(approvedSalesOrder.id, {
          ...additionalData,
          createdBy: additionalData.createdBy
        })
        
        console.log('[InvoiceService] Invoice created successfully!')
        console.log('[InvoiceService] Invoice ID:', invoiceResult.id)
        console.log('[InvoiceService] Invoice Number:', invoiceResult.invoiceNumber)
        console.log('[InvoiceService] Invoice Sales Order ID:', invoiceResult.salesOrderId)
        
        return invoiceResult
      } catch (error) {
        console.error('[InvoiceService] Error in createInvoiceFromQuotation:', error)
        console.error('[InvoiceService] Error stack:', error.stack)
        throw error
      }
    })
  }

  // Private helper methods

  private async calculateTotals(items: CreateInvoiceItemInput[], customerId?: string): Promise<{
    subtotal: number
    taxAmount: number
    discountAmount: number
    totalAmount: number
  }> {
    let subtotal = 0
    let taxAmount = 0
    let discountAmount = 0

    for (const item of items) {
      // Skip line headers in total calculation as they have 0 amounts
      if (item.isLineHeader && item.quantity === 0) {
        continue
      }
      
      const itemCalculations = await this.calculateItemTotals(item, customerId)
      subtotal += itemCalculations.subtotal
      taxAmount += itemCalculations.taxAmount
      discountAmount += itemCalculations.discountAmount
    }

    const totalAmount = subtotal - discountAmount + taxAmount

    return { subtotal, taxAmount, discountAmount, totalAmount }
  }

  private async calculateItemTotals(item: CreateInvoiceItemInput, customerId?: string): Promise<{
    subtotal: number
    discountAmount: number
    taxAmount: number
    totalAmount: number
    effectiveTaxRate: number
  }> {
    // Handle line headers with 0 quantity
    if (item.isLineHeader && item.quantity === 0) {
      return {
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        effectiveTaxRate: 0
      }
    }
    
    const subtotal = item.quantity * item.unitPrice
    const discountAmount = subtotal * ((item.discount || 0) / 100)
    const afterDiscount = subtotal - discountAmount
    
    // Calculate tax using centralized tax system
    let taxAmount = 0
    let effectiveTaxRate = item.taxRate || 0
    
    if (item.taxRateId || !item.taxRate) {
      try {
        // Use centralized tax calculation
        const taxCalc = await taxService.calculateTax({
          amount: afterDiscount,
          taxRateId: item.taxRateId,
          customerId,
          appliesTo: item.itemId ? 'PRODUCTS' : 'SERVICES'
        })
        
        taxAmount = taxCalc.taxAmount
        effectiveTaxRate = taxCalc.appliedTaxRates[0]?.rate || 0
      } catch (taxError) {
        console.error('Tax calculation failed for item:', item.itemCode, taxError)
        // Fallback to manual tax rate or 0
        effectiveTaxRate = item.taxRate || 0
        taxAmount = afterDiscount * (effectiveTaxRate / 100)
      }
    } else {
      // Fallback to manual tax rate
      taxAmount = afterDiscount * ((item.taxRate || 0) / 100)
    }
    
    const totalAmount = afterDiscount + taxAmount

    return { subtotal, discountAmount, taxAmount, totalAmount, effectiveTaxRate }
  }

  private async generateInvoiceNumber(type: string, tx?: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = type === 'SALES' ? `INV${year}` : 
                   type === 'CREDIT_NOTE' ? `CN${year}` :
                   type === 'DEBIT_NOTE' ? `DN${year}` : `PRO${year}`
    
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
    return this.withLogging('createSalesInvoiceJournalEntry', async () => {
      // Debit: Accounts Receivable, Credit: Sales Revenue & Sales Tax
      // Import account codes
      const { TRANSACTION_ACCOUNTS } = await import('@/lib/constants/default-accounts')
      
      const lines = [
      {
        accountId: await this.getAccountByCode(TRANSACTION_ACCOUNTS.SALES_INVOICE.receivable), // Accounts Receivable
        description: `Sales invoice ${invoice.invoiceNumber}`,
        debitAmount: invoice.totalAmount,
        creditAmount: 0
      },
      {
        accountId: await this.getAccountByCode(TRANSACTION_ACCOUNTS.SALES_INVOICE.revenue), // Sales Revenue
        description: `Sales revenue ${invoice.invoiceNumber}`,
        debitAmount: 0,
        creditAmount: invoice.subtotal - invoice.discountAmount
      }
    ]

    if (invoice.taxAmount > 0) {
      lines.push({
        accountId: await this.getAccountByCode(TRANSACTION_ACCOUNTS.SALES_INVOICE.tax), // Sales Tax Payable
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
        status: 'POSTED' as const, // Create as posted when invoice is sent
        createdBy: userId
      })
    })
  }

  private async createCreditNoteJournalEntry(
    invoice: InvoiceWithDetails,
    userId: string
  ): Promise<void> {
    return this.withLogging('createCreditNoteJournalEntry', async () => {
      // Credit Note reverses the original invoice
      // Credit: Accounts Receivable, Debit: Sales Revenue & Sales Tax
      const { TRANSACTION_ACCOUNTS } = await import('@/lib/constants/default-accounts')
      
      const lines = [
        {
          accountId: await this.getAccountByCode(TRANSACTION_ACCOUNTS.SALES_INVOICE.receivable), // Accounts Receivable
          description: `Credit note ${invoice.invoiceNumber}`,
          debitAmount: 0,
          creditAmount: invoice.totalAmount
        },
        {
          accountId: await this.getAccountByCode(TRANSACTION_ACCOUNTS.SALES_INVOICE.revenue), // Sales Revenue
          description: `Sales return ${invoice.invoiceNumber}`,
          debitAmount: invoice.subtotal - invoice.discountAmount,
          creditAmount: 0
        }
      ]

      if (invoice.taxAmount > 0) {
        lines.push({
          accountId: await this.getAccountByCode(TRANSACTION_ACCOUNTS.SALES_INVOICE.tax), // Sales Tax Payable
          description: `Tax return ${invoice.invoiceNumber}`,
          debitAmount: invoice.taxAmount,
          creditAmount: 0
        })
      }

      await this.journalEntryService.createJournalEntry({
        date: invoice.invoiceDate,
        description: `Credit note ${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
        currency: 'USD',
        lines,
        status: 'POSTED' as const, // Create as posted when credit note is sent
        createdBy: userId
      })
    })
  }

  private async createPaymentJournalEntry(
    invoice: InvoiceWithDetails,
    payment: Payment,
    userId: string,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    return this.withLogging('createPaymentJournalEntry', async () => {
      // Import account codes
      const { TRANSACTION_ACCOUNTS } = await import('@/lib/constants/default-accounts')
      
      // Debit: Cash/Bank, Credit: Accounts Receivable
      const cashAccountId = payment.paymentMethod === 'CASH' 
        ? await this.getAccountByCode(TRANSACTION_ACCOUNTS.CUSTOMER_PAYMENT.cash, tx) // Cash on Hand
        : await this.getAccountByCode(TRANSACTION_ACCOUNTS.CUSTOMER_PAYMENT.bank, tx) // Bank

    const lines = [
      {
        accountId: cashAccountId,
        description: `Payment received ${payment.paymentNumber}`,
        debitAmount: payment.amount,
        creditAmount: 0
      },
      {
        accountId: await this.getAccountByCode(TRANSACTION_ACCOUNTS.CUSTOMER_PAYMENT.receivable, tx), // Accounts Receivable
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
        status: 'POSTED' as const, // Create as posted since payment is confirmed
        createdBy: userId
      }, tx)
    })
  }

  private async getAccountByCode(code: string, tx?: any): Promise<string> {
    return this.withLogging('getAccountByCode', async () => {
      const db = tx || prisma
      const account = await db.account.findFirst({
        where: { code }
      })
      
      if (!account) {
        throw new Error(`Account with code ${code} not found`)
      }
      
      return account.id
    })
  }
}