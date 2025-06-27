import { BaseService } from './base.service'
import { prisma } from '@/lib/db/prisma'
import { TaxCategory, TaxRate, TaxExemption, Prisma } from "@prisma/client"
import { TaxType } from '@/lib/types/shared-enums'

interface CreateTaxCategoryDto {
  code: string
  name: string
  description?: string
  isDefault?: boolean
  createdBy: string
}

interface CreateTaxRateDto {
  code: string
  name: string
  description?: string
  rate: number
  categoryId: string
  taxType?: TaxType
  appliesTo?: string
  effectiveFrom?: Date
  effectiveTo?: Date
  isDefault?: boolean
  isCompound?: boolean
  collectedAccountId?: string
  paidAccountId?: string
  createdBy: string
}

interface CreateTaxExemptionDto {
  entityType: 'CUSTOMER' | 'SUPPLIER'
  entityId: string
  taxRateId?: string
  exemptionNumber?: string
  reason?: string
  effectiveFrom?: Date
  effectiveTo?: Date
  attachmentUrl?: string
  createdBy: string
}

interface TaxCalculationInput {
  amount: number
  taxRateId?: string
  customerId?: string
  supplierId?: string
  transactionDate?: Date
  appliesTo?: string
}

interface TaxCalculationResult {
  subtotal: number
  taxAmount: number
  total: number
  appliedTaxRates: Array<{
    taxRateId: string
    code: string
    name: string
    rate: number
    amount: number
    isCompound: boolean
  }>
  exemptions: Array<{
    exemptionId: string
    reason: string
  }>
}

export class TaxService extends BaseService {
  constructor() {
    super('TaxService')
  }

  // Tax Category Management
  async createTaxCategory(data: CreateTaxCategoryDto): Promise<TaxCategory> {
    return this.withLogging('createTaxCategory', async () => {
      // If setting as default, unset other defaults
      if (data.isDefault) {
        await prisma.taxCategory.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        })
      }

      return prisma.taxCategory.create({ data })
    })
  }

  async updateTaxCategory(id: string, data: Partial<CreateTaxCategoryDto>): Promise<TaxCategory> {
    return this.withLogging('updateTaxCategory', async () => {
      // If setting as default, unset other defaults
      if (data.isDefault) {
        await prisma.taxCategory.updateMany({
          where: { 
            isDefault: true,
            id: { not: id }
          },
          data: { isDefault: false }
        })
      }

      return prisma.taxCategory.update({
        where: { id },
        data
      })
    })
  }

  async getTaxCategories(filters?: { isActive?: boolean }): Promise<TaxCategory[]> {
    return this.withLogging('getTaxCategories', async () => {
      return prisma.taxCategory.findMany({
        where: filters,
        include: {
          taxRates: {
            where: { isActive: true }
          }
        },
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' }
        ]
      })
    })
  }

  async getTaxCategoryById(id: string): Promise<TaxCategory | null> {
    return this.withLogging('getTaxCategoryById', async () => {
      return prisma.taxCategory.findUnique({
        where: { id },
        include: {
          taxRates: true
        }
      })
    })
  }

  // Tax Rate Management
  async createTaxRate(data: CreateTaxRateDto): Promise<TaxRate> {
    return this.withLogging('createTaxRate', async () => {
      // If setting as default, unset other defaults in the same category
      if (data.isDefault) {
        await prisma.taxRate.updateMany({
          where: { 
            categoryId: data.categoryId,
            isDefault: true 
          },
          data: { isDefault: false }
        })
      }

      return prisma.taxRate.create({
        data: {
          ...data,
          effectiveFrom: data.effectiveFrom || new Date()
        },
        include: {
          category: true,
          collectedAccount: true,
          paidAccount: true
        }
      })
    })
  }

  async updateTaxRate(id: string, data: Partial<CreateTaxRateDto>): Promise<TaxRate> {
    return this.withLogging('updateTaxRate', async () => {
      const existingRate = await prisma.taxRate.findUnique({
        where: { id }
      })

      if (!existingRate) {
        throw new Error('Tax rate not found')
      }

      // If setting as default, unset other defaults in the same category
      if (data.isDefault && data.categoryId) {
        await prisma.taxRate.updateMany({
          where: { 
            categoryId: data.categoryId || existingRate.categoryId,
            isDefault: true,
            id: { not: id }
          },
          data: { isDefault: false }
        })
      }

      return prisma.taxRate.update({
        where: { id },
        data,
        include: {
          category: true,
          collectedAccount: true,
          paidAccount: true
        }
      })
    })
  }

  async getTaxRates(filters?: {
    isActive?: boolean
    categoryId?: string
    taxType?: TaxType
    effectiveDate?: Date
  }): Promise<TaxRate[]> {
    return this.withLogging('getTaxRates', async () => {
      const where: Prisma.TaxRateWhereInput = {
        isActive: filters?.isActive,
        categoryId: filters?.categoryId,
        taxType: filters?.taxType
      }

      // Filter by effective date
      if (filters?.effectiveDate) {
        where.AND = [
          {
            OR: [
              { effectiveFrom: { lte: filters.effectiveDate } },
              { effectiveFrom: null }
            ]
          },
          {
            OR: [
              { effectiveTo: { gte: filters.effectiveDate } },
              { effectiveTo: null }
            ]
          }
        ]
      }

      return prisma.taxRate.findMany({
        where,
        include: {
          category: true
        },
        orderBy: [
          { isDefault: 'desc' },
          { category: { name: 'asc' } },
          { name: 'asc' }
        ]
      })
    })
  }

  async getTaxRateById(id: string): Promise<TaxRate | null> {
    return this.withLogging('getTaxRateById', async () => {
      return prisma.taxRate.findUnique({
        where: { id },
        include: {
          category: true,
          collectedAccount: true,
          paidAccount: true
        }
      })
    })
  }

  async getDefaultTaxRate(taxType: TaxType = TaxType.SALES): Promise<TaxRate | null> {
    return this.withLogging('getDefaultTaxRate', async () => {
      // First check company settings for default
      const companySettings = await prisma.companySettings.findFirst({
        where: { isActive: true }
      })

      if (companySettings?.defaultTaxRateId) {
        const defaultRate = await prisma.taxRate.findUnique({
          where: { 
            id: companySettings.defaultTaxRateId,
            isActive: true,
            taxType
          },
          include: { category: true }
        })
        if (defaultRate) return defaultRate
      }

      // Otherwise find the first default rate for the tax type
      return prisma.taxRate.findFirst({
        where: {
          isDefault: true,
          isActive: true,
          taxType
        },
        include: { category: true }
      })
    })
  }

  // Tax Exemption Management
  async createTaxExemption(data: CreateTaxExemptionDto): Promise<TaxExemption> {
    return this.withLogging('createTaxExemption', async () => {
      return prisma.taxExemption.create({
        data: {
          ...data,
          effectiveFrom: data.effectiveFrom || new Date()
        },
        include: {
          taxRate: true
        }
      })
    })
  }

  async updateTaxExemption(id: string, data: Partial<CreateTaxExemptionDto>): Promise<TaxExemption> {
    return this.withLogging('updateTaxExemption', async () => {
      return prisma.taxExemption.update({
        where: { id },
        data,
        include: {
          taxRate: true
        }
      })
    })
  }

  async getExemptions(entityType: 'CUSTOMER' | 'SUPPLIER', entityId: string, effectiveDate?: Date): Promise<TaxExemption[]> {
    return this.withLogging('getExemptions', async () => {
      const where: Prisma.TaxExemptionWhereInput = {
        entityType,
        entityId,
        isActive: true
      }

      // Filter by effective date
      if (effectiveDate) {
        where.AND = [
          {
            OR: [
              { effectiveFrom: { lte: effectiveDate } },
              { effectiveFrom: null }
            ]
          },
          {
            OR: [
              { effectiveTo: { gte: effectiveDate } },
              { effectiveTo: null }
            ]
          }
        ]
      }

      return prisma.taxExemption.findMany({
        where,
        include: {
          taxRate: true
        }
      })
    })
  }

  // Tax Calculation
  async calculateTax(input: TaxCalculationInput): Promise<TaxCalculationResult> {
    return this.withLogging('calculateTax', async () => {
      const {
        amount,
        taxRateId,
        customerId,
        supplierId,
        transactionDate = new Date(),
        appliesTo = 'ALL'
      } = input

      const result: TaxCalculationResult = {
        subtotal: amount,
        taxAmount: 0,
        total: amount,
        appliedTaxRates: [],
        exemptions: []
      }

      // Get the tax rate
      let taxRate: TaxRate | null = null
      
      if (taxRateId) {
        taxRate = await this.getTaxRateById(taxRateId)
      } else {
        // Get default tax rate
        const taxType = customerId ? TaxType.SALES : TaxType.PURCHASE
        taxRate = await this.getDefaultTaxRate(taxType)
      }

      if (!taxRate || !taxRate.isActive) {
        return result // No tax applied
      }

      // Check if tax rate applies to the item type
      if (taxRate.appliesTo !== 'ALL' && taxRate.appliesTo !== appliesTo) {
        return result // Tax doesn't apply to this item type
      }

      // Check for exemptions
      if (customerId || supplierId) {
        const entityType = customerId ? 'CUSTOMER' : 'SUPPLIER'
        const entityId = customerId || supplierId!
        
        const exemptions = await this.getExemptions(entityType, entityId, transactionDate)
        
        // Check if there's a general exemption (taxRateId is null) or specific exemption
        const hasExemption = exemptions.some(ex => !ex.taxRateId || ex.taxRateId === taxRate!.id)
        
        if (hasExemption) {
          const exemption = exemptions.find(ex => !ex.taxRateId || ex.taxRateId === taxRate!.id)!
          result.exemptions.push({
            exemptionId: exemption.id,
            reason: exemption.reason || 'Tax exempt'
          })
          return result // No tax due to exemption
        }
      }

      // Calculate tax
      let taxableAmount = amount
      
      // Handle compound tax if needed
      if (taxRate.isCompound && result.appliedTaxRates.length > 0) {
        // Apply tax on the total including previous taxes
        taxableAmount = result.total
      }

      const taxAmount = taxableAmount * (taxRate.rate / 100)
      
      result.appliedTaxRates.push({
        taxRateId: taxRate.id,
        code: taxRate.code,
        name: taxRate.name,
        rate: taxRate.rate,
        amount: taxAmount,
        isCompound: taxRate.isCompound
      })

      result.taxAmount += taxAmount
      result.total = result.subtotal + result.taxAmount

      return result
    })
  }

  // Calculate taxes for multiple items
  async calculateTaxesForItems(items: Array<{
    amount: number
    taxRateId?: string
    appliesTo?: string
  }>, customerId?: string, supplierId?: string, transactionDate?: Date): Promise<{
    items: TaxCalculationResult[]
    totals: {
      subtotal: number
      taxAmount: number
      total: number
    }
  }> {
    return this.withLogging('calculateTaxesForItems', async () => {
      const itemResults = await Promise.all(
        items.map(item => 
          this.calculateTax({
            amount: item.amount,
            taxRateId: item.taxRateId,
            customerId,
            supplierId,
            transactionDate,
            appliesTo: item.appliesTo
          })
        )
      )

      const totals = itemResults.reduce((acc, result) => ({
        subtotal: acc.subtotal + result.subtotal,
        taxAmount: acc.taxAmount + result.taxAmount,
        total: acc.total + result.total
      }), { subtotal: 0, taxAmount: 0, total: 0 })

      return { items: itemResults, totals }
    })
  }

  // Validate tax configuration
  async validateTaxConfiguration(): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    return this.withLogging('validateTaxConfiguration', async () => {
      const errors: string[] = []
      const warnings: string[] = []

      // Check for at least one active tax category
      const activeCategories = await prisma.taxCategory.count({
        where: { isActive: true }
      })

      if (activeCategories === 0) {
        errors.push('No active tax categories found')
      }

      // Check for at least one active tax rate
      const activeRates = await prisma.taxRate.count({
        where: { isActive: true }
      })

      if (activeRates === 0) {
        errors.push('No active tax rates found')
      }

      // Check for default tax rates
      const defaultSalesRate = await this.getDefaultTaxRate(TaxType.SALES)
      if (!defaultSalesRate) {
        warnings.push('No default sales tax rate configured')
      }

      const defaultPurchaseRate = await this.getDefaultTaxRate(TaxType.PURCHASE)
      if (!defaultPurchaseRate) {
        warnings.push('No default purchase tax rate configured')
      }

      // Check for orphaned tax rates (category deleted)
      const orphanedRates = await prisma.taxRate.count({
        where: {
          category: null
        }
      })

      if (orphanedRates > 0) {
        errors.push(`${orphanedRates} tax rates have no category`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    })
  }
}

export const taxService = new TaxService()