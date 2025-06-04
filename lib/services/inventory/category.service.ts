import { prisma } from '@/lib/db/prisma'
import { AuditService } from '../audit.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { Category, Prisma } from '@/lib/generated/prisma'

export interface CreateCategoryInput {
  code: string
  name: string
  description?: string
  parentId?: string
}

export interface UpdateCategoryInput {
  code?: string
  name?: string
  description?: string
  parentId?: string
  isActive?: boolean
}

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[]
  parent?: Category | null
  _count?: {
    children: number
    items: number
  }
}

export class CategoryService {
  private auditService: AuditService

  constructor() {
    this.auditService = new AuditService()
  }

  async createCategory(
    data: CreateCategoryInput & { createdBy: string }
  ): Promise<CategoryWithChildren> {
    // Check if code is unique
    const existingCategory = await prisma.category.findUnique({
      where: { code: data.code }
    })

    if (existingCategory) {
      throw new Error('Category with this code already exists')
    }

    // Validate parent category exists if provided
    if (data.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: data.parentId }
      })

      if (!parentCategory) {
        throw new Error('Parent category not found')
      }

      if (!parentCategory.isActive) {
        throw new Error('Cannot create category under inactive parent')
      }
    }

    const category = await prisma.category.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        createdBy: data.createdBy
      },
      include: {
        children: true,
        parent: true,
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId: data.createdBy,
      action: AuditAction.CREATE,
      entityType: 'Category',
      entityId: category.id,
      afterData: category,
    })

    return category
  }

  async updateCategory(
    id: string,
    data: UpdateCategoryInput,
    userId: string
  ): Promise<CategoryWithChildren> {
    const existingCategory = await this.getCategory(id)
    if (!existingCategory) {
      throw new Error('Category not found')
    }

    // Check code uniqueness if being updated
    if (data.code && data.code !== existingCategory.code) {
      const codeExists = await prisma.category.findUnique({
        where: { code: data.code }
      })

      if (codeExists) {
        throw new Error('Category with this code already exists')
      }
    }

    // Validate parent category if being updated
    if (data.parentId && data.parentId !== existingCategory.parentId) {
      // Prevent circular reference
      if (data.parentId === id) {
        throw new Error('Category cannot be its own parent')
      }

      // Check if trying to set a child as parent
      const isChildCategory = await this.isChildCategory(id, data.parentId)
      if (isChildCategory) {
        throw new Error('Cannot set a child category as parent')
      }

      const parentCategory = await prisma.category.findUnique({
        where: { id: data.parentId }
      })

      if (!parentCategory) {
        throw new Error('Parent category not found')
      }

      if (!parentCategory.isActive) {
        throw new Error('Cannot set inactive category as parent')
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        children: true,
        parent: true,
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Category',
      entityId: id,
      beforeData: existingCategory,
      afterData: updatedCategory,
    })

    return updatedCategory
  }

  async getCategory(id: string): Promise<CategoryWithChildren | null> {
    return prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          include: {
            children: true,
            _count: {
              select: {
                children: true,
                items: true
              }
            }
          }
        },
        parent: true,
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      }
    })
  }

  async getCategoryByCode(code: string): Promise<CategoryWithChildren | null> {
    return prisma.category.findUnique({
      where: { code },
      include: {
        children: {
          include: {
            children: true,
            _count: {
              select: {
                children: true,
                items: true
              }
            }
          }
        },
        parent: true,
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      }
    })
  }

  async getAllCategories(options?: {
    parentId?: string | null
    isActive?: boolean
    search?: string
    includeChildren?: boolean
    limit?: number
    offset?: number
  }): Promise<CategoryWithChildren[]> {
    const where: Prisma.CategoryWhereInput = {}

    if (options?.parentId !== undefined) {
      where.parentId = options.parentId
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive
    }

    if (options?.search) {
      where.OR = [
        { code: { contains: options.search } },
        { name: { contains: options.search } },
        { description: { contains: options.search } }
      ]
    }

    return prisma.category.findMany({
      where,
      include: {
        children: options?.includeChildren ? {
          include: {
            children: true,
            _count: {
              select: {
                children: true,
                items: true
              }
            }
          }
        } : false,
        parent: true,
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      },
      orderBy: [
        { code: 'asc' },
        { name: 'asc' }
      ],
      take: options?.limit,
      skip: options?.offset
    })
  }

  async getCategoryTree(): Promise<CategoryWithChildren[]> {
    // Get all root categories (no parent) with their complete hierarchy
    return prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
                _count: {
                  select: {
                    children: true,
                    items: true
                  }
                }
              }
            },
            _count: {
              select: {
                children: true,
                items: true
              }
            }
          }
        },
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      },
      orderBy: { code: 'asc' }
    })
  }

  async deleteCategory(id: string, userId: string): Promise<boolean> {
    const category = await this.getCategory(id)
    if (!category) {
      throw new Error('Category not found')
    }

    // Check if category has children
    if (category._count && category._count.children > 0) {
      throw new Error('Cannot delete category with child categories')
    }

    // Check if category has items
    if (category._count && category._count.items > 0) {
      throw new Error('Cannot delete category with associated items')
    }

    await prisma.category.delete({
      where: { id }
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.DELETE,
      entityType: 'Category',
      entityId: id,
      beforeData: category,
    })

    return true
  }

  async deactivateCategory(id: string, userId: string): Promise<CategoryWithChildren> {
    const category = await this.getCategory(id)
    if (!category) {
      throw new Error('Category not found')
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      },
      include: {
        children: true,
        parent: true,
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Category',
      entityId: id,
      beforeData: category,
      afterData: updatedCategory,
      metadata: { action: 'deactivate' }
    })

    return updatedCategory
  }

  private async isChildCategory(parentId: string, childId: string): Promise<boolean> {
    // Check if childId is a descendant of parentId by traversing up the hierarchy
    let currentCategory = await prisma.category.findUnique({
      where: { id: childId },
      include: { parent: true }
    })

    while (currentCategory) {
      if (currentCategory.parentId === parentId) {
        return true
      }
      
      if (currentCategory.parent) {
        currentCategory = await prisma.category.findUnique({
          where: { id: currentCategory.parent.id },
          include: { parent: true }
        })
      } else {
        break
      }
    }

    return false
  }

  async generateCategoryCode(parentId?: string): Promise<string> {
    let prefix = 'CAT'
    
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId }
      })
      if (parent) {
        prefix = parent.code
      }
    }

    // Find the last category with this prefix
    const lastCategory = await prisma.category.findFirst({
      where: {
        code: { startsWith: prefix }
      },
      orderBy: { code: 'desc' }
    })

    if (!lastCategory) {
      return `${prefix}-001`
    }

    // Extract number and increment
    const match = lastCategory.code.match(/-(\d+)$/)
    if (match) {
      const lastNumber = parseInt(match[1])
      const newNumber = lastNumber + 1
      return `${prefix}-${newNumber.toString().padStart(3, '0')}`
    }

    return `${prefix}-001`
  }
}