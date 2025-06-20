import { prisma } from '@/lib/db/prisma'
import { BaseService } from '../base.service'
import { StockMovementService } from '../inventory/stock-movement.service'
import { 
  GoodsReceipt, 
  GoodsReceiptItem,
  ReceiptStatus,
  POStatus,
  Prisma
} from '@/lib/generated/prisma'
import { MovementType } from '@/lib/types/shared-enums'

export interface CreateGoodsReceiptInput {
  purchaseOrderId: string
  receiptDate?: Date
  deliveryNote?: string
  condition?: string
  notes?: string
  items: CreateReceiptItemInput[]
}

export interface CreateReceiptItemInput {
  purchaseOrderItemId: string
  quantityReceived: number
  unitCost?: number
  condition?: string
  notes?: string
}

export interface GoodsReceiptWithDetails extends GoodsReceipt {
  purchaseOrder: {
    id: string
    poNumber: string
    supplier: {
      id: string
      name: string
      supplierNumber: string
    }
  }
  items: (GoodsReceiptItem & {
    purchaseOrderItem: {
      id: string
      itemCode: string
      description: string
      quantity: number
      unitPrice: number
      quantityReceived: number
    }
    item: {
      id: string
      code: string
      name: string
      trackInventory: boolean
      unitOfMeasure: {
        id: string
        code: string
        name: string
        symbol?: string | null
      }
    }
  })[]
}

export class GoodsReceiptService extends BaseService {
  private stockMovementService: StockMovementService

  constructor() {
    super('GoodsReceiptService')
    this.stockMovementService = new StockMovementService()
  }

  async createGoodsReceipt(
    data: CreateGoodsReceiptInput & { receivedBy: string }
  ): Promise<GoodsReceiptWithDetails> {
    return this.withLogging('createGoodsReceipt', async () => {
      // Validate purchase order exists and is in proper status
      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId },
        include: {
          supplier: true,
          items: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true
                }
              }
            }
          }
        }
      })

      if (!purchaseOrder) {
        throw new Error('Purchase order not found')
      }

      if (purchaseOrder.status !== POStatus.ORDERED && purchaseOrder.status !== POStatus.PARTIAL_RECEIVED) {
        throw new Error('Purchase order must be ordered to receive items')
      }

      // Validate receipt items
      if (!data.items || data.items.length === 0) {
        throw new Error('Goods receipt must have at least one item')
      }

      // Validate each receipt item
      for (const receiptItem of data.items) {
        const poItem = purchaseOrder.items.find(item => item.id === receiptItem.purchaseOrderItemId)
        if (!poItem) {
          throw new Error(`Purchase order item ${receiptItem.purchaseOrderItemId} not found`)
        }

        if (receiptItem.quantityReceived <= 0) {
          throw new Error('Received quantity must be positive')
        }

        const remainingQuantity = poItem.quantity - poItem.quantityReceived
        if (receiptItem.quantityReceived > remainingQuantity) {
          throw new Error(`Cannot receive ${receiptItem.quantityReceived} of item ${poItem.itemCode}. Only ${remainingQuantity} remaining.`)
        }
      }

      return prisma.$transaction(async (tx) => {
        // Generate receipt number
        const receiptNumber = await this.generateReceiptNumber()

        // Create goods receipt
        const goodsReceipt = await tx.goodsReceipt.create({
          data: {
            receiptNumber,
            purchaseOrderId: data.purchaseOrderId,
            receiptDate: data.receiptDate || new Date(),
            deliveryNote: data.deliveryNote,
            receivedBy: data.receivedBy,
            condition: data.condition,
            notes: data.notes,
            createdBy: data.receivedBy
          }
        })

        // Process each receipt item
        const receiptItems = []
        for (const receiptItemData of data.items) {
          const poItem = purchaseOrder.items.find(item => item.id === receiptItemData.purchaseOrderItemId)!
          
          // Create receipt item
          const receiptItem = await tx.goodsReceiptItem.create({
            data: {
              goodsReceiptId: goodsReceipt.id,
              purchaseOrderItemId: receiptItemData.purchaseOrderItemId,
              itemId: poItem.itemId!,
              itemCode: poItem.itemCode,
              description: poItem.description,
              quantityOrdered: poItem.quantity,
              quantityReceived: receiptItemData.quantityReceived,
              unitCost: receiptItemData.unitCost || poItem.unitPrice,
              condition: receiptItemData.condition,
              notes: receiptItemData.notes
            }
          })

          receiptItems.push(receiptItem)

          // Update PO item received quantity
          await tx.purchaseOrderItem.update({
            where: { id: receiptItemData.purchaseOrderItemId },
            data: {
              quantityReceived: {
                increment: receiptItemData.quantityReceived
              }
            }
          })

          // Create stock movement if item tracks inventory
          if (poItem.item?.trackInventory) {
            await this.stockMovementService.createStockMovement({
              itemId: poItem.itemId!,
              movementType: MovementType.STOCK_IN,
              movementDate: data.receiptDate || new Date(),
              quantity: receiptItemData.quantityReceived,
              unitCost: receiptItemData.unitCost || poItem.unitPrice,
              unitOfMeasureId: poItem.item.unitOfMeasureId,
              referenceType: 'PURCHASE',
              referenceId: goodsReceipt.id,
              referenceNumber: receiptNumber,
              notes: `Goods receipt from PO ${purchaseOrder.poNumber}`,
              supplierName: purchaseOrder.supplier.name,
              purchaseRef: purchaseOrder.poNumber,
              autoCreateLot: true,
              createdBy: data.receivedBy
            })
          }
        }

        // Update PO received amount and status
        const totalReceivedValue = receiptItems.reduce((sum, item) => 
          sum + (item.quantityReceived * item.unitCost), 0
        )

        await tx.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: {
            receivedAmount: {
              increment: totalReceivedValue
            }
          }
        })

        // Check if PO is fully received and update status
        const updatedPO = await tx.purchaseOrder.findUnique({
          where: { id: data.purchaseOrderId },
          include: { items: true }
        })

        if (updatedPO) {
          const allItemsFullyReceived = updatedPO.items.every(item => 
            item.quantityReceived >= item.quantity
          )

          if (allItemsFullyReceived) {
            await tx.purchaseOrder.update({
              where: { id: data.purchaseOrderId },
              data: { status: POStatus.RECEIVED }
            })
          } else {
            await tx.purchaseOrder.update({
              where: { id: data.purchaseOrderId },
              data: { status: POStatus.PARTIAL_RECEIVED }
            })
          }
        }

        // Mark goods receipt as completed
        await tx.goodsReceipt.update({
          where: { id: goodsReceipt.id },
          data: { status: ReceiptStatus.COMPLETED }
        })

        // Fetch and return complete receipt
        return tx.goodsReceipt.findUnique({
          where: { id: goodsReceipt.id },
          include: {
            purchaseOrder: {
              select: {
                id: true,
                poNumber: true,
                supplier: {
                  select: {
                    id: true,
                    name: true,
                    supplierNumber: true
                  }
                }
              }
            },
            items: {
              include: {
                purchaseOrderItem: {
                  select: {
                    id: true,
                    itemCode: true,
                    description: true,
                    quantity: true,
                    unitPrice: true,
                    quantityReceived: true
                  }
                },
                item: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    trackInventory: true,
                    unitOfMeasure: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        symbol: true
                      }
                    }
                  }
                }
              }
            }
          }
        }) as GoodsReceiptWithDetails
      })
    })
  }

  async getGoodsReceipt(id: string): Promise<GoodsReceiptWithDetails | null> {
    return this.withLogging('getGoodsReceipt', async () => {
      return prisma.goodsReceipt.findUnique({
        where: { id },
        include: {
          purchaseOrder: {
            select: {
              id: true,
              poNumber: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                  supplierNumber: true
                }
              }
            }
          },
          items: {
            include: {
              purchaseOrderItem: {
                select: {
                  id: true,
                  itemCode: true,
                  description: true,
                  quantity: true,
                  unitPrice: true,
                  quantityReceived: true
                }
              },
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  trackInventory: true,
                  unitOfMeasure: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      symbol: true
                    }
                  }
                }
              }
            }
          }
        }
      }) as GoodsReceiptWithDetails | null
    })
  }

  async getGoodsReceiptByNumber(receiptNumber: string): Promise<GoodsReceiptWithDetails | null> {
    return this.withLogging('getGoodsReceiptByNumber', async () => {
      return prisma.goodsReceipt.findUnique({
        where: { receiptNumber },
        include: {
          purchaseOrder: {
            select: {
              id: true,
              poNumber: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                  supplierNumber: true
                }
              }
            }
          },
          items: {
            include: {
              purchaseOrderItem: {
                select: {
                  id: true,
                  itemCode: true,
                  description: true,
                  quantity: true,
                  unitPrice: true,
                  quantityReceived: true
                }
              },
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  trackInventory: true,
                  unitOfMeasure: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      symbol: true
                    }
                  }
                }
              }
            }
          }
        }
      }) as GoodsReceiptWithDetails | null
    })
  }

  async getAllGoodsReceipts(options?: {
    purchaseOrderId?: string
    status?: ReceiptStatus
    dateFrom?: Date
    dateTo?: Date
    search?: string
    limit?: number
    offset?: number
  }): Promise<GoodsReceiptWithDetails[]> {
    return this.withLogging('getAllGoodsReceipts', async () => {
      const where: Prisma.GoodsReceiptWhereInput = {}

      if (options?.purchaseOrderId) {
        where.purchaseOrderId = options.purchaseOrderId
      }

      if (options?.status) {
        where.status = options.status
      }

      if (options?.dateFrom || options?.dateTo) {
        where.receiptDate = {}
        if (options.dateFrom) {
          where.receiptDate.gte = options.dateFrom
        }
        if (options.dateTo) {
          where.receiptDate.lte = options.dateTo
        }
      }

      if (options?.search) {
        where.OR = [
          { receiptNumber: { contains: options.search, mode: 'insensitive' } },
          { purchaseOrder: { poNumber: { contains: options.search, mode: 'insensitive' } } },
          { deliveryNote: { contains: options.search, mode: 'insensitive' } }
        ]
      }

      return prisma.goodsReceipt.findMany({
        where,
        include: {
          purchaseOrder: {
            select: {
              id: true,
              poNumber: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                  supplierNumber: true
                }
              }
            }
          },
          items: {
            include: {
              purchaseOrderItem: {
                select: {
                  id: true,
                  itemCode: true,
                  description: true,
                  quantity: true,
                  unitPrice: true,
                  quantityReceived: true
                }
              },
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  trackInventory: true,
                  unitOfMeasure: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      symbol: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { receiptDate: 'desc' },
        take: options?.limit,
        skip: options?.offset
      }) as GoodsReceiptWithDetails[]
    })
  }

  async rejectGoodsReceipt(id: string, reason: string, _userId: string): Promise<GoodsReceiptWithDetails> {
    return this.withLogging('rejectGoodsReceipt', async () => {
      const receipt = await this.getGoodsReceipt(id)
      if (!receipt) {
        throw new Error('Goods receipt not found')
      }

      if (receipt.status !== ReceiptStatus.PENDING) {
        throw new Error('Can only reject pending goods receipts')
      }

      // Update receipt status to rejected
      const updatedReceipt = await prisma.goodsReceipt.update({
        where: { id },
        data: {
          status: ReceiptStatus.REJECTED,
          notes: `${receipt.notes || ''}\nREJECTED: ${reason}`.trim()
        },
        include: {
          purchaseOrder: {
            select: {
              id: true,
              poNumber: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                  supplierNumber: true
                }
              }
            }
          },
          items: {
            include: {
              purchaseOrderItem: {
                select: {
                  id: true,
                  itemCode: true,
                  description: true,
                  quantity: true,
                  unitPrice: true,
                  quantityReceived: true
                }
              },
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  trackInventory: true,
                  unitOfMeasure: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      symbol: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      return updatedReceipt as GoodsReceiptWithDetails
    })
  }

  private async generateReceiptNumber(): Promise<string> {
    const lastReceipt = await prisma.goodsReceipt.findFirst({
      orderBy: { receiptNumber: 'desc' }
    })

    if (!lastReceipt) {
      return 'GR-0001'
    }

    const match = lastReceipt.receiptNumber.match(/GR-(\d+)$/)
    if (match) {
      const lastNumber = parseInt(match[1])
      const newNumber = lastNumber + 1
      return `GR-${newNumber.toString().padStart(4, '0')}`
    }

    return 'GR-0001'
  }
}