import { prisma } from '@/lib/db/prisma'
import { BaseService } from '../base.service'
import { 
  Location, 
  LocationType,
  InventoryBalance,
  Prisma
} from "@prisma/client"

export interface CreateLocationInput {
  locationCode?: string
  name: string
  type?: LocationType
  description?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  contactPerson?: string
  phone?: string
  email?: string
  allowNegativeStock?: boolean
  maxCapacity?: number
  inventoryAccountId?: string
}

export interface UpdateLocationInput {
  name?: string
  type?: LocationType
  description?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  contactPerson?: string
  phone?: string
  email?: string
  isActive?: boolean
  allowNegativeStock?: boolean
  maxCapacity?: number
  inventoryAccountId?: string
}

export interface LocationWithDetails extends Location {
  inventoryAccount?: {
    id: string
    code: string
    name: string
  } | null
  _count?: {
    stockMovements: number
    inventoryBalances: number
    stockTransfersFrom: number
    stockTransfersTo: number
  }
  currentUtilization?: number
  totalValue?: number
}

export interface LocationInventorySummary {
  locationId: string
  locationName: string
  totalItems: number
  totalQuantity: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  utilization: number
}

export class LocationService extends BaseService {
  constructor() {
    super('LocationService')
  }

  async createLocation(
    data: CreateLocationInput & { createdBy: string }
  ): Promise<LocationWithDetails> {
    return this.withLogging('createLocation', async () => {
      // Generate location code if not provided
      const locationCode = data.locationCode || await this.generateLocationCode(data.type || LocationType.WAREHOUSE)

      // Check if location code already exists
      const existingLocation = await prisma.location.findUnique({
        where: { locationCode }
      })

      if (existingLocation) {
        throw new Error('Location code already exists')
      }

      // Validate inventory account if provided
      if (data.inventoryAccountId) {
        const account = await prisma.account.findUnique({
          where: { id: data.inventoryAccountId }
        })

        if (!account) {
          throw new Error('Inventory account not found')
        }

        if (account.type !== 'ASSET') {
          throw new Error('Inventory account must be an asset account')
        }
      }

      const location = await prisma.location.create({
        data: {
          locationCode,
          name: data.name,
          type: data.type || LocationType.WAREHOUSE,
          description: data.description,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country || 'US',
          postalCode: data.postalCode,
          contactPerson: data.contactPerson,
          phone: data.phone,
          email: data.email,
          allowNegativeStock: data.allowNegativeStock || false,
          maxCapacity: data.maxCapacity,
          inventoryAccountId: data.inventoryAccountId,
          createdBy: data.createdBy
        },
        include: {
          inventoryAccount: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          _count: {
            select: {
              stockMovements: true,
              inventoryBalances: true,
              stockTransfersFrom: true,
              stockTransfersTo: true
            }
          }
        }
      })

      return location as LocationWithDetails
    })
  }

  async updateLocation(
    id: string,
    data: UpdateLocationInput,
    _userId: string
  ): Promise<LocationWithDetails> {
    return this.withLogging('updateLocation', async () => {
      const existingLocation = await prisma.location.findUnique({
        where: { id }
      })

      if (!existingLocation) {
        throw new Error('Location not found')
      }

      // Validate inventory account if provided
      if (data.inventoryAccountId) {
        const account = await prisma.account.findUnique({
          where: { id: data.inventoryAccountId }
        })

        if (!account) {
          throw new Error('Inventory account not found')
        }

        if (account.type !== 'ASSET') {
          throw new Error('Inventory account must be an asset account')
        }
      }

      const updatedLocation = await prisma.location.update({
        where: { id },
        data,
        include: {
          inventoryAccount: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          _count: {
            select: {
              stockMovements: true,
              inventoryBalances: true,
              stockTransfersFrom: true,
              stockTransfersTo: true
            }
          }
        }
      })

      return updatedLocation as LocationWithDetails
    })
  }

  async getLocation(id: string): Promise<LocationWithDetails | null> {
    return this.withLogging('getLocation', async () => {
      return prisma.location.findUnique({
        where: { id },
        include: {
          inventoryAccount: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          _count: {
            select: {
              stockMovements: true,
              inventoryBalances: true,
              stockTransfersFrom: true,
              stockTransfersTo: true
            }
          }
        }
      }) as Promise<LocationWithDetails | null>
    })
  }

  async getLocationByCode(locationCode: string): Promise<LocationWithDetails | null> {
    return this.withLogging('getLocationByCode', async () => {
      return prisma.location.findUnique({
        where: { locationCode },
        include: {
          inventoryAccount: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          _count: {
            select: {
              stockMovements: true,
              inventoryBalances: true,
              stockTransfersFrom: true,
              stockTransfersTo: true
            }
          }
        }
      }) as Promise<LocationWithDetails | null>
    })
  }

  async getAllLocations(options?: {
    type?: LocationType
    isActive?: boolean
    search?: string
    limit?: number
    offset?: number
  }): Promise<LocationWithDetails[]> {
    return this.withLogging('getAllLocations', async () => {
      const where: Prisma.LocationWhereInput = {}

      if (options?.type) {
        where.type = options.type
      }

      if (options?.isActive !== undefined) {
        where.isActive = options.isActive
      }

      if (options?.search) {
        where.OR = [
          { name: { contains: options.search } },
          { locationCode: { contains: options.search } },
          { description: { contains: options.search } },
          { city: { contains: options.search } }
        ]
      }

      return prisma.location.findMany({
        where,
        include: {
          inventoryAccount: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          _count: {
            select: {
              stockMovements: true,
              inventoryBalances: true,
              stockTransfersFrom: true,
              stockTransfersTo: true
            }
          }
        },
        orderBy: { name: 'asc' },
        take: options?.limit,
        skip: options?.offset
      }) as Promise<LocationWithDetails[]>
    })
  }

  async getDefaultLocation(): Promise<LocationWithDetails | null> {
    return this.withLogging('getDefaultLocation', async () => {
      const defaultLocation = await prisma.location.findFirst({
        where: { 
          isDefault: true,
          isActive: true
        },
        include: {
          inventoryAccount: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          _count: {
            select: {
              stockMovements: true,
              inventoryBalances: true,
              stockTransfersFrom: true,
              stockTransfersTo: true
            }
          }
        }
      })

      // If no default location found, return first active location
      if (!defaultLocation) {
        return this.getAllLocations({ isActive: true, limit: 1 }).then(locations => 
          locations.length > 0 ? locations[0] : null
        )
      }

      return defaultLocation as LocationWithDetails
    })
  }

  async setDefaultLocation(id: string): Promise<LocationWithDetails> {
    return this.withLogging('setDefaultLocation', async () => {
      const location = await this.getLocation(id)
      if (!location) {
        throw new Error('Location not found')
      }

      if (!location.isActive) {
        throw new Error('Cannot set inactive location as default')
      }

      return prisma.$transaction(async (tx) => {
        // Remove default flag from all locations
        await tx.location.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        })

        // Set new default location
        const updatedLocation = await tx.location.update({
          where: { id },
          data: { isDefault: true },
          include: {
            inventoryAccount: {
              select: {
                id: true,
                code: true,
                name: true
              }
            },
            _count: {
              select: {
                stockMovements: true,
                inventoryBalances: true,
                stockTransfersFrom: true,
                stockTransfersTo: true
              }
            }
          }
        })

        return updatedLocation as LocationWithDetails
      })
    })
  }

  async getLocationInventory(
    locationId: string,
    options?: {
      itemId?: string
      hasStock?: boolean
      lowStock?: boolean
      limit?: number
      offset?: number
    }
  ): Promise<InventoryBalance[]> {
    return this.withLogging('getLocationInventory', async () => {
      const where: Prisma.InventoryBalanceWhereInput = { locationId }

      if (options?.itemId) {
        where.itemId = options.itemId
      }

      if (options?.hasStock) {
        where.totalQuantity = { gt: 0 }
      }

      if (options?.lowStock) {
        where.AND = [
          { totalQuantity: { gt: 0 } },
          {
            OR: [
              { 
                AND: [
                  { minStockLevel: { not: null } },
                  { totalQuantity: { lte: { minStockLevel: true } } }
                ]
              },
              {
                AND: [
                  { reorderPoint: { not: null } },
                  { totalQuantity: { lte: { reorderPoint: true } } }
                ]
              }
            ]
          }
        ]
      }

      return prisma.inventoryBalance.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              type: true,
              unitOfMeasure: {
                select: {
                  code: true,
                  name: true,
                  symbol: true
                }
              }
            }
          },
          location: {
            select: {
              id: true,
              locationCode: true,
              name: true
            }
          }
        },
        orderBy: [
          { totalValue: 'desc' },
          { item: { name: 'asc' } }
        ],
        take: options?.limit,
        skip: options?.offset
      })
    })
  }

  async getLocationInventorySummary(locationId: string): Promise<LocationInventorySummary> {
    return this.withLogging('getLocationInventorySummary', async () => {
      const location = await this.getLocation(locationId)
      if (!location) {
        throw new Error('Location not found')
      }

      const balances = await prisma.inventoryBalance.findMany({
        where: { locationId },
        include: {
          item: true
        }
      })

      const totalItems = balances.length
      const totalQuantity = balances.reduce((sum, balance) => sum + balance.totalQuantity, 0)
      const totalValue = balances.reduce((sum, balance) => sum + balance.totalValue, 0)
      
      const lowStockItems = balances.filter(balance => {
        if (balance.totalQuantity <= 0) return false
        if (balance.minStockLevel && balance.totalQuantity <= balance.minStockLevel) return true
        if (balance.reorderPoint && balance.totalQuantity <= balance.reorderPoint) return true
        return false
      }).length

      const outOfStockItems = balances.filter(balance => balance.totalQuantity <= 0).length

      const utilization = location.maxCapacity ? 
        Math.min(100, (totalQuantity / location.maxCapacity) * 100) : 0

      return {
        locationId: location.id,
        locationName: location.name,
        totalItems,
        totalQuantity,
        totalValue,
        lowStockItems,
        outOfStockItems,
        utilization
      }
    })
  }

  async deactivateLocation(id: string, _userId: string): Promise<LocationWithDetails> {
    return this.withLogging('deactivateLocation', async () => {
      const location = await this.getLocation(id)
      if (!location) {
        throw new Error('Location not found')
      }

      if (location.isDefault) {
        throw new Error('Cannot deactivate default location')
      }

      // Check if location has inventory
      const inventoryCount = await prisma.inventoryBalance.count({
        where: {
          locationId: id,
          totalQuantity: { gt: 0 }
        }
      })

      if (inventoryCount > 0) {
        throw new Error('Cannot deactivate location with inventory. Transfer all stock first.')
      }

      return this.updateLocation(id, { isActive: false }, _userId)
    })
  }

  private async generateLocationCode(type: LocationType): Promise<string> {
    const prefix = this.getLocationPrefix(type)
    
    const lastLocation = await prisma.location.findFirst({
      where: { locationCode: { startsWith: prefix } },
      orderBy: { locationCode: 'desc' }
    })

    if (!lastLocation) {
      return `${prefix}-001`
    }

    const match = lastLocation.locationCode.match(/-(\d+)$/)
    if (match) {
      const lastNumber = parseInt(match[1])
      const newNumber = lastNumber + 1
      return `${prefix}-${newNumber.toString().padStart(3, '0')}`
    }

    return `${prefix}-001`
  }

  private getLocationPrefix(type: LocationType): string {
    switch (type) {
      case LocationType.WAREHOUSE:
        return 'WH'
      case LocationType.STORE:
        return 'ST'
      case LocationType.FACTORY:
        return 'FAC'
      case LocationType.OFFICE:
        return 'OFF'
      case LocationType.SUPPLIER:
        return 'SUP'
      case LocationType.CUSTOMER:
        return 'CUS'
      case LocationType.VIRTUAL:
        return 'VIR'
      default:
        return 'LOC'
    }
  }
}