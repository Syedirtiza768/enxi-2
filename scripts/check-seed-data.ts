import { PrismaClient } from '../lib/generated/prisma'

const prisma = new PrismaClient()

async function checkData() {
  console.log('📊 Checking seeded data...\n')
  
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.item.count(),
    prisma.account.count(),
    prisma.taxRate.count(),
    prisma.location.count(),
    prisma.category.count(),
    prisma.unitOfMeasure.count(),
    prisma.permission.count(),
    prisma.role.count(),
    prisma.companySettings.count()
  ])
  
  console.log('✅ Data Summary:')
  console.log(`   👥 Users: ${counts[0]}`)
  console.log(`   🏢 Customers: ${counts[1]}`)
  console.log(`   📦 Suppliers: ${counts[2]}`)
  console.log(`   🛍️ Items: ${counts[3]}`)
  console.log(`   💰 Accounts: ${counts[4]}`)
  console.log(`   💸 Tax Rates: ${counts[5]}`)
  console.log(`   📍 Locations: ${counts[6]}`)
  console.log(`   📂 Categories: ${counts[7]}`)
  console.log(`   📏 Units of Measure: ${counts[8]}`)
  console.log(`   🔐 Permissions: ${counts[9]}`)
  console.log(`   👔 Roles: ${counts[10]}`)
  console.log(`   ⚙️  Company Settings: ${counts[11]}`)
  
  // Get admin user details
  const admin = await prisma.user.findFirst({
    where: { username: 'admin' }
  })
  
  if (admin) {
    console.log('\n📝 Admin Login:')
    console.log(`   Username: ${admin.username}`)
    console.log(`   Password: demo123`)
  }
  
  await prisma.$disconnect()
}

checkData().catch(console.error)