import { PrismaClient } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'
import { addDays, subDays, startOfMonth, endOfMonth } from 'date-fns'

const prisma = new PrismaClient()

// Constants
const MONTHS_OF_DATA = 24
const BATCH_SIZE = 100

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

async function seedEnhanced() {
  console.log('🌊 Starting Enhanced UAE Marine Seed...')
  
  try {
    // 1. Ensure we have basic data
    await ensureBasicData()
    
    // 2. Create marine-specific customers
    await createMarineCustomers()
    
    // 3. Create marine-specific items
    await createMarineItems()
    
    // 4. Generate business workflow
    await generateBusinessWorkflow()
    
    console.log('✅ Enhanced UAE Marine seed completed successfully!')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function ensureBasicData() {
  console.log('📋 Ensuring basic data exists...')
  
  // Check for admin user
  const adminExists = await prisma.user.findUnique({
    where: { username: 'admin' }
  })
  
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('demo123', 10)
    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@marinepoweruae.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
      }
    })
    console.log('✅ Created admin user')
  }
  
  // Ensure chart of accounts exists
  const accountCount = await prisma.account.count()
  if (accountCount === 0) {
    console.log('⚠️  No chart of accounts found. Please run production seed first.')
    throw new Error('No chart of accounts found')
  }
}

async function createMarineCustomers() {
  console.log('🏢 Creating marine industry customers...')
  
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  const createdBy = admin?.id || 'system'
  
  for (const [index, name] of MARINE_CUSTOMERS.entries()) {
    const email = `contact@${name.toLowerCase().replace(/\s+/g, '')}.ae`
    
    const existing = await prisma.customer.findUnique({
      where: { email }
    })
    
    if (!existing) {
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
    }
  }
  
  console.log('✅ Marine customers created/verified')
}

async function createMarineItems() {
  console.log('🔧 Creating marine items and services...')
  
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  const createdBy = admin?.id || 'system'
  
  // Get or create categories
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
  
  // Get or create units of measure
  let pcsUnit = await prisma.unitOfMeasure.findFirst({ where: { code: 'PCS' } })
  if (!pcsUnit) {
    pcsUnit = await prisma.unitOfMeasure.create({
      data: { code: 'PCS', name: 'Pieces', symbol: 'pcs', isBaseUnit: true, createdBy }
    })
  }
  
  let setUnit = await prisma.unitOfMeasure.findFirst({ where: { code: 'SET' } })
  if (!setUnit) {
    setUnit = await prisma.unitOfMeasure.create({
      data: { code: 'SET', name: 'Set', symbol: 'set', isBaseUnit: true, createdBy }
    })
  }
  
  let hrUnit = await prisma.unitOfMeasure.findFirst({ where: { code: 'HR' } })
  if (!hrUnit) {
    hrUnit = await prisma.unitOfMeasure.create({
      data: { code: 'HR', name: 'Hour', symbol: 'hr', isBaseUnit: true, createdBy }
    })
  }
  
  // Get accounts
  const inventoryAccount = await prisma.account.findFirst({ where: { name: 'Inventory' } })
  const cogsAccount = await prisma.account.findFirst({ where: { name: 'Cost of Goods Sold' } })
  const salesAccount = await prisma.account.findFirst({ where: { name: 'Sales Revenue' } })
  
  if (!inventoryAccount || !cogsAccount || !salesAccount) {
    throw new Error('Required accounts not found')
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
          unitOfMeasureId: itemData.type === 'SERVICE' ? hrUnit.id : (itemData.name.includes('Set') ? setUnit.id : pcsUnit.id),
          standardCost: itemData.price * 0.6,
          listPrice: itemData.price,
          inventoryAccountId: inventoryAccount.id,
          cogsAccountId: cogsAccount.id,
          salesAccountId: salesAccount.id,
          trackInventory: itemData.type === 'PRODUCT',
          isActive: true,
          createdBy
        }
      })
    }
  }
  
  console.log('✅ Marine items created/verified')
}

async function generateBusinessWorkflow() {
  console.log('📊 Generating business workflow data...')
  
  const customers = await prisma.customer.findMany({
    where: { customerNumber: { startsWith: 'MAR-' } }
  })
  
  const items = await prisma.item.findMany({
    where: { code: { startsWith: 'MAR-' } }
  })
  
  const salesReps = await prisma.user.findMany({
    where: { role: 'SALES_REP' }
  })
  
  if (customers.length === 0 || items.length === 0) {
    console.log('⚠️  No marine customers or items found to generate workflow')
    return
  }
  
  if (salesReps.length === 0) {
    // Create a sales rep if none exists
    const hashedPassword = await bcrypt.hash('demo123', 10)
    const salesRep = await prisma.user.create({
      data: {
        username: 'marine.sales',
        email: 'sales@marinepoweruae.com',
        password: hashedPassword,
        role: 'SALES_REP',
        isActive: true,
      }
    })
    salesReps.push(salesRep)
  }
  
  // Generate leads
  console.log('🎯 Generating leads...')
  const leadCount = 50
  for (let i = 0; i < leadCount; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const salesRep = salesReps[Math.floor(Math.random() * salesReps.length)]
    const daysAgo = Math.floor(Math.random() * 730) // Up to 2 years
    
    const contactNames = ['Ahmed', 'John', 'Maria', 'Fatima', 'Robert', 'Sara', 'Ali', 'Emma']
    const surnames = ['Al Rashid', 'Thompson', 'Santos', 'Hassan', 'Mitchell', 'Abdullah', 'Khan', 'Smith']
    
    await prisma.lead.create({
      data: {
        firstName: contactNames[Math.floor(Math.random() * contactNames.length)],
        lastName: surnames[Math.floor(Math.random() * surnames.length)],
        email: `contact${i}@${customer.name.toLowerCase().replace(/\s+/g, '')}.ae`,
        phone: customer.phone || '+971-4-3000000',
        company: customer.name,
        customerId: customer.id,
        source: ['Website', 'Referral', 'Trade Show', 'Cold Call', 'Email Campaign'][Math.floor(Math.random() * 5)],
        status: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'][Math.floor(Math.random() * 5)],
        assignedToId: salesRep.id,
        estimatedValue: Math.floor(Math.random() * 1000000) + 50000,
        notes: `Lead for ${customer.name} - Marine engine maintenance opportunity`,
        createdAt: subDays(new Date(), daysAgo),
        createdBy: salesRep.id
      }
    })
  }
  
  console.log('✅ Business workflow data generated successfully!')
}

// Run the seeder
seedEnhanced()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })