import { apiClient } from '@/lib/api/client'

async function main() {
  console.warn('Testing categories tree API...\n')
  
  try {
    // Mock the browser environment for apiClient
    global.window = {} as any
    global.document = { cookie: '' } as any
    
    // Direct database check first
    const { PrismaClient } = require('@/lib/generated/prisma')
    const prisma = new PrismaClient()
    
    const categories = await prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true
      },
      include: {
        children: true,
        _count: {
          select: {
            children: true,
            items: true
          }
        }
      }
    })
    
    console.warn('Direct DB query - Root categories:', categories.length)
    categories.forEach(cat => {
      console.warn(`- ${cat.name} (${cat.code}): ${cat._count.children} children, ${cat._count.items} items`)
    })
    
    await prisma.$disconnect()
    
} catch {}

main()