import { prisma } from '@/lib/db/prisma'
import { AuditService } from '../audit.service'
import { JournalEntryService } from '../accounting/journal-entry.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { SupplierInvoice, SupplierInvoiceItem, Prisma } from '@/lib/generated/prisma'

export interface CreateSupplierInvoiceInput {
  supplierId: string
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date
  currency: string
  items: Array<{
    goodsReceiptItemId: string
    description: string
    quantity: number
    unitPrice: number
    totalAmount: number
    accountId: string
    taxAmount?: number
  }>
  subtotal: number
  taxAmount?: number
  totalAmount: number
  taxAccountId?: string
  notes?: string
  createdBy: string
}

export interface SupplierInvoiceWithDetails extends SupplierInvoice {
  supplier: {
    id: string
    name: string
    code: string
    supplierNumber: string
  }
  items: Array<SupplierInvoiceItem & {
    goodsReceiptItem: {
      id: string
      quantityReceived: number
      quantityInvoiced?: number
      goodsReceipt: {
        receiptNumber: string
        purchaseOrder: {
          orderNumber: string
        }
      }
    }
    account: {
      code: string
      name: string
    }
  }>
  journalEntry?: {
    id: string
    entryNumber: string
    status: string
  } | null
}

export interface ThreeWayMatchingResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  matchingStatus: 'FULLY_MATCHED' | 'PARTIALLY_MATCHED' | 'OVER_MATCHED' | 'UNDER_MATCHED'
}

export class SupplierInvoiceService {
  private auditService: AuditService
  private journalEntryService: JournalEntryService

  constructor() {
    this.auditService = new AuditService()
    this.journalEntryService = new JournalEntryService()
  }

  async createSupplierInvoice(
    data: CreateSupplierInvoiceInput
  ): Promise<SupplierInvoiceWithDetails> {
    // Validate supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
      include: {
        supplierAccount: true
      }
    })

    if (!supplier) {
      throw new Error('Supplier not found')
    }

    if (!supplier.supplierAccount) {
      throw new Error('Supplier does not have an AP account configured')
    }

    // Check for duplicate invoice number
    const existingInvoice = await prisma.supplierInvoice.findFirst({
      where: {
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId
      }
    })

    if (existingInvoice) {
      throw new Error('Invoice number already exists for this supplier')
    }

    // Perform three-way matching validation
    const matchingResult = await this.validateThreeWayMatching(data.items)
    if (!matchingResult.isValid) {
      throw new Error(`Three-way matching failed: ${matchingResult.errors.join(', ')}`)
    }

    // Create transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the supplier invoice
      const supplierInvoice = await tx.supplierInvoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          supplierId: data.supplierId,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          currency: data.currency,
          status: 'POSTED',
          matchingStatus: matchingResult.matchingStatus,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount || 0,
          totalAmount: data.totalAmount,
          supplierAccountId: supplier.supplierAccount.id,
          taxAccountId: data.taxAccountId,
          notes: data.notes,
          createdBy: data.createdBy
        },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              code: true,
              supplierNumber: true
            }
          }
        }
      })

      // Create invoice items
      const invoiceItems = []
      for (const itemData of data.items) {
        const invoiceItem = await tx.supplierInvoiceItem.create({
          data: {
            supplierInvoiceId: supplierInvoice.id,
            goodsReceiptItemId: itemData.goodsReceiptItemId,
            description: itemData.description,
            quantity: itemData.quantity,
            unitPrice: itemData.unitPrice,
            totalAmount: itemData.totalAmount,
            accountId: itemData.accountId,
            taxAmount: itemData.taxAmount || 0
          },
          include: {
            goodsReceiptItem: {
              include: {
                goodsReceipt: {
                  include: {
                    purchaseOrder: {
                      select: {
                        orderNumber: true
                      }
                    }
                  }
                }
              }
            },
            account: {
              select: {
                code: true,
                name: true
              }
            }
          }
        })

        // Update goods receipt item with invoiced quantity
        await tx.goodsReceiptItem.update({
          where: { id: itemData.goodsReceiptItemId },
          data: {
            quantityInvoiced: {
              increment: itemData.quantity
            }
          }
        })

        invoiceItems.push(invoiceItem)
      }

      // Create journal entry for AP posting
      const journalEntry = await this.createAPJournalEntry(
        supplierInvoice,
        invoiceItems,
        supplier,
        data.createdBy,
        tx
      )

      // Update supplier invoice with journal entry reference
      await tx.supplierInvoice.update({
        where: { id: supplierInvoice.id },
        data: { journalEntryId: journalEntry?.id }
      })

      return {
        ...supplierInvoice,
        items: invoiceItems,
        journalEntry: journalEntry ? {
          id: journalEntry.id,
          entryNumber: journalEntry.entryNumber,
          status: journalEntry.status
        } : null
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId: data.createdBy,
      action: AuditAction.CREATE,
      entityType: 'SupplierInvoice',
      entityId: result.id,
      afterData: result,
    })

    return result as SupplierInvoiceWithDetails
  }

  private async validateThreeWayMatching(
    items: CreateSupplierInvoiceInput['items']
  ): Promise<ThreeWayMatchingResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const _totalOrderedQty = 0
    let totalReceivedQty = 0
    let totalInvoicedQty = 0
    let totalNewInvoiceQty = 0

    for (const item of items) {
      // Get goods receipt item with related data
      const grItem = await prisma.goodsReceiptItem.findUnique({
        where: { id: item.goodsReceiptItemId },
        include: {
          purchaseOrderItem: {
            select: {
              quantity: true
            }
          }
        }
      })

      if (!grItem) {
        errors.push(`Goods receipt item ${item.goodsReceiptItemId} not found`)
        continue
      }

      // Check if quantity being invoiced exceeds quantity received
      const currentlyInvoiced = grItem.quantityInvoiced || 0
      const totalToBeInvoiced = currentlyInvoiced + item.quantity

      if (totalToBeInvoiced > grItem.quantityReceived) {
        errors.push(
          `Invoice quantity (${item.quantity}) exceeds received quantity (${grItem.quantityReceived - currentlyInvoiced} remaining) for item ${item.description}`
        )
      }

      // Accumulate quantities for overall matching status
      // totalOrderedQty += grItem.purchaseOrderItem?.quantity || 0
      totalReceivedQty += grItem.quantityReceived
      totalInvoicedQty += currentlyInvoiced
      totalNewInvoiceQty += item.quantity

      // Price variance check (warning only)
      const expectedPrice = grItem.unitCost
      const priceVariance = Math.abs(item.unitPrice - expectedPrice) / expectedPrice
      if (priceVariance > 0.1) { // 10% tolerance
        warnings.push(
          `Price variance detected for ${item.description}: Expected $${expectedPrice.toFixed(2)}, Invoiced $${item.unitPrice.toFixed(2)}`
        )
      }
    }

    // Determine matching status
    let matchingStatus: ThreeWayMatchingResult['matchingStatus']
    const finalInvoicedQty = totalInvoicedQty + totalNewInvoiceQty

    if (finalInvoicedQty === totalReceivedQty) {
      matchingStatus = 'FULLY_MATCHED'
    } else if (finalInvoicedQty < totalReceivedQty) {
      matchingStatus = 'PARTIALLY_MATCHED'
    } else if (finalInvoicedQty > totalReceivedQty) {
      matchingStatus = 'OVER_MATCHED'
      errors.push('Total invoice quantity exceeds total received quantity')
    } else {
      matchingStatus = 'UNDER_MATCHED'
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      matchingStatus
    }
  }

  private async createAPJournalEntry(
    invoice: Record<string, unknown>,
    items: Record<string, unknown>[],
    supplier: Record<string, unknown>,
    userId: string,
    tx: Prisma.TransactionClient
  ) {
    const lines = []

    // Debit line items to their respective accounts (Inventory/Expense)
    for (const item of items) {
      lines.push({
        accountId: item.accountId,
        description: `${invoice.invoiceNumber} - ${item.description}`,
        debitAmount: item.totalAmount,
        creditAmount: 0
      })
    }

    // Debit tax if applicable
    if (invoice.taxAmount > 0 && invoice.taxAccountId) {
      lines.push({
        accountId: invoice.taxAccountId,
        description: `${invoice.invoiceNumber} - Tax`,
        debitAmount: invoice.taxAmount,
        creditAmount: 0
      })
    }

    // Credit Accounts Payable
    lines.push({
      accountId: supplier.supplierAccount.id,
      description: `${invoice.invoiceNumber} - ${supplier.name}`,
      debitAmount: 0,
      creditAmount: invoice.totalAmount
    })

    if (lines.length >= 2) {
      return await this.journalEntryService.createJournalEntry({
        date: invoice.invoiceDate,
        description: `Supplier Invoice ${invoice.invoiceNumber} - ${supplier.name}`,
        reference: invoice.invoiceNumber,
        currency: invoice.currency,
        lines,
        createdBy: userId
      }, tx)
    }

    return null
  }

  async getSupplierInvoice(id: string): Promise<SupplierInvoiceWithDetails | null> {
    return prisma.supplierInvoice.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
            supplierNumber: true
          }
        },
        items: {
          include: {
            goodsReceiptItem: {
              include: {
                goodsReceipt: {
                  include: {
                    purchaseOrder: {
                      select: {
                        orderNumber: true
                      }
                    }
                  }
                }
              }
            },
            account: {
              select: {
                code: true,
                name: true
              }
            }
          }
        },
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            status: true
          }
        }
      }
    })
  }

  async getAllSupplierInvoices(options: {
    supplierId?: string
    status?: string
    matchingStatus?: string
    dateFrom?: Date
    dateTo?: Date
    search?: string
    limit?: number
    offset?: number
  } = {}): Promise<SupplierInvoiceWithDetails[]> {
    const {
      supplierId,
      status,
      matchingStatus,
      dateFrom,
      dateTo,
      search,
      limit = 100,
      offset = 0
    } = options

    const where: Record<string, unknown> = {}
    
    if (supplierId) {
      where.supplierId = supplierId
    }
    
    if (status) {
      where.status = status
    }

    if (matchingStatus) {
      where.matchingStatus = matchingStatus
    }
    
    if (dateFrom || dateTo) {
      where.invoiceDate = {}
      if (dateFrom) where.invoiceDate.gte = dateFrom
      if (dateTo) where.invoiceDate.lte = dateTo
    }
    
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
        { supplier: { code: { contains: search, mode: 'insensitive' } } }
      ]
    }

    return prisma.supplierInvoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      take: limit,
      skip: offset,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
            supplierNumber: true
          }
        },
        items: {
          include: {
            goodsReceiptItem: {
              include: {
                goodsReceipt: {
                  include: {
                    purchaseOrder: {
                      select: {
                        orderNumber: true
                      }
                    }
                  }
                }
              }
            },
            account: {
              select: {
                code: true,
                name: true
              }
            }
          }
        },
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            status: true
          }
        }
      }
    })
  }

  async getSupplierBalance(supplierId: string): Promise<number> {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        supplierAccount: true
      }
    })

    if (!supplier?.supplierAccount) {
      return 0
    }

    return supplier.supplierAccount.balance || 0
  }

  async getSupplierInvoicesBySupplier(
    supplierId: string,
    options?: {
      status?: string
      limit?: number
      offset?: number
    }
  ): Promise<SupplierInvoiceWithDetails[]> {
    return this.getAllSupplierInvoices({
      supplierId,
      ...options
    })
  }

  async updateSupplierInvoice(
    id: string,
    data: Partial<CreateSupplierInvoiceInput>,
    userId: string
  ): Promise<SupplierInvoiceWithDetails> {
    const existingInvoice = await this.getSupplierInvoice(id)
    if (!existingInvoice) {
      throw new Error('Supplier invoice not found')
    }

    if (existingInvoice.status === 'POSTED') {
      throw new Error('Cannot modify posted invoice')
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update the invoice
      const updatedInvoice = await tx.supplierInvoice.update({
        where: { id },
        data: {
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          currency: data.currency,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          totalAmount: data.totalAmount,
          notes: data.notes
        },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              code: true,
              supplierNumber: true
            }
          }
        }
      })

      // If items are provided, update them
      if (data.items) {
        // Delete existing items
        await tx.supplierInvoiceItem.deleteMany({
          where: { supplierInvoiceId: id }
        })

        // Create new items
        const invoiceItems = []
        for (const itemData of data.items) {
          const invoiceItem = await tx.supplierInvoiceItem.create({
            data: {
              supplierInvoiceId: id,
              goodsReceiptItemId: itemData.goodsReceiptItemId,
              description: itemData.description,
              quantity: itemData.quantity,
              unitPrice: itemData.unitPrice,
              totalAmount: itemData.totalAmount,
              accountId: itemData.accountId,
              taxAmount: itemData.taxAmount || 0
            },
            include: {
              goodsReceiptItem: {
                include: {
                  goodsReceipt: {
                    include: {
                      purchaseOrder: {
                        select: {
                          orderNumber: true
                        }
                      }
                    }
                  }
                }
              },
              account: {
                select: {
                  code: true,
                  name: true
                }
              }
            }
          })

          invoiceItems.push(invoiceItem)
        }

        return {
          ...updatedInvoice,
          items: invoiceItems,
          journalEntry: existingInvoice.journalEntry
        }
      }

      return {
        ...updatedInvoice,
        items: existingInvoice.items,
        journalEntry: existingInvoice.journalEntry
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'SupplierInvoice',
      entityId: id,
      beforeData: existingInvoice,
      afterData: result,
    })

    return result as SupplierInvoiceWithDetails
  }

  async cancelSupplierInvoice(id: string, userId: string): Promise<SupplierInvoiceWithDetails> {
    const existingInvoice = await this.getSupplierInvoice(id)
    if (!existingInvoice) {
      throw new Error('Supplier invoice not found')
    }

    if (existingInvoice.status === 'CANCELLED') {
      throw new Error('Invoice is already cancelled')
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update invoice status
      const updatedInvoice = await tx.supplierInvoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: userId
        },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              code: true,
              supplierNumber: true
            }
          },
          items: {
            include: {
              goodsReceiptItem: {
                include: {
                  goodsReceipt: {
                    include: {
                      purchaseOrder: {
                        select: {
                          orderNumber: true
                        }
                      }
                    }
                  }
                }
              },
              account: {
                select: {
                  code: true,
                  name: true
                }
              }
            }
          },
          journalEntry: {
            select: {
              id: true,
              entryNumber: true,
              status: true
            }
          }
        }
      })

      // Reverse the goods receipt item quantities
      for (const item of existingInvoice.items) {
        await tx.goodsReceiptItem.update({
          where: { id: item.goodsReceiptItemId },
          data: {
            quantityInvoiced: {
              decrement: item.quantity
            }
          }
        })
      }

      // Create reversal journal entry
      if (existingInvoice.journalEntry) {
        await this.createReversalJournalEntry(
          existingInvoice,
          userId,
          tx
        )
      }

      return updatedInvoice
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'SupplierInvoice',
      entityId: id,
      beforeData: existingInvoice,
      afterData: result,
    })

    return result as SupplierInvoiceWithDetails
  }

  private async createReversalJournalEntry(
    invoice: SupplierInvoiceWithDetails,
    userId: string,
    tx: Prisma.TransactionClient
  ) {
    const lines = []

    // Credit line items (reverse the debits)
    for (const item of invoice.items) {
      lines.push({
        accountId: item.accountId,
        description: `Reversal of ${invoice.invoiceNumber} - ${item.description}`,
        debitAmount: 0,
        creditAmount: item.totalAmount
      })
    }

    // Credit tax if applicable (reverse the debit)
    if (invoice.taxAmount > 0 && invoice.taxAccountId) {
      lines.push({
        accountId: invoice.taxAccountId,
        description: `Reversal of ${invoice.invoiceNumber} - Tax`,
        debitAmount: 0,
        creditAmount: invoice.taxAmount
      })
    }

    // Debit Accounts Payable (reverse the credit)
    lines.push({
      accountId: invoice.supplierAccountId,
      description: `Reversal of ${invoice.invoiceNumber} - ${invoice.supplier.name}`,
      debitAmount: invoice.totalAmount,
      creditAmount: 0
    })

    return await this.journalEntryService.createJournalEntry({
      date: new Date(),
      description: `Reversal of Supplier Invoice ${invoice.invoiceNumber} - ${invoice.supplier.name}`,
      reference: `REV-${invoice.invoiceNumber}`,
      currency: invoice.currency,
      lines,
      createdBy: userId
    }, tx)
  }
}