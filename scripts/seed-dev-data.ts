import { PrismaClient } from "@prisma/client"
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')
  
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  // First check if user exists by username
  let adminUser = await prisma.user.findUnique({
    where: { username: 'admin' },
  })
  
  if (!adminUser) {
    // Try by email if username not found
    adminUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    })
  }
  
  if (!adminUser) {
    // Create new user if doesn't exist
    adminUser = await prisma.user.create({
      data: {
        id: 'dev-user-1',
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    })
    console.log('✅ Created admin user:', adminUser.email)
  } else {
    console.log('✅ Admin user already exists:', adminUser.email)
  }
  
  // Create user profile
  const adminProfile = await prisma.userProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      firstName: 'Admin',
      lastName: 'User',
      department: 'Management',
      jobTitle: 'System Administrator',
    },
  })
  
  console.log('✅ Created admin profile')
  
  // Create sample customer
  const customer = await prisma.customer.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      customerNumber: 'CUST-001',
      name: 'Sample Customer',
      email: 'customer@example.com',
      phone: '+1234567890',
      industry: 'Technology',
      creditLimit: 50000,
      paymentTerms: 30,
      createdBy: adminUser.id,
    },
  })
  
  console.log('✅ Created sample customer:', customer.name)
  
  // First create a category for the product
  const category = await prisma.category.upsert({
    where: { code: 'GEN' },
    update: {},
    create: {
      code: 'GEN',
      name: 'General',
      description: 'General products',
      isActive: true,
      createdBy: adminUser.id,
    },
  })
  
  console.log('✅ Created category:', category.name)
  
  // Create a unit of measure
  const uom = await prisma.unitOfMeasure.upsert({
    where: { code: 'PCS' },
    update: {},
    create: {
      code: 'PCS',
      name: 'Pieces',
      symbol: 'pcs',
      isActive: true,
      isBaseUnit: true,
      createdBy: adminUser.id,
    },
  })
  
  console.log('✅ Created unit of measure:', uom.name)
  
  // Create sample product (Item)
  const product = await prisma.item.upsert({
    where: { code: 'PROD-001' },
    update: {},
    create: {
      code: 'PROD-001',
      name: 'Sample Product',
      description: 'A sample product for testing',
      categoryId: category.id,
      unitOfMeasureId: uom.id,
      type: 'PRODUCT',
      standardCost: 50,
      listPrice: 100,
      minStockLevel: 10,
      maxStockLevel: 1000,
      reorderPoint: 20,
      trackInventory: true,
      isActive: true,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: adminUser.id,
    },
  })
  
  console.log('✅ Created sample product:', product.name)
  
  console.log('\n✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
