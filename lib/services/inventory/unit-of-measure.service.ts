import { prisma } from '@/lib/db/prisma'
import { AuditService } from '../audit.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { UnitOfMeasure, Prisma } from "@prisma/client"

export interface CreateUnitOfMeasureInput {
  code: string
  name: string
  description?: string
  symbol?: string
  baseUnitId?: string
  conversionFactor?: number
  isBaseUnit?: boolean
}

export interface UpdateUnitOfMeasureInput {
  code?: string
  name?: string
  description?: string
  symbol?: string
  baseUnitId?: string
  conversionFactor?: number
  isBaseUnit?: boolean
  isActive?: boolean
}

export interface UnitWithConversions extends UnitOfMeasure {
  baseUnit?: UnitOfMeasure | null
  derivedUnits: UnitOfMeasure[]
  _count?: {
    derivedUnits: number
    items: number
  }
}

export interface ConversionResult {
  fromUnit: UnitOfMeasure
  toUnit: UnitOfMeasure
  fromQuantity: number
  toQuantity: number
  conversionFactor: number
}

export class UnitOfMeasureService {
  private auditService: AuditService

  constructor() {
    this.auditService = new AuditService()
  }

  async createUnitOfMeasure(
    data: CreateUnitOfMeasureInput & { createdBy: string }
  ): Promise<UnitWithConversions> {
    // Check if code is unique
    const existingUnit = await prisma.unitOfMeasure.findUnique({
      where: { code: data.code }
    })

    if (existingUnit) {
      throw new Error('Unit of measure with this code already exists')
    }

    // Validate base unit if provided
    if (data.baseUnitId) {
      const baseUnit = await prisma.unitOfMeasure.findUnique({
        where: { id: data.baseUnitId }
      })

      if (!baseUnit) {
        throw new Error('Base unit not found')
      }

      if (!baseUnit.isActive) {
        throw new Error('Cannot create unit with inactive base unit')
      }

      if (!baseUnit.isBaseUnit) {
        throw new Error('Referenced unit is not a base unit')
      }

      if (!data.conversionFactor || data.conversionFactor <= 0) {
        throw new Error('Conversion factor must be greater than 0 when base unit is specified')
      }
    }

    // If this is marked as base unit, ensure no base unit is specified
    if (data.isBaseUnit && data.baseUnitId) {
      throw new Error('Base unit cannot have a parent base unit')
    }

    // Set defaults
    const unitData = {
      code: data.code,
      name: data.name,
      description: data.description,
      symbol: data.symbol,
      baseUnitId: data.baseUnitId,
      conversionFactor: data.conversionFactor || 1.0,
      isBaseUnit: data.isBaseUnit || false,
      createdBy: data.createdBy
    }

    const unit = await prisma.unitOfMeasure.create({
      data: unitData,
      include: {
        baseUnit: true,
        derivedUnits: true,
        _count: {
          select: {
            derivedUnits: true,
            items: true
          }
        }
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId: data.createdBy,
      action: AuditAction.CREATE,
      entityType: 'UnitOfMeasure',
      entityId: unit.id,
      afterData: unit,
    })

    return unit
  }

  async updateUnitOfMeasure(
    id: string,
    data: UpdateUnitOfMeasureInput,
    userId: string
  ): Promise<UnitWithConversions> {
    const existingUnit = await this.getUnitOfMeasure(id)
    if (!existingUnit) {
      throw new Error('Unit of measure not found')
    }

    // Check code uniqueness if being updated
    if (data.code && data.code !== existingUnit.code) {
      const codeExists = await prisma.unitOfMeasure.findUnique({
        where: { code: data.code }
      })

      if (codeExists) {
        throw new Error('Unit of measure with this code already exists')
      }
    }

    // Validate base unit changes
    if (data.baseUnitId !== undefined && data.baseUnitId !== existingUnit.baseUnitId) {
      if (data.baseUnitId) {
        // Setting new base unit
        if (data.baseUnitId === id) {
          throw new Error('Unit cannot be its own base unit')
        }

        const baseUnit = await prisma.unitOfMeasure.findUnique({
          where: { id: data.baseUnitId }
        })

        if (!baseUnit) {
          throw new Error('Base unit not found')
        }

        if (!baseUnit.isBaseUnit) {
          throw new Error('Referenced unit is not a base unit')
        }

        if (!data.conversionFactor || data.conversionFactor <= 0) {
          throw new Error('Conversion factor must be greater than 0 when base unit is specified')
        }
      }
    }

    // Validate isBaseUnit changes
    if (data.isBaseUnit !== undefined && data.isBaseUnit !== existingUnit.isBaseUnit) {
      if (data.isBaseUnit) {
        // Making this a base unit
        if (existingUnit.baseUnitId || data.baseUnitId) {
          throw new Error('Base unit cannot have a parent base unit')
        }

        // Check if this unit has derived units that would be orphaned
        if (existingUnit._count && existingUnit._count.derivedUnits > 0) {
          throw new Error('Cannot make unit a base unit when it has derived units')
        }
      } else {
        // Removing base unit status
        if (existingUnit._count && existingUnit._count.derivedUnits > 0) {
          throw new Error('Cannot remove base unit status when unit has derived units')
        }
      }
    }

    const updatedUnit = await prisma.unitOfMeasure.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        baseUnit: true,
        derivedUnits: true,
        _count: {
          select: {
            derivedUnits: true,
            items: true
          }
        }
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'UnitOfMeasure',
      entityId: id,
      beforeData: existingUnit,
      afterData: updatedUnit,
    })

    return updatedUnit
  }

  async getUnitOfMeasure(id: string): Promise<UnitWithConversions | null> {
    return prisma.unitOfMeasure.findUnique({
      where: { id },
      include: {
        baseUnit: true,
        derivedUnits: {
          orderBy: { code: 'asc' }
        },
        _count: {
          select: {
            derivedUnits: true,
            items: true
          }
        }
      }
    })
  }

  async getUnitOfMeasureByCode(code: string): Promise<UnitWithConversions | null> {
    return prisma.unitOfMeasure.findUnique({
      where: { code },
      include: {
        baseUnit: true,
        derivedUnits: {
          orderBy: { code: 'asc' }
        },
        _count: {
          select: {
            derivedUnits: true,
            items: true
          }
        }
      }
    })
  }

  async getAllUnitsOfMeasure(options?: {
    baseUnitId?: string | null
    isBaseUnit?: boolean
    isActive?: boolean
    search?: string
    limit?: number
    offset?: number
  }): Promise<UnitWithConversions[]> {
    const where: Prisma.UnitOfMeasureWhereInput = {}

    if (options?.baseUnitId !== undefined) {
      where.baseUnitId = options.baseUnitId
    }

    if (options?.isBaseUnit !== undefined) {
      where.isBaseUnit = options.isBaseUnit
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive
    }

    if (options?.search) {
      where.OR = [
        { code: { contains: options.search } },
        { name: { contains: options.search } },
        { symbol: { contains: options.search } },
        { description: { contains: options.search } }
      ]
    }

    return prisma.unitOfMeasure.findMany({
      where,
      include: {
        baseUnit: true,
        derivedUnits: {
          orderBy: { code: 'asc' }
        },
        _count: {
          select: {
            derivedUnits: true,
            items: true
          }
        }
      },
      orderBy: [
        { isBaseUnit: 'desc' },
        { code: 'asc' }
      ],
      take: options?.limit,
      skip: options?.offset
    })
  }

  async getBaseUnits(): Promise<UnitWithConversions[]> {
    return this.getAllUnitsOfMeasure({
      isBaseUnit: true,
      isActive: true
    })
  }

  async getConversionChain(unitId: string): Promise<UnitOfMeasure[]> {
    const chain: UnitOfMeasure[] = []
    let currentUnit = await prisma.unitOfMeasure.findUnique({
      where: { id: unitId },
      include: { baseUnit: true }
    })

    while (currentUnit) {
      chain.unshift(currentUnit)
      if (currentUnit.baseUnit) {
        currentUnit = await prisma.unitOfMeasure.findUnique({
          where: { id: currentUnit.baseUnit.id },
          include: { baseUnit: true }
        })
      } else {
        break
      }
    }

    return chain
  }

  async convertQuantity(
    fromUnitId: string,
    toUnitId: string,
    quantity: number
  ): Promise<ConversionResult> {
    if (fromUnitId === toUnitId) {
      const unit = await this.getUnitOfMeasure(fromUnitId)
      if (!unit) {
        throw new Error('Unit not found')
      }
      return {
        fromUnit: unit,
        toUnit: unit,
        fromQuantity: quantity,
        toQuantity: quantity,
        conversionFactor: 1
      }
    }

    const fromUnit = await this.getUnitOfMeasure(fromUnitId)
    const toUnit = await this.getUnitOfMeasure(toUnitId)

    if (!fromUnit || !toUnit) {
      throw new Error('One or both units not found')
    }

    // Check if units can be converted (must have same base unit or one is base of other)
    const fromChain = await this.getConversionChain(fromUnitId)
    const toChain = await this.getConversionChain(toUnitId)

    // Find common base unit
    const commonBase = fromChain.find(unit => 
      toChain.some(toChainUnit => toChainUnit.id === unit.id)
    )

    if (!commonBase) {
      throw new Error('Units cannot be converted - no common base unit')
    }

    // Calculate conversion factor
    let fromToBaseFactor = 1
    let toToBaseFactor = 1

    // Calculate factor from 'from' unit to base
    for (const unit of fromChain) {
      if (unit.id === commonBase.id) break
      fromToBaseFactor *= unit.conversionFactor
    }

    // Calculate factor from 'to' unit to base
    for (const unit of toChain) {
      if (unit.id === commonBase.id) break
      toToBaseFactor *= unit.conversionFactor
    }

    // Final conversion factor
    const conversionFactor = fromToBaseFactor / toToBaseFactor
    const convertedQuantity = quantity * conversionFactor

    return {
      fromUnit,
      toUnit,
      fromQuantity: quantity,
      toQuantity: convertedQuantity,
      conversionFactor
    }
  }

  async deleteUnitOfMeasure(id: string, userId: string): Promise<boolean> {
    const unit = await this.getUnitOfMeasure(id)
    if (!unit) {
      throw new Error('Unit of measure not found')
    }

    // Check if unit has derived units
    if (unit._count && unit._count.derivedUnits > 0) {
      throw new Error('Cannot delete unit with derived units')
    }

    // Check if unit is used by items
    if (unit._count && unit._count.items > 0) {
      throw new Error('Cannot delete unit used by items')
    }

    await prisma.unitOfMeasure.delete({
      where: { id }
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.DELETE,
      entityType: 'UnitOfMeasure',
      entityId: id,
      beforeData: unit,
    })

    return true
  }

  async createStandardUnits(userId: string): Promise<UnitWithConversions[]> {
    const standardUnits = [
      // Weight - Base: Kilogram
      { code: 'KG', name: 'Kilogram', symbol: 'kg', isBaseUnit: true },
      { code: 'G', name: 'Gram', symbol: 'g', baseUnit: 'KG', conversionFactor: 0.001 },
      { code: 'LB', name: 'Pound', symbol: 'lb', baseUnit: 'KG', conversionFactor: 0.453592 },
      { code: 'OZ', name: 'Ounce', symbol: 'oz', baseUnit: 'KG', conversionFactor: 0.0283495 },

      // Length - Base: Meter
      { code: 'M', name: 'Meter', symbol: 'm', isBaseUnit: true },
      { code: 'CM', name: 'Centimeter', symbol: 'cm', baseUnit: 'M', conversionFactor: 0.01 },
      { code: 'MM', name: 'Millimeter', symbol: 'mm', baseUnit: 'M', conversionFactor: 0.001 },
      { code: 'IN', name: 'Inch', symbol: 'in', baseUnit: 'M', conversionFactor: 0.0254 },
      { code: 'FT', name: 'Foot', symbol: 'ft', baseUnit: 'M', conversionFactor: 0.3048 },

      // Volume - Base: Liter
      { code: 'L', name: 'Liter', symbol: 'l', isBaseUnit: true },
      { code: 'ML', name: 'Milliliter', symbol: 'ml', baseUnit: 'L', conversionFactor: 0.001 },
      { code: 'GAL', name: 'Gallon', symbol: 'gal', baseUnit: 'L', conversionFactor: 3.78541 },

      // Quantity - Base: Piece
      { code: 'PCS', name: 'Pieces', symbol: 'pcs', isBaseUnit: true },
      { code: 'DOZ', name: 'Dozen', symbol: 'doz', baseUnit: 'PCS', conversionFactor: 12 },
      { code: 'GROSS', name: 'Gross', symbol: 'gross', baseUnit: 'PCS', conversionFactor: 144 },

      // Time - Base: Hour
      { code: 'HR', name: 'Hour', symbol: 'hr', isBaseUnit: true },
      { code: 'MIN', name: 'Minute', symbol: 'min', baseUnit: 'HR', conversionFactor: 0.0166667 },
      { code: 'DAY', name: 'Day', symbol: 'day', baseUnit: 'HR', conversionFactor: 24 },
    ]

    const createdUnits: UnitWithConversions[] = []
    const unitMap = new Map<string, string>() // code -> id mapping

    // First pass: Create base units
    for (const unitData of standardUnits) {
      if (unitData.isBaseUnit) {
        const existingUnit = await this.getUnitOfMeasureByCode(unitData.code)
        if (!existingUnit) {
          const unit = await this.createUnitOfMeasure({
            code: unitData.code,
            name: unitData.name,
            symbol: unitData.symbol,
            isBaseUnit: true,
            createdBy: userId
          })
          createdUnits.push(unit)
          unitMap.set(unitData.code, unit.id)
        } else {
          unitMap.set(unitData.code, existingUnit.id)
        }
      }
    }

    // Second pass: Create derived units
    for (const unitData of standardUnits) {
      if (!unitData.isBaseUnit && unitData.baseUnit) {
        const existingUnit = await this.getUnitOfMeasureByCode(unitData.code)
        if (!existingUnit) {
          const baseUnitId = unitMap.get(unitData.baseUnit)
          if (baseUnitId) {
            const unit = await this.createUnitOfMeasure({
              code: unitData.code,
              name: unitData.name,
              symbol: unitData.symbol,
              baseUnitId,
              conversionFactor: unitData.conversionFactor,
              createdBy: userId
            })
            createdUnits.push(unit)
          }
        }
      }
    }

    return createdUnits
  }
}