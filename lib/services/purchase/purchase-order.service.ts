import { prisma } from '@/lib/db/prisma'
import { BaseService } from '../base.service'
import { 
  PurchaseOrder, 
  PurchaseOrderItem,
  POStatus,
  Prisma
} from '@/lib/generated/prisma'

export interface CreatePurchaseOrderInput {
  supplierId: string
  orderDate?: Date
  expectedDate?: Date
  requestedBy?: string
  paymentTerms?: string
  deliveryTerms?: string
  shippingAddress?: string
  billingAddress?: string
  notes?: string
  internalNotes?: string
  currency?: string
  exchangeRate?: number
  items: CreatePOItemInput[]
}

export interface CreatePOItemInput {
  itemId?: string
  itemCode: string
  description: string
  quantity: number
  unitPrice: number
  discount?: number
  taxRate?: number
  unitOfMeasureId?: string
  sortOrder?: number
}

export interface UpdatePurchaseOrderInput {
  expectedDate?: Date
  requestedBy?: string
  paymentTerms?: string
  deliveryTerms?: string
  shippingAddress?: string
  billingAddress?: string
  notes?: string
  internalNotes?: string
  currency?: string
  exchangeRate?: number
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier: {
    id: string
    supplierNumber: string
    name: string
    email?: string | null
    phone?: string | null
    paymentTerms: number
  }
  items: (PurchaseOrderItem & {
    item?: {
      id: string
      code: string
      name: string
      trackInventory: boolean
    } | null
    unitOfMeasure?: {
      id: string
      code: string
      name: string
      symbol?: string | null
    } | null
  })[]
  _count?: {
    receipts: number
    supplierInvoices: number
  }
}

export class PurchaseOrderService extends BaseService {
  constructor() {
    super('PurchaseOrderService')
  }

  async createPurchaseOrder(
    data: CreatePurchaseOrderInput & { createdBy: string }
  ): Promise<PurchaseOrderWithDetails> {
    return this.withLogging('createPurchaseOrder', async () => {
      // Validate supplier exists
      const supplier = await prisma.supplier.findUnique({
        where: { id: data.supplierId }
      })

      if (!supplier) {
        throw new Error('Supplier not found')
      }

      if (!supplier.isActive) {
        throw new Error('Cannot create purchase order for inactive supplier')
      }

      // Validate items
      if (!data.items || data.items.length === 0) {
        throw new Error('Purchase order must have at least one item')
      }

      // Calculate totals
      let subtotal = 0
      let taxAmount = 0
      let discountAmount = 0

      for (const item of data.items) {
        if (item.quantity <= 0) {
          throw new Error('Item quantity must be positive')
        }
        if (item.unitPrice < 0) {
          throw new Error('Item unit price cannot be negative')
        }

        const itemSubtotal = item.quantity * item.unitPrice
        const itemDiscount = itemSubtotal * ((item.discount || 0) / 100)
        const itemNetAmount = itemSubtotal - itemDiscount
        const itemTax = itemNetAmount * ((item.taxRate || 0) / 100)

        subtotal += itemSubtotal
        discountAmount += itemDiscount
        taxAmount += itemTax
      }

      const totalAmount = subtotal - discountAmount + taxAmount

      return prisma.$transaction(async (tx) => {
        // Generate PO number
        const poNumber = await this.generatePONumber()

        // Create purchase order
        const purchaseOrder = await tx.purchaseOrder.create({
          data: {
            poNumber,
            supplierId: data.supplierId,
            orderDate: data.orderDate || new Date(),
            expectedDate: data.expectedDate,
            requestedBy: data.requestedBy,
            subtotal,
            taxAmount,
            discountAmount,
            totalAmount,
            paymentTerms: data.paymentTerms,
            deliveryTerms: data.deliveryTerms,
            shippingAddress: data.shippingAddress,
            billingAddress: data.billingAddress,
            notes: data.notes,
            internalNotes: data.internalNotes,
            currency: data.currency || supplier.currency,
            exchangeRate: data.exchangeRate || 1.0,
            createdBy: data.createdBy
          }
        })

        // Create purchase order items
        for (const [index, itemData] of data.items.entries()) {
          const itemSubtotal = itemData.quantity * itemData.unitPrice
          const itemDiscount = itemSubtotal * ((itemData.discount || 0) / 100)
          const itemNetAmount = itemSubtotal - itemDiscount
          const itemTax = itemNetAmount * ((itemData.taxRate || 0) / 100)
          const itemTotal = itemSubtotal - itemDiscount + itemTax

          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: purchaseOrder.id,
              itemId: itemData.itemId,
              itemCode: itemData.itemCode,
              description: itemData.description,
              quantity: itemData.quantity,
              unitPrice: itemData.unitPrice,
              discount: itemData.discount || 0,
              taxRate: itemData.taxRate || 0,
              unitOfMeasureId: itemData.unitOfMeasureId,
              subtotal: itemSubtotal,
              discountAmount: itemDiscount,
              taxAmount: itemTax,
              totalAmount: itemTotal,
              sortOrder: itemData.sortOrder || index + 1
            }
          })
        }

        // Fetch and return the complete PO
        return tx.purchaseOrder.findUnique({
          where: { id: purchaseOrder.id },
          include: {
            supplier: {
              select: {
                id: true,
                supplierNumber: true,
                name: true,
                email: true,
                phone: true,
                paymentTerms: true
              }
            },
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    trackInventory: true
                  }
                },
                unitOfMeasure: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    symbol: true
                  }
                }
              },
              orderBy: { sortOrder: 'asc' }
            },
            _count: {
              select: {
                receipts: true,
                supplierInvoices: true
              }
            }
          }
        }) as PurchaseOrderWithDetails
      })
    })
  }

  async updatePurchaseOrder(
    id: string,
    data: UpdatePurchaseOrderInput,
    _userId: string
  ): Promise<PurchaseOrderWithDetails> {
    return this.withLogging('updatePurchaseOrder', async () => {
      const existingPO = await prisma.purchaseOrder.findUnique({
        where: { id }
      })

      if (!existingPO) {
        throw new Error('Purchase order not found')
      }

      if (existingPO.status !== POStatus.DRAFT) {
        throw new Error('Can only update draft purchase orders')
      }

      const updatedPO = await prisma.purchaseOrder.update({
        where: { id },
        data,
        include: {
          supplier: {
            select: {
              id: true,
              supplierNumber: true,
              name: true,
              email: true,
              phone: true,
              paymentTerms: true
            }
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  trackInventory: true
                }
              },
              unitOfMeasure: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  symbol: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          },
          _count: {
            select: {
              receipts: true,
              supplierInvoices: true
            }
          }
        }
      })

      return updatedPO as PurchaseOrderWithDetails
    })
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrderWithDetails | null> {
    return this.withLogging('getPurchaseOrder', async () => {
      return prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: {
            select: {
              id: true,
              supplierNumber: true,
              name: true,
              email: true,
              phone: true,
              paymentTerms: true
            }
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  trackInventory: true
                }
              },
              unitOfMeasure: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  symbol: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          },
          _count: {
            select: {
              receipts: true,
              supplierInvoices: true
            }
          }
        }
      }) as PurchaseOrderWithDetails | null
    })
  }

  async getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrderWithDetails | null> {
    return this.withLogging('getPurchaseOrderByNumber', async () => {
      return prisma.purchaseOrder.findUnique({
        where: { poNumber },
        include: {
          supplier: {
            select: {
              id: true,
              supplierNumber: true,
              name: true,
              email: true,
              phone: true,
              paymentTerms: true
            }
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  trackInventory: true
                }
              },
              unitOfMeasure: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  symbol: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          },
          _count: {
            select: {
              receipts: true,
              supplierInvoices: true
            }
          }
        }
      }) as PurchaseOrderWithDetails | null
    })
  }

  async getAllPurchaseOrders(options?: {
    supplierId?: string
    status?: POStatus
    dateFrom?: Date
    dateTo?: Date
    search?: string
    limit?: number
    offset?: number
  }): Promise<PurchaseOrderWithDetails[]> {
    return this.withLogging('getAllPurchaseOrders', async () => {
      const where: Prisma.PurchaseOrderWhereInput = {}

      if (options?.supplierId) {
        where.supplierId = options.supplierId
      }

      if (options?.status) {
        where.status = options.status
      }

      if (options?.dateFrom || options?.dateTo) {
        where.orderDate = {}
        if (options.dateFrom) {
          where.orderDate.gte = options.dateFrom
        }
        if (options.dateTo) {
          where.orderDate.lte = options.dateTo
        }
      }

      if (options?.search) {
        where.OR = [
          { poNumber: { contains: options.search, mode: 'insensitive' } },
          { supplier: { name: { contains: options.search, mode: 'insensitive' } } },
          { requestedBy: { contains: options.search, mode: 'insensitive' } }
        ]
      }

      return prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              supplierNumber: true,
              name: true,
              email: true,
              phone: true,
              paymentTerms: true
            }
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  trackInventory: true
                }
              },
              unitOfMeasure: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  symbol: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          },
          _count: {
            select: {
              receipts: true,
              supplierInvoices: true
            }
          }
        },
        orderBy: { orderDate: 'desc' },
        take: options?.limit,
        skip: options?.offset
      }) as PurchaseOrderWithDetails[]
    })
  }

  async approvePurchaseOrder(id: string, userId: string): Promise<PurchaseOrderWithDetails> {
    return this.withLogging('approvePurchaseOrder', async () => {
      const po = await this.getPurchaseOrder(id)
      if (!po) {
        throw new Error('Purchase order not found')
      }

      if (po.status !== POStatus.DRAFT && po.status !== POStatus.SUBMITTED) {
        throw new Error('Can only approve draft or submitted purchase orders')
      }

      return this.updatePurchaseOrderStatus(id, POStatus.APPROVED, {
        approvedBy: userId,
        approvedAt: new Date()
      })
    })
  }

  async sendToSupplier(id: string, _userId: string): Promise<PurchaseOrderWithDetails> {
    return this.withLogging('sendToSupplier', async () => {
      const po = await this.getPurchaseOrder(id)
      if (!po) {
        throw new Error('Purchase order not found')
      }

      if (po.status !== POStatus.APPROVED) {
        throw new Error('Can only send approved purchase orders')
      }

      return this.updatePurchaseOrderStatus(id, POStatus.ORDERED, {
        sentToSupplier: true,
        sentAt: new Date()
      })
    })
  }

  async cancelPurchaseOrder(id: string, _userId: string): Promise<PurchaseOrderWithDetails> {
    return this.withLogging('cancelPurchaseOrder', async () => {
      const po = await this.getPurchaseOrder(id)
      if (!po) {
        throw new Error('Purchase order not found')
      }

      if (po.status === POStatus.COMPLETED || po.status === POStatus.CANCELLED) {
        throw new Error('Cannot cancel completed or already cancelled purchase orders')
      }

      if (po.receivedAmount > 0) {
        throw new Error('Cannot cancel purchase order with received items')
      }

      return this.updatePurchaseOrderStatus(id, POStatus.CANCELLED, {})
    })
  }

  private async updatePurchaseOrderStatus(
    id: string,
    status: POStatus,
    additionalData: Record<string, unknown>
  ): Promise<PurchaseOrderWithDetails> {
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        ...additionalData
      },
      include: {
        supplier: {
          select: {
            id: true,
            supplierNumber: true,
            name: true,
            email: true,
            phone: true,
            paymentTerms: true
          }
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                code: true,
                name: true,
                trackInventory: true
              }
            },
            unitOfMeasure: {
              select: {
                id: true,
                code: true,
                name: true,
                symbol: true
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: {
            receipts: true,
            supplierInvoices: true
          }
        }
      }
    })

    return updatedPO as PurchaseOrderWithDetails
  }

  private async generatePONumber(): Promise<string> {
    const lastPO = await prisma.purchaseOrder.findFirst({
      orderBy: { poNumber: 'desc' }
    })

    if (!lastPO) {
      return 'PO-0001'
    }

    const match = lastPO.poNumber.match(/PO-(\d+)$/)
    if (match) {
      const lastNumber = parseInt(match[1])
      const newNumber = lastNumber + 1
      return `PO-${newNumber.toString().padStart(4, '0')}`
    }

    return 'PO-0001'
  }
}