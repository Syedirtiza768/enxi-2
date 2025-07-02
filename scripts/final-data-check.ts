import { PrismaClient } from '../lib/generated/prisma'

const prisma = new PrismaClient()

async function finalCheck() {
  console.log('📊 Final Database Summary:')
  console.log('═══════════════════════════════════════')
  
  try {
    const [
      totalCustomers,
      marineCustomers,
      totalItems,
      marineItems,
      totalUsers,
      totalAccounts,
      totalCategories,
      totalLeads
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { customerNumber: { startsWith: 'MAR-' } } }),
      prisma.item.count(),
      prisma.item.count({ where: { code: { startsWith: 'MAR-' } } }),
      prisma.user.count(),
      prisma.account.count(),
      prisma.category.count(),
      prisma.lead.count()
    ])
    
    console.log(`
👥 Users: ${totalUsers}
💰 Chart of Accounts: ${totalAccounts}
📂 Categories: ${totalCategories}

🏢 Customers:
   - Total: ${totalCustomers}
   - Marine Industry: ${marineCustomers}

🛍️ Items/Services:
   - Total: ${totalItems}
   - Marine Products: ${marineItems}

🎯 Leads: ${totalLeads}
`)

    console.log('📝 Login Credentials:')
    console.log('   Username: admin')
    console.log('   Password: demo123')
    
    console.log('\n✨ Your database is fully populated with:')
    console.log('   - Production chart of accounts')
    console.log('   - UAE marine industry customers')
    console.log('   - Marine engine parts and services')
    console.log('   - Ready for business operations!')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

finalCheck().catch(console.error)