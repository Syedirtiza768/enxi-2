import { prisma } from '@/lib/db/prisma'
import { BaseService } from '../base.service'
import { StockMovementService } from '../inventory/stock-movement.service'
import { 
  StockTransfer, 
  StockTransferItem,
  TransferStatus,
  Prisma
} from '@/lib/generated/prisma'
import { MovementType } from '@/lib/types/shared-enums'

export interface CreateStockTransferInput {
  fromLocationId: string
  toLocationId: string
  expectedDate?: Date
  reason?: string
  notes?: string
  items: CreateTransferItemInput[]
}

export interface CreateTransferItemInput {
  itemId: string
  stockLotId?: string
  requestedQuantity: number
  unitCost?: number
  notes?: string
}

export interface StockTransferWithDetails extends StockTransfer {
  fromLocation: {
    id: string
    locationCode: string
    name: string
    type: string
  }
  toLocation: {
    id: string
    locationCode: string
    name: string
    type: string
  }
  items: (StockTransferItem & {
    item: {
      id: string
      code: string
      name: string
      unitOfMeasure: {
        code: string
        name: string
        symbol?: string | null
      }
    }
    stockLot?: {
      id: string
      lotNumber: string
      expiryDate?: Date | null
    } | null
  })[]
}

export class StockTransferService extends BaseService {
  private stockMovementService: StockMovementService

  constructor() {
    super('StockTransferService')
    this.stockMovementService = new StockMovementService()
  }

  async createStockTransfer(
    data: CreateStockTransferInput & { requestedBy: string }
  ): Promise<StockTransferWithDetails> {
    return this.withLogging('createStockTransfer', async () => {
      // Validate locations exist and are different
      if (data.fromLocationId === data.toLocationId) {
        throw new Error('Source and destination locations must be different')
      }

      const [fromLocation, toLocation] = await Promise.all([
        prisma.location.findUnique({ where: { id: data.fromLocationId } }),
        prisma.location.findUnique({ where: { id: data.toLocationId } })
      ])

      if (!fromLocation) {
        throw new Error('Source location not found')
      }

      if (!toLocation) {
        throw new Error('Destination location not found')
      }

      if (!fromLocation.isActive || !toLocation.isActive) {
        throw new Error('Both locations must be active')
      }

      // Validate items and check stock availability
      if (!data.items || data.items.length === 0) {
        throw new Error('Transfer must have at least one item')
      }

      let totalQuantity = 0
      let totalValue = 0

      for (const item of data.items) {
        if (item.requestedQuantity <= 0) {
          throw new Error('Transfer quantity must be positive')
        }

        // Validate item exists
        const inventoryItem = await prisma.item.findUnique({
          where: { id: item.itemId }
        })

        if (!inventoryItem) {
          throw new Error(`Item ${item.itemId} not found`)
        }

        if (!inventoryItem.trackInventory) {
          throw new Error(`Item ${inventoryItem.code} does not track inventory`)
        }

        // Check available stock at source location
        const availableStock = await this.getLocationItemStock(data.fromLocationId, item.itemId, item.stockLotId)
        
        if (availableStock < item.requestedQuantity) {
          throw new Error(`Insufficient stock for ${inventoryItem.code}. Available: ${availableStock}, Requested: ${item.requestedQuantity}`)
        }

        totalQuantity += item.requestedQuantity
        totalValue += item.requestedQuantity * (item.unitCost || inventoryItem.standardCost || 0)
      }

      return prisma.$transaction(async (tx) => {
        // Generate transfer number
        const transferNumber = await this.generateTransferNumber()

        // Create stock transfer
        const stockTransfer = await tx.stockTransfer.create({
          data: {
            transferNumber,
            fromLocationId: data.fromLocationId,
            toLocationId: data.toLocationId,
            transferDate: new Date(),
            expectedDate: data.expectedDate,
            reason: data.reason,
            notes: data.notes,
            totalQuantity,
            totalValue,
            requestedBy: data.requestedBy,
            createdBy: data.requestedBy
          }
        })

        // Create transfer items
        for (const [index, itemData] of data.items.entries()) {
          const item = await tx.item.findUnique({
            where: { id: itemData.itemId }
          })

          const unitCost = itemData.unitCost || item?.standardCost || 0
          const totalCost = itemData.requestedQuantity * unitCost

          await tx.stockTransferItem.create({
            data: {
              stockTransferId: stockTransfer.id,
              itemId: itemData.itemId,
              stockLotId: itemData.stockLotId,
              requestedQuantity: itemData.requestedQuantity,
              unitCost,
              totalCost,
              notes: itemData.notes,
              sortOrder: index + 1
            }
          })
        }

        // Fetch and return complete transfer
        return tx.stockTransfer.findUnique({
          where: { id: stockTransfer.id },
          include: {
            fromLocation: {
              select: {
                id: true,
                locationCode: true,
                name: true,
                type: true
              }
            },
            toLocation: {
              select: {
                id: true,
                locationCode: true,
                name: true,
                type: true
              }
            },
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    unitOfMeasure: {
                      select: {
                        code: true,
                        name: true,
                        symbol: true
                      }
                    }
                  }
                },
                stockLot: {
                  select: {
                    id: true,
                    lotNumber: true,
                    expiryDate: true
                  }
                }
              },
              orderBy: { sortOrder: 'asc' }
            }
          }
        }) as StockTransferWithDetails
      }, {
        timeout: 10000
      })
    })
  }

  async approveStockTransfer(id: string, userId: string): Promise<StockTransferWithDetails> {
    return this.withLogging('approveStockTransfer', async () => {
      const transfer = await this.getStockTransfer(id)
      if (!transfer) {
        throw new Error('Stock transfer not found')
      }

      if (transfer.status !== TransferStatus.PENDING) {
        throw new Error('Can only approve pending transfers')
      }

      // Re-validate stock availability
      for (const item of transfer.items) {
        const availableStock = await this.getLocationItemStock(
          transfer.fromLocationId, 
          item.itemId, 
          item.stockLotId
        )
        
        if (availableStock < item.requestedQuantity) {
          throw new Error(`Insufficient stock for ${item.item.code}. Available: ${availableStock}, Requested: ${item.requestedQuantity}`)
        }
      }

      return this.updateTransferStatus(id, TransferStatus.APPROVED, {
        approvedBy: userId,
        approvedAt: new Date()
      })
    })
  }

  async shipStockTransfer(id: string, userId: string): Promise<StockTransferWithDetails> {
    return this.withLogging('shipStockTransfer', async () => {
      const transfer = await this.getStockTransfer(id)
      if (!transfer) {
        throw new Error('Stock transfer not found')
      }

      if (transfer.status !== TransferStatus.APPROVED) {
        throw new Error('Can only ship approved transfers')
      }

      // First update the transfer status and items
      const updatedTransfer = await prisma.$transaction(async (tx) => {
        // Update transfer item shipped quantities
        for (const item of transfer.items) {
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { shippedQuantity: item.requestedQuantity }
          })
        }

        // Update transfer status
        return tx.stockTransfer.update({
          where: { id },
          data: {
            status: TransferStatus.IN_TRANSIT,
            shippedBy: userId,
            shippedAt: new Date()
          },
          include: {
            fromLocation: {
              select: {
                id: true,
                locationCode: true,
                name: true,
                type: true
              }
            },
            toLocation: {
              select: {
                id: true,
                locationCode: true,
                name: true,
                type: true
              }
            },
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    unitOfMeasure: {
                      select: {
                        code: true,
                        name: true,
                        symbol: true
                      }
                    }
                  }
                },
                stockLot: {
                  select: {
                    id: true,
                    lotNumber: true,
                    expiryDate: true
                  }
                }
              },
              orderBy: { sortOrder: 'asc' }
            }
          }
        }) as StockTransferWithDetails
      }, {
        timeout: 10000
      })

      // Create outbound stock movements from source location (outside transaction to avoid timeout)
      for (const item of transfer.items) {
        await this.stockMovementService.createStockMovement({
          itemId: item.itemId,
          movementType: MovementType.STOCK_OUT,
          movementDate: new Date(),
          quantity: item.requestedQuantity,
          unitCost: item.unitCost,
          referenceType: 'TRANSFER_OUT',
          referenceId: transfer.id,
          referenceNumber: transfer.transferNumber,
          locationId: transfer.fromLocationId,
          notes: `Transfer out to ${transfer.toLocation.name}`,
          createdBy: userId
        })
      }

      return updatedTransfer
    })
  }

  async receiveStockTransfer(
    id: string, 
    userId: string,
    receivedItems?: { itemId: string; receivedQuantity: number; condition?: string; notes?: string }[]
  ): Promise<StockTransferWithDetails> {
    return this.withLogging('receiveStockTransfer', async () => {
      const transfer = await this.getStockTransfer(id)
      if (!transfer) {
        throw new Error('Stock transfer not found')
      }

      if (transfer.status !== TransferStatus.IN_TRANSIT) {
        throw new Error('Can only receive in-transit transfers')
      }

      const updatedTransfer = await prisma.$transaction(async (tx) => {
        let allItemsFullyReceived = true

        // Process each transfer item
        for (const item of transfer.items) {
          const receivedItem = receivedItems?.find(ri => ri.itemId === item.itemId)
          const receivedQuantity = receivedItem?.receivedQuantity || item.shippedQuantity

          if (receivedQuantity > item.shippedQuantity) {
            throw new Error(`Cannot receive more than shipped quantity for ${item.item.code}`)
          }

          // Note: Stock movement will be created after transaction

          // Update transfer item received quantity
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { 
              receivedQuantity,
              condition: receivedItem?.condition,
              notes: receivedItem?.notes
            }
          })

          // Check if all items are fully received
          if (receivedQuantity < item.shippedQuantity) {
            allItemsFullyReceived = false
          }
        }

        // Update transfer status
        const newStatus = allItemsFullyReceived ? TransferStatus.COMPLETED : TransferStatus.RECEIVED

        return tx.stockTransfer.update({
          where: { id },
          data: {
            status: newStatus,
            receivedBy: userId,
            receivedAt: new Date()
          },
          include: {
            fromLocation: {
              select: {
                id: true,
                locationCode: true,
                name: true,
                type: true
              }
            },
            toLocation: {
              select: {
                id: true,
                locationCode: true,
                name: true,
                type: true
              }
            },
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    unitOfMeasure: {
                      select: {
                        code: true,
                        name: true,
                        symbol: true
                      }
                    }
                  }
                },
                stockLot: {
                  select: {
                    id: true,
                    lotNumber: true,
                    expiryDate: true
                  }
                }
              },
              orderBy: { sortOrder: 'asc' }
            }
          }
        }) as StockTransferWithDetails
      }, {
        timeout: 10000
      })

      // Create inbound stock movements to destination location (outside transaction to avoid timeout)
      for (const item of transfer.items) {
        const receivedItem = receivedItems?.find(ri => ri.itemId === item.itemId)
        const receivedQuantity = receivedItem?.receivedQuantity || item.shippedQuantity

        if (receivedQuantity > 0) {
          await this.stockMovementService.createStockMovement({
            itemId: item.itemId,
            movementType: MovementType.STOCK_IN,
            movementDate: new Date(),
            quantity: receivedQuantity,
            unitCost: item.unitCost,
            referenceType: 'TRANSFER_IN',
            referenceId: transfer.id,
            referenceNumber: transfer.transferNumber,
            locationId: transfer.toLocationId,
            notes: `Transfer in from ${transfer.fromLocation.name}${receivedItem?.notes ? ` - ${receivedItem.notes}` : ''}`,
            autoCreateLot: true,
            createdBy: userId
          })
        }
      }

      return updatedTransfer
    })
  }

  async cancelStockTransfer(id: string, userId: string, reason?: string): Promise<StockTransferWithDetails> {
    return this.withLogging('cancelStockTransfer', async () => {
      const transfer = await this.getStockTransfer(id)
      if (!transfer) {
        throw new Error('Stock transfer not found')
      }

      if (transfer.status === TransferStatus.COMPLETED || transfer.status === TransferStatus.CANCELLED) {
        throw new Error('Cannot cancel completed or already cancelled transfers')
      }

      if (transfer.status === TransferStatus.IN_TRANSIT || transfer.status === TransferStatus.RECEIVED) {
        throw new Error('Cannot cancel transfers that have been shipped. Use return process instead.')
      }

      return this.updateTransferStatus(id, TransferStatus.CANCELLED, {
        notes: `${transfer.notes || ''}\nCANCELLED: ${reason || 'No reason provided'}`.trim()
      })
    })
  }

  async getStockTransfer(id: string): Promise<StockTransferWithDetails | null> {
    return this.withLogging('getStockTransfer', async () => {
      return prisma.stockTransfer.findUnique({
        where: { id },
        include: {
          fromLocation: {
            select: {
              id: true,
              locationCode: true,
              name: true,
              type: true
            }
          },
          toLocation: {
            select: {
              id: true,
              locationCode: true,
              name: true,
              type: true
            }
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  unitOfMeasure: {
                    select: {
                      code: true,
                      name: true,
                      symbol: true
                    }
                  }
                }
              },
              stockLot: {
                select: {
                  id: true,
                  lotNumber: true,
                  expiryDate: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      }) as Promise<StockTransferWithDetails | null>
    })
  }

  async getAllStockTransfers(options?: {
    fromLocationId?: string
    toLocationId?: string
    status?: TransferStatus
    dateFrom?: Date
    dateTo?: Date
    search?: string
    limit?: number
    offset?: number
  }): Promise<StockTransferWithDetails[]> {
    return this.withLogging('getAllStockTransfers', async () => {
      const where: Prisma.StockTransferWhereInput = {}

      if (options?.fromLocationId) {
        where.fromLocationId = options.fromLocationId
      }

      if (options?.toLocationId) {
        where.toLocationId = options.toLocationId
      }

      if (options?.status) {
        where.status = options.status
      }

      if (options?.dateFrom || options?.dateTo) {
        where.transferDate = {}
        if (options.dateFrom) {
          where.transferDate.gte = options.dateFrom
        }
        if (options.dateTo) {
          where.transferDate.lte = options.dateTo
        }
      }

      if (options?.search) {
        where.OR = [
          { transferNumber: { contains: options.search } },
          { reason: { contains: options.search } },
          { fromLocation: { name: { contains: options.search } } },
          { toLocation: { name: { contains: options.search } } }
        ]
      }

      return prisma.stockTransfer.findMany({
        where,
        include: {
          fromLocation: {
            select: {
              id: true,
              locationCode: true,
              name: true,
              type: true
            }
          },
          toLocation: {
            select: {
              id: true,
              locationCode: true,
              name: true,
              type: true
            }
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  unitOfMeasure: {
                    select: {
                      code: true,
                      name: true,
                      symbol: true
                    }
                  }
                }
              },
              stockLot: {
                select: {
                  id: true,
                  lotNumber: true,
                  expiryDate: true
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: { transferDate: 'desc' },
        take: options?.limit,
        skip: options?.offset
      }) as Promise<StockTransferWithDetails[]>
    })
  }

  private async getLocationItemStock(
    locationId: string, 
    itemId: string, 
    stockLotId?: string
  ): Promise<number> {
    if (stockLotId) {
      // Get specific lot stock at location
      const locationLot = await prisma.locationStockLot.findUnique({
        where: {
          locationId_stockLotId: {
            locationId,
            stockLotId
          }
        }
      })
      return locationLot?.availableQty || 0
    } else {
      // Get total item stock at location
      const balance = await prisma.inventoryBalance.findUnique({
        where: {
          locationId_itemId: {
            locationId,
            itemId
          }
        }
      })
      return balance?.availableQuantity || 0
    }
  }

  private async updateTransferStatus(
    id: string,
    status: TransferStatus,
    additionalData: Record<string, unknown>
  ): Promise<StockTransferWithDetails> {
    const updatedTransfer = await prisma.stockTransfer.update({
      where: { id },
      data: {
        status,
        ...additionalData
      },
      include: {
        fromLocation: {
          select: {
            id: true,
            locationCode: true,
            name: true,
            type: true
          }
        },
        toLocation: {
          select: {
            id: true,
            locationCode: true,
            name: true,
            type: true
          }
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                code: true,
                name: true,
                unitOfMeasure: {
                  select: {
                    code: true,
                    name: true,
                    symbol: true
                  }
                }
              }
            },
            stockLot: {
              select: {
                id: true,
                lotNumber: true,
                expiryDate: true
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    return updatedTransfer as StockTransferWithDetails
  }

  private async generateTransferNumber(): Promise<string> {
    const lastTransfer = await prisma.stockTransfer.findFirst({
      orderBy: { transferNumber: 'desc' }
    })

    if (!lastTransfer) {
      return 'TR-0001'
    }

    const match = lastTransfer.transferNumber.match(/TR-(\d+)$/)
    if (match) {
      const lastNumber = parseInt(match[1])
      const newNumber = lastNumber + 1
      return `TR-${newNumber.toString().padStart(4, '0')}`
    }

    return 'TR-0001'
  }
}