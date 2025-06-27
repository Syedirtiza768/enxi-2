import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { 
  SalesOrderTemplate,
  SalesOrderTemplateItem,
  Prisma
} from "@prisma/client"

export interface CreateOrderTemplateInput {
  name: string
  description?: string
  paymentTerms?: string
  shippingTerms?: string
  shippingAddress?: string
  billingAddress?: string
  notes?: string
  defaultLeadDays?: number
  items: CreateOrderTemplateItemInput[]
}

export interface CreateOrderTemplateItemInput {
  lineNumber: number
  lineDescription?: string
  isLineHeader: boolean
  itemType: 'PRODUCT' | 'SERVICE'
  itemId?: string
  itemCode: string
  description: string
  internalDescription?: string
  defaultQuantity: number
  defaultUnitPrice: number
  unitOfMeasureId?: string
  defaultDiscount?: number
  defaultTaxRate?: number
  taxRateId?: string
  sortOrder?: number
}

export interface OrderTemplateWithItems extends SalesOrderTemplate {
  items: SalesOrderTemplateItem[]
}

export class SalesOrderTemplateService extends BaseService {
  constructor() {
    super('SalesOrderTemplateService')
  }

  async createTemplate(
    data: CreateOrderTemplateInput & { createdBy: string }
  ): Promise<OrderTemplateWithItems> {
    return this.withLogging('createTemplate', async () => {
      // Validate template
      this.validateTemplate(data)

      // Create template with items
      const template = await prisma.salesOrderTemplate.create({
        data: {
          name: data.name,
          description: data.description,
          paymentTerms: data.paymentTerms,
          shippingTerms: data.shippingTerms,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress,
          notes: data.notes,
          defaultLeadDays: data.defaultLeadDays || 7,
          createdBy: data.createdBy,
          items: {
            create: data.items.map((item, index) => ({
              ...item,
              sortOrder: item.sortOrder ?? index
            }))
          }
        },
        include: {
          items: {
            include: {
              item: true,
              unitOfMeasure: true,
              taxRateConfig: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      })

      return template
    })
  }

  async updateTemplate(
    templateId: string,
    data: Partial<CreateOrderTemplateInput>
  ): Promise<OrderTemplateWithItems> {
    return this.withLogging('updateTemplate', async () => {
      const existing = await this.getTemplate(templateId)
      if (!existing) {
        throw new Error('Template not found')
      }

      // Update template in transaction
      const result = await prisma.$transaction(async (tx) => {
        // If items are being updated, delete existing items
        if (data.items) {
          await tx.salesOrderTemplateItem.deleteMany({
            where: { templateId }
          })
        }

        // Update template
        const updated = await tx.salesOrderTemplate.update({
          where: { id: templateId },
          data: {
            name: data.name,
            description: data.description,
            paymentTerms: data.paymentTerms,
            shippingTerms: data.shippingTerms,
            shippingAddress: data.shippingAddress,
            billingAddress: data.billingAddress,
            notes: data.notes,
            defaultLeadDays: data.defaultLeadDays,
            ...(data.items && {
              items: {
                create: data.items.map((item, index) => ({
                  ...item,
                  sortOrder: item.sortOrder ?? index
                }))
              }
            })
          },
          include: {
            items: {
              include: {
                item: true,
                unitOfMeasure: true,
                taxRateConfig: true
              },
              orderBy: { sortOrder: 'asc' }
            }
          }
        })

        return updated
      })

      return result
    })
  }

  async getTemplate(id: string): Promise<OrderTemplateWithItems | null> {
    return this.withLogging('getTemplate', async () => {
      return prisma.salesOrderTemplate.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              item: true,
              unitOfMeasure: true,
              taxRateConfig: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      })
    })
  }

  async getTemplateByName(name: string): Promise<OrderTemplateWithItems | null> {
    return this.withLogging('getTemplateByName', async () => {
      return prisma.salesOrderTemplate.findFirst({
        where: { 
          name,
          isActive: true
        },
        include: {
          items: {
            include: {
              item: true,
              unitOfMeasure: true,
              taxRateConfig: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      })
    })
  }

  async getAllTemplates(options?: {
    isActive?: boolean
    search?: string
    limit?: number
    offset?: number
  }): Promise<OrderTemplateWithItems[]> {
    return this.withLogging('getAllTemplates', async () => {
      const where: Prisma.SalesOrderTemplateWhereInput = {}

      if (options?.isActive !== undefined) {
        where.isActive = options.isActive
      }

      if (options?.search) {
        where.OR = [
          { name: { contains: options.search } },
          { description: { contains: options.search } }
        ]
      }

      return prisma.salesOrderTemplate.findMany({
        where,
        include: {
          items: {
            include: {
              item: true,
              unitOfMeasure: true,
              taxRateConfig: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: { name: 'asc' },
        take: options?.limit,
        skip: options?.offset
      })
    })
  }

  async deleteTemplate(templateId: string): Promise<void> {
    return this.withLogging('deleteTemplate', async () => {
      const existing = await this.getTemplate(templateId)
      if (!existing) {
        throw new Error('Template not found')
      }

      // Soft delete by marking as inactive
      await prisma.salesOrderTemplate.update({
        where: { id: templateId },
        data: { isActive: false }
      })
    })
  }

  async activateTemplate(templateId: string): Promise<OrderTemplateWithItems> {
    return this.withLogging('activateTemplate', async () => {
      return prisma.salesOrderTemplate.update({
        where: { id: templateId },
        data: { isActive: true },
        include: {
          items: {
            include: {
              item: true,
              unitOfMeasure: true,
              taxRateConfig: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      })
    })
  }

  async cloneTemplate(
    templateId: string,
    newName: string,
    userId: string
  ): Promise<OrderTemplateWithItems> {
    return this.withLogging('cloneTemplate', async () => {
      const existing = await this.getTemplate(templateId)
      if (!existing) {
        throw new Error('Template not found')
      }

      // Create new template with same items
      const cloned = await prisma.salesOrderTemplate.create({
        data: {
          name: newName,
          description: existing.description ? `${existing.description} (Clone)` : 'Clone',
          paymentTerms: existing.paymentTerms,
          shippingTerms: existing.shippingTerms,
          shippingAddress: existing.shippingAddress,
          billingAddress: existing.billingAddress,
          notes: existing.notes,
          defaultLeadDays: existing.defaultLeadDays,
          createdBy: userId,
          items: {
            create: existing.items.map(item => ({
              lineNumber: item.lineNumber,
              lineDescription: item.lineDescription,
              isLineHeader: item.isLineHeader,
              itemType: item.itemType,
              itemId: item.itemId,
              itemCode: item.itemCode,
              description: item.description,
              internalDescription: item.internalDescription,
              defaultQuantity: item.defaultQuantity,
              defaultUnitPrice: item.defaultUnitPrice,
              unitOfMeasureId: item.unitOfMeasureId,
              defaultDiscount: item.defaultDiscount,
              defaultTaxRate: item.defaultTaxRate,
              taxRateId: item.taxRateId,
              sortOrder: item.sortOrder
            }))
          }
        },
        include: {
          items: {
            include: {
              item: true,
              unitOfMeasure: true,
              taxRateConfig: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      })

      return cloned
    })
  }

  private validateTemplate(data: CreateOrderTemplateInput): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Template name is required')
    }

    if (data.name.length > 100) {
      throw new Error('Template name must be 100 characters or less')
    }

    if (data.description && data.description.length > 500) {
      throw new Error('Description must be 500 characters or less')
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('At least one template item is required')
    }

    // Validate items
    for (const [index, item] of data.items.entries()) {
      const lineContext = `Line ${item.lineNumber}, Item ${index + 1}`

      if (!item.itemCode || item.itemCode.trim().length === 0) {
        throw new Error(`${lineContext}: Item code is required`)
      }

      if (!item.description || item.description.trim().length === 0) {
        throw new Error(`${lineContext}: Description is required`)
      }

      if (item.defaultQuantity <= 0) {
        throw new Error(`${lineContext}: Default quantity must be greater than 0`)
      }

      if (item.defaultUnitPrice < 0) {
        throw new Error(`${lineContext}: Default unit price cannot be negative`)
      }

      if (item.defaultDiscount !== undefined && (item.defaultDiscount < 0 || item.defaultDiscount > 100)) {
        throw new Error(`${lineContext}: Default discount must be between 0 and 100`)
      }

      if (item.defaultTaxRate !== undefined && (item.defaultTaxRate < 0 || item.defaultTaxRate > 100)) {
        throw new Error(`${lineContext}: Default tax rate must be between 0 and 100`)
      }
    }
  }
}