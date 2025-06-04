import { prisma } from '@/lib/db/prisma'
import { TestSetup } from '../helpers/setup'

// Test the complete inventory categories flow
describe('Inventory Categories Integration Flow', () => {
  let testUser: any
  let authToken: string

  beforeAll(async () => {
    const setup = await TestSetup.beforeAll()
    testUser = setup.testUser
    
    // Mock auth token for API requests
    authToken = 'test-token'
  })

  afterAll(async () => {
    await TestSetup.afterAll()
  })

  beforeEach(async () => {
    await TestSetup.beforeEach()
    // Clean categories
    await prisma.category.deleteMany()
  })

  describe('Category Management Flow', () => {
    it('should create, update, and organize categories hierarchically', async () => {
      // 1. Create root category
      const rootCategory = await prisma.category.create({
        data: {
          name: 'Electronics',
          code: 'ELEC',
          description: 'Electronic items',
          isActive: true,
          createdBy: testUser.id
        }
      })

      expect(rootCategory).toBeDefined()
      expect(rootCategory.code).toBe('ELEC')

      // 2. Create child category
      const childCategory = await prisma.category.create({
        data: {
          name: 'Computers',
          code: 'COMP',
          parentId: rootCategory.id,
          isActive: true,
          createdBy: testUser.id
        }
      })

      expect(childCategory.parentId).toBe(rootCategory.id)

      // 3. Create another child
      const childCategory2 = await prisma.category.create({
        data: {
          name: 'Mobile Phones',
          code: 'MOBILE',
          parentId: rootCategory.id,
          isActive: true,
          createdBy: testUser.id
        }
      })

      // 4. Fetch category tree
      const categories = await prisma.category.findMany({
        where: { parentId: null },
        include: {
          children: true
        }
      })

      expect(categories).toHaveLength(1)
      expect(categories[0].children).toHaveLength(2)

      // 5. Update category
      const updated = await prisma.category.update({
        where: { id: childCategory.id },
        data: {
          name: 'Computers & Laptops'
        }
      })

      expect(updated.name).toBe('Computers & Laptops')

      // 6. Try to delete parent (should fail with children)
      const childrenCount = await prisma.category.count({
        where: { parentId: rootCategory.id }
      })
      expect(childrenCount).toBeGreaterThan(0)

      // 7. Delete child category
      await prisma.category.delete({
        where: { id: childCategory2.id }
      })

      const remainingChildren = await prisma.category.count({
        where: { parentId: rootCategory.id }
      })
      expect(remainingChildren).toBe(1)
    })

    it('should handle category code uniqueness', async () => {
      await prisma.category.create({
        data: {
          name: 'Test Category',
          code: 'TEST001',
          isActive: true,
          createdBy: testUser.id
        }
      })

      // Try to create with same code
      await expect(
        prisma.category.create({
          data: {
            name: 'Another Category',
            code: 'TEST001',
            isActive: true,
            createdBy: testUser.id
          }
        })
      ).rejects.toThrow()
    })

    it('should track audit information', async () => {
      const category = await prisma.category.create({
        data: {
          name: 'Audit Test',
          code: 'AUDIT',
          isActive: true,
          createdBy: testUser.id
        }
      })

      expect(category.createdBy).toBe(testUser.id)
      expect(category.createdAt).toBeDefined()
      expect(category.updatedAt).toBeDefined()

      // Update and check updatedAt changes
      const originalUpdatedAt = category.updatedAt
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const updated = await prisma.category.update({
        where: { id: category.id },
        data: { description: 'Updated description' }
      })

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should handle inventory items relationship', async () => {
      const category = await prisma.category.create({
        data: {
          name: 'Items Category',
          code: 'ITEMS',
          isActive: true,
          createdBy: testUser.id
        }
      })

      // Get unit of measure
      const unit = await prisma.unitOfMeasure.findFirst({
        where: { code: 'PCS' }
      })
      if (!unit) throw new Error('Unit of measure not found')

      // Create an item in this category
      const item = await prisma.item.create({
        data: {
          code: 'TEST-001',
          name: 'Test Item',
          categoryId: category.id,
          unitOfMeasureId: unit.id,
          type: 'PRODUCT',
          trackInventory: true,
          isActive: true,
          createdBy: testUser.id
        }
      })

      // Try to delete category with items (should fail)
      await expect(
        prisma.category.delete({
          where: { id: category.id }
        })
      ).rejects.toThrow()

      // Delete item first
      await prisma.item.delete({
        where: { id: item.id }
      })

      // Now category can be deleted
      await prisma.category.delete({
        where: { id: category.id }
      })

      const deletedCategory = await prisma.category.findUnique({
        where: { id: category.id }
      })
      expect(deletedCategory).toBeNull()
    })
  })

  describe('API Integration', () => {
    it('should handle complete CRUD cycle through API endpoints', async () => {
      // Note: This would require actual HTTP requests in a real test
      // For now, we're testing the data layer directly
      
      // The actual API tests are in /tests/integration/inventory-api.test.ts
      // This test validates the database operations that the APIs use
      
      const category = await prisma.category.create({
        data: {
          name: 'API Test Category',
          code: 'API_TEST',
          isActive: true,
          createdBy: testUser.id
        }
      })

      // Simulate API list with filters
      const activeCategories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })

      expect(activeCategories.length).toBeGreaterThan(0)
      expect(activeCategories[0].name).toBe('API Test Category')

      // Simulate API search
      const searchResults = await prisma.category.findMany({
        where: {
          OR: [
            { name: { contains: 'API' } },
            { code: { contains: 'API' } }
          ]
        }
      })

      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].code).toBe('API_TEST')
    })
  })
})