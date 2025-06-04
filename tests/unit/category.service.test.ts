import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { CategoryService } from '@/lib/services/inventory/category.service'
import { prisma } from '@/lib/db/prisma'

describe('Category Service', () => {
  let service: CategoryService
  let testUserId: string

  beforeEach(async () => {
    service = new CategoryService()
    
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany()
    await prisma.item.deleteMany()
    await prisma.category.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Category Creation', () => {
    it('should create a root category', async () => {
      const categoryData = {
        code: 'ELECTRONICS',
        name: 'Electronics',
        description: 'Electronic products and components',
        createdBy: testUserId
      }

      const category = await service.createCategory(categoryData)

      expect(category).toBeDefined()
      expect(category.code).toBe('ELECTRONICS')
      expect(category.name).toBe('Electronics')
      expect(category.description).toBe('Electronic products and components')
      expect(category.parentId).toBeNull()
      expect(category.isActive).toBe(true)
      expect(category.createdBy).toBe(testUserId)
    })

    it('should create a child category', async () => {
      // Create parent category first
      const parentCategory = await service.createCategory({
        code: 'ELECTRONICS',
        name: 'Electronics',
        createdBy: testUserId
      })

      const childCategoryData = {
        code: 'MOBILE',
        name: 'Mobile Phones',
        description: 'Mobile phones and accessories',
        parentId: parentCategory.id,
        createdBy: testUserId
      }

      const childCategory = await service.createCategory(childCategoryData)

      expect(childCategory).toBeDefined()
      expect(childCategory.code).toBe('MOBILE')
      expect(childCategory.name).toBe('Mobile Phones')
      expect(childCategory.parentId).toBe(parentCategory.id)
      expect(childCategory.parent?.id).toBe(parentCategory.id)
      expect(childCategory.parent?.name).toBe('Electronics')
    })

    it('should prevent duplicate category codes', async () => {
      await service.createCategory({
        code: 'ELECTRONICS',
        name: 'Electronics',
        createdBy: testUserId
      })

      await expect(service.createCategory({
        code: 'ELECTRONICS',
        name: 'Electronic Devices',
        createdBy: testUserId
      })).rejects.toThrow('Category with this code already exists')
    })

    it('should validate parent category exists', async () => {
      await expect(service.createCategory({
        code: 'MOBILE',
        name: 'Mobile Phones',
        parentId: 'non-existent-id',
        createdBy: testUserId
      })).rejects.toThrow('Parent category not found')
    })

    it('should prevent creating under inactive parent', async () => {
      const parentCategory = await service.createCategory({
        code: 'ELECTRONICS',
        name: 'Electronics',
        createdBy: testUserId
      })

      // Deactivate parent
      await service.deactivateCategory(parentCategory.id, testUserId)

      await expect(service.createCategory({
        code: 'MOBILE',
        name: 'Mobile Phones',
        parentId: parentCategory.id,
        createdBy: testUserId
      })).rejects.toThrow('Cannot create category under inactive parent')
    })
  })

  describe('Category Updates', () => {
    let categoryId: string

    beforeEach(async () => {
      const category = await service.createCategory({
        code: 'ELECTRONICS',
        name: 'Electronics',
        description: 'Original description',
        createdBy: testUserId
      })
      categoryId = category.id
    })

    it('should update category details', async () => {
      const updates = {
        name: 'Electronic Products',
        description: 'Updated description'
      }

      const updatedCategory = await service.updateCategory(categoryId, updates, testUserId)

      expect(updatedCategory.name).toBe('Electronic Products')
      expect(updatedCategory.description).toBe('Updated description')
      expect(updatedCategory.code).toBe('ELECTRONICS') // Should remain unchanged
    })

    it('should update category code', async () => {
      const updates = {
        code: 'ELECTRONICS_NEW'
      }

      const updatedCategory = await service.updateCategory(categoryId, updates, testUserId)

      expect(updatedCategory.code).toBe('ELECTRONICS_NEW')
    })

    it('should prevent duplicate code on update', async () => {
      await service.createCategory({
        code: 'FURNITURE',
        name: 'Furniture',
        createdBy: testUserId
      })

      await expect(service.updateCategory(categoryId, { code: 'FURNITURE' }, testUserId))
        .rejects.toThrow('Category with this code already exists')
    })

    it('should update parent category', async () => {
      const newParent = await service.createCategory({
        code: 'PRODUCTS',
        name: 'All Products',
        createdBy: testUserId
      })

      const updatedCategory = await service.updateCategory(categoryId, { parentId: newParent.id }, testUserId)

      expect(updatedCategory.parentId).toBe(newParent.id)
      expect(updatedCategory.parent?.name).toBe('All Products')
    })

    it('should prevent circular reference', async () => {
      await expect(service.updateCategory(categoryId, { parentId: categoryId }, testUserId))
        .rejects.toThrow('Category cannot be its own parent')
    })

    it('should prevent setting child as parent', async () => {
      const childCategory = await service.createCategory({
        code: 'MOBILE',
        name: 'Mobile Phones',
        parentId: categoryId,
        createdBy: testUserId
      })

      await expect(service.updateCategory(categoryId, { parentId: childCategory.id }, testUserId))
        .rejects.toThrow('Cannot set a child category as parent')
    })
  })

  describe('Category Retrieval', () => {
    beforeEach(async () => {
      // Create test hierarchy
      const electronics = await service.createCategory({
        code: 'ELECTRONICS',
        name: 'Electronics',
        createdBy: testUserId
      })

      const mobile = await service.createCategory({
        code: 'MOBILE',
        name: 'Mobile Phones',
        parentId: electronics.id,
        createdBy: testUserId
      })

      await service.createCategory({
        code: 'SMARTPHONES',
        name: 'Smartphones',
        parentId: mobile.id,
        createdBy: testUserId
      })

      await service.createCategory({
        code: 'FURNITURE',
        name: 'Furniture',
        createdBy: testUserId
      })
    })

    it('should get category by ID', async () => {
      const categories = await service.getAllCategories()
      const electronicsCategory = categories.find(c => c.code === 'ELECTRONICS')
      
      const category = await service.getCategory(electronicsCategory!.id)

      expect(category).toBeDefined()
      expect(category!.code).toBe('ELECTRONICS')
      expect(category!.children).toBeDefined()
      expect(category!.children.length).toBeGreaterThan(0)
    })

    it('should get category by code', async () => {
      const category = await service.getCategoryByCode('ELECTRONICS')

      expect(category).toBeDefined()
      expect(category!.code).toBe('ELECTRONICS')
      expect(category!.name).toBe('Electronics')
    })

    it('should get all categories', async () => {
      const categories = await service.getAllCategories()

      expect(categories).toHaveLength(4)
      expect(categories.some(c => c.code === 'ELECTRONICS')).toBe(true)
      expect(categories.some(c => c.code === 'MOBILE')).toBe(true)
    })

    it('should filter categories by parent', async () => {
      const electronics = await service.getCategoryByCode('ELECTRONICS')
      const childCategories = await service.getAllCategories({ 
        parentId: electronics!.id 
      })

      expect(childCategories).toHaveLength(1)
      expect(childCategories[0].code).toBe('MOBILE')
    })

    it('should get root categories', async () => {
      const rootCategories = await service.getAllCategories({ parentId: null })

      expect(rootCategories).toHaveLength(2)
      expect(rootCategories.some(c => c.code === 'ELECTRONICS')).toBe(true)
      expect(rootCategories.some(c => c.code === 'FURNITURE')).toBe(true)
    })

    it('should search categories', async () => {
      const searchResults = await service.getAllCategories({ search: 'Mobile' })

      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].code).toBe('MOBILE')
    })

    it('should get category tree', async () => {
      const tree = await service.getCategoryTree()

      expect(tree).toHaveLength(2) // Two root categories
      
      const electronicsNode = tree.find(c => c.code === 'ELECTRONICS')
      expect(electronicsNode).toBeDefined()
      expect(electronicsNode!.children).toHaveLength(1)
      expect(electronicsNode!.children[0].code).toBe('MOBILE')
      expect(electronicsNode!.children[0].children).toHaveLength(1)
      expect(electronicsNode!.children[0].children[0].code).toBe('SMARTPHONES')
    })
  })

  describe('Category Deletion', () => {
    let categoryId: string

    beforeEach(async () => {
      const category = await service.createCategory({
        code: 'TEMP',
        name: 'Temporary Category',
        createdBy: testUserId
      })
      categoryId = category.id
    })

    it('should delete category without children or items', async () => {
      const result = await service.deleteCategory(categoryId, testUserId)

      expect(result).toBe(true)
      
      const category = await service.getCategory(categoryId)
      expect(category).toBeNull()
    })

    it('should prevent deletion of category with children', async () => {
      await service.createCategory({
        code: 'CHILD',
        name: 'Child Category',
        parentId: categoryId,
        createdBy: testUserId
      })

      await expect(service.deleteCategory(categoryId, testUserId))
        .rejects.toThrow('Cannot delete category with child categories')
    })

    it('should deactivate category instead of deletion', async () => {
      const deactivatedCategory = await service.deactivateCategory(categoryId, testUserId)

      expect(deactivatedCategory.isActive).toBe(false)
      
      // Category should still exist but be inactive
      const category = await service.getCategory(categoryId)
      expect(category).toBeDefined()
      expect(category!.isActive).toBe(false)
    })
  })

  describe('Category Code Generation', () => {
    it('should generate first category code', async () => {
      const code = await service.generateCategoryCode()

      expect(code).toBe('CAT-001')
    })

    it('should generate sequential category codes', async () => {
      await service.createCategory({
        code: 'CAT-001',
        name: 'Category 1',
        createdBy: testUserId
      })

      await service.createCategory({
        code: 'CAT-002',
        name: 'Category 2',
        createdBy: testUserId
      })

      const code = await service.generateCategoryCode()

      expect(code).toBe('CAT-003')
    })

    it('should generate child category code based on parent', async () => {
      const parent = await service.createCategory({
        code: 'ELECTRONICS',
        name: 'Electronics',
        createdBy: testUserId
      })

      const code = await service.generateCategoryCode(parent.id)

      expect(code).toBe('ELECTRONICS-001')
    })
  })

  describe('Category Business Rules', () => {
    it('should track category counts correctly', async () => {
      const parent = await service.createCategory({
        code: 'PARENT',
        name: 'Parent Category',
        createdBy: testUserId
      })

      await service.createCategory({
        code: 'CHILD1',
        name: 'Child 1',
        parentId: parent.id,
        createdBy: testUserId
      })

      await service.createCategory({
        code: 'CHILD2',
        name: 'Child 2',
        parentId: parent.id,
        createdBy: testUserId
      })

      const updatedParent = await service.getCategory(parent.id)

      expect(updatedParent!._count?.children).toBe(2)
    })

    it('should filter by active status', async () => {
      const activeCategory = await service.createCategory({
        code: 'ACTIVE',
        name: 'Active Category',
        createdBy: testUserId
      })

      const inactiveCategory = await service.createCategory({
        code: 'INACTIVE',
        name: 'Inactive Category',
        createdBy: testUserId
      })

      await service.deactivateCategory(inactiveCategory.id, testUserId)

      const activeCategories = await service.getAllCategories({ isActive: true })
      const inactiveCategories = await service.getAllCategories({ isActive: false })

      expect(activeCategories.some(c => c.id === activeCategory.id)).toBe(true)
      expect(activeCategories.some(c => c.id === inactiveCategory.id)).toBe(false)
      
      expect(inactiveCategories.some(c => c.id === inactiveCategory.id)).toBe(true)
      expect(inactiveCategories.some(c => c.id === activeCategory.id)).toBe(false)
    })
  })
})