import { prisma } from '../lib/db/prisma'

async function testCategories() {
  console.log('Testing Categories Database and API...\n')

  try {
    // Test 1: Check if Category table exists
    console.log('1. Checking Category table...')
    const tableCheck = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name='Category';
    `
    console.log('Category table exists:', tableCheck)

    // Test 2: Count existing categories
    console.log('\n2. Counting existing categories...')
    const categoryCount = await prisma.category.count()
    console.log('Total categories:', categoryCount)

    // Test 3: List first 5 categories
    console.log('\n3. First 5 categories:')
    const categories = await prisma.category.findMany({
      take: 5,
      include: {
        parent: true,
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      }
    })
    console.log(JSON.stringify(categories, null, 2))

    // Test 4: Create a test category
    console.log('\n4. Creating test category...')
    try {
      const testCategory = await prisma.category.create({
        data: {
          code: 'TEST-DEBUG-001',
          name: 'Debug Test Category',
          description: 'Created by debug script',
          createdBy: 'debug-script'
        }
      })
      console.log('Created category:', testCategory)

      // Clean up
      await prisma.category.delete({
        where: { id: testCategory.id }
      })
      console.log('Cleaned up test category')
    } catch (error) {
      console.error('Error creating category:', error)
    }

    // Test 5: Check for any error logs
    console.log('\n5. Checking for recent audit logs...')
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Category',
        createdAt: {
          gte: new Date(Date.now() - 3600000) // Last hour
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
    console.log('Recent category audit logs:', recentLogs.length)

  } catch (error) {
    console.error('Error during testing:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCategories()