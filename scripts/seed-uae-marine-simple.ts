import { PrismaClient } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// UAE Marine Industry specific data
const MARINE_CUSTOMERS = [
  'Dubai Maritime Services LLC',
  'Abu Dhabi Marine Transport',
  'Sharjah Shipping Company',
  'RAK Marine Industries',
  'Fujairah Port Authority',
  'Emirates Marine Holdings',
  'Gulf Navigation PJSC',
  'National Marine Dredging Co',
  'Al Marwan Shipping',
  'Horizon Marine Services',
  'Blue Ocean Logistics',
  'Coastal Marine Works',
  'Arabian Gulf Shipping',
  'Pearl Marine Services',
  'Seafarer Maritime Co'
]

const MARINE_ITEMS = [
  // Engine Parts
  { name: 'Marine Diesel Engine - CAT 3512C', category: 'Engines', price: 450000, type: 'PRODUCT' },
  { name: 'Turbocharger Assembly', category: 'Engine Parts', price: 25000, type: 'PRODUCT' },
  { name: 'Fuel Injection Pump', category: 'Engine Parts', price: 8500, type: 'PRODUCT' },
  { name: 'Cylinder Head Complete', category: 'Engine Parts', price: 15000, type: 'PRODUCT' },
  { name: 'Crankshaft Assembly', category: 'Engine Parts', price: 35000, type: 'PRODUCT' },
  
  // Maintenance Services
  { name: 'Engine Overhaul Service', category: 'Services', price: 75000, type: 'SERVICE' },
  { name: 'Annual Maintenance Contract', category: 'Services', price: 120000, type: 'SERVICE' },
  { name: 'Emergency Repair Service', category: 'Services', price: 15000, type: 'SERVICE' },
  { name: 'Oil Analysis Service', category: 'Services', price: 1500, type: 'SERVICE' },
  
  // Spare Parts
  { name: 'Oil Filter Set', category: 'Consumables', price: 450, type: 'PRODUCT' },
  { name: 'Air Filter Element', category: 'Consumables', price: 350, type: 'PRODUCT' },
  { name: 'Coolant Additive Package', category: 'Consumables', price: 250, type: 'PRODUCT' },
  { name: 'Gasket Kit Complete', category: 'Spare Parts', price: 2500, type: 'PRODUCT' },
  { name: 'Bearing Set', category: 'Spare Parts', price: 5500, type: 'PRODUCT' },
  { name: 'Piston Ring Set', category: 'Spare Parts', price: 3500, type: 'PRODUCT' },
]

async function seedSimpleMarine() {
  console.log('🌊 Starting Simple UAE Marine Seed...')
  console.log('📝 This will add marine industry specific data to your existing database')
  console.log(`📦 Using database: ${process.env.DATABASE_URL}`)
  
  try {
    // Get admin user
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
    const createdBy = admin?.id || 'system'
    
    // Create marine customers
    console.log('\n🏢 Creating marine industry customers...')
    let customerCount = 0
    
    for (const [index, name] of MARINE_CUSTOMERS.entries()) {
      const email = `contact@${name.toLowerCase().replace(/\s+/g, '')}.ae`
      console.log(`   Checking email: ${email}`)
      
      const existing = await prisma.customer.findUnique({
        where: { email }
      })
      console.log(`   Existing: ${existing ? 'YES' : 'NO'}`)
      
      if (!existing) {
        console.log(`   Creating: ${name}`)
        await prisma.customer.create({
          data: {
            name,
            customerNumber: `MAR-${String(index + 1).padStart(4, '0')}`,
            email,
            phone: `+971-4-${String(3000000 + index).padStart(7, '0')}`,
            address: `Marina Plaza, Tower ${index % 5 + 1}, Dubai Marina, Dubai, UAE`,
            currency: 'AED',
            paymentTerms: 30,
            creditLimit: 500000 + (index * 50000),
            industry: 'Marine & Shipping',
            website: `www.${name.toLowerCase().replace(/\s+/g, '')}.ae`,
            createdBy,
          }
        })
        customerCount++
      }
    }
    console.log(`✅ Created ${customerCount} new marine customers`)
    
    // Create marine items
    console.log('\n🔧 Creating marine items and services...')
    let itemCount = 0
    
    // Ensure we have required data
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { name: 'Inventory' },
          { name: 'Cost of Goods Sold' },
          { name: 'Sales Revenue' }
        ]
      }
    })
    
    if (accounts.length < 3) {
      console.log('⚠️  Required accounts not found. Please run production seed first.')
      return
    }
    
    const inventoryAccount = accounts.find(a => a.name === 'Inventory')
    const cogsAccount = accounts.find(a => a.name === 'Cost of Goods Sold')
    const salesAccount = accounts.find(a => a.name === 'Sales Revenue')
    
    // Get or create units
    let pcsUnit = await prisma.unitOfMeasure.findFirst({ where: { code: 'PCS' } })
    if (!pcsUnit) {
      pcsUnit = await prisma.unitOfMeasure.create({
        data: { code: 'PCS', name: 'Pieces', symbol: 'pcs', isBaseUnit: true, createdBy }
      })
    }
    
    // Get or create marine categories
    const categoryMap: Record<string, string> = {}
    const categories = ['Engines', 'Engine Parts', 'Services', 'Consumables', 'Spare Parts']
    
    for (const categoryName of categories) {
      let category = await prisma.category.findFirst({
        where: { name: categoryName }
      })
      
      if (!category) {
        category = await prisma.category.create({
          data: {
            code: categoryName.toUpperCase().replace(/\s+/g, '_'),
            name: categoryName,
            description: `${categoryName} for marine engines`,
            createdBy
          }
        })
      }
      
      categoryMap[categoryName] = category.id
    }
    
    // Create items
    for (const [index, itemData] of MARINE_ITEMS.entries()) {
      const code = `MAR-${itemData.category.substring(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`
      
      const existing = await prisma.item.findUnique({
        where: { code }
      })
      
      if (!existing) {
        await prisma.item.create({
          data: {
            code,
            name: itemData.name,
            description: `Professional grade ${itemData.name.toLowerCase()} for marine engines`,
            type: itemData.type,
            categoryId: categoryMap[itemData.category],
            unitOfMeasureId: pcsUnit.id,
            standardCost: itemData.price * 0.6,
            listPrice: itemData.price,
            inventoryAccountId: inventoryAccount?.id,
            cogsAccountId: cogsAccount?.id,
            salesAccountId: salesAccount?.id,
            trackInventory: itemData.type === 'PRODUCT',
            isActive: true,
            createdBy
          }
        })
        itemCount++
      }
    }
    console.log(`✅ Created ${itemCount} new marine items`)
    
    // Summary
    console.log('\n✨ UAE Marine seed completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   🏢 Marine Customers: ${customerCount} new`)
    console.log(`   🔧 Marine Items: ${itemCount} new`)
    console.log('\n💡 You can now:')
    console.log('   - Create quotations for marine customers')
    console.log('   - Generate sales orders for engine parts')
    console.log('   - Track inventory for marine products')
    console.log('   - Invoice for maintenance services')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeder
seedSimpleMarine()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })