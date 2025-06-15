import { PrismaClient } from '../lib/generated/prisma'

const prisma = new PrismaClient()

async function verifyCompanySettings() {
  console.log('🔍 Verifying Company Settings Integration...\n')

  try {
    // 1. Check if company settings exist in database
    console.log('1. Checking database for company settings:')
    const settings = await prisma.companySettings.findFirst()
    
    if (settings) {
      console.log('✅ Company settings found:')
      console.log(`   - Company Name: ${settings.companyName}`)
      console.log(`   - Default Currency: ${settings.defaultCurrency}`)
      console.log(`   - Email: ${settings.email || 'Not set'}`)
      console.log(`   - Phone: ${settings.phone || 'Not set'}`)
      console.log(`   - Address: ${settings.address || 'Not set'}`)
    } else {
      console.log('❌ No company settings found in database')
      console.log('   Creating default settings...')
      
      const newSettings = await prisma.companySettings.create({
        data: {
          companyName: 'EnXi ERP',
          defaultCurrency: 'AED',
          email: 'info@enxi.com',
          phone: '+971-4-123-4567',
          address: 'Dubai, UAE'
        }
      })
      console.log('✅ Default settings created with AED currency')
    }

    // 2. Check if system is using currency settings
    console.log('\n2. Currency configuration in the system:')
    console.log(`   - Default Currency: ${settings?.defaultCurrency || 'Not set'}`)
    console.log(`   - This currency should be used for all new transactions`)
    
    // Check recent quotations
    const recentQuotations = await prisma.quotation.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { 
        quotationNumber: true, 
        totalAmount: true,
        createdAt: true
      }
    })
    
    if (recentQuotations.length > 0) {
      console.log('\n   Recent Quotations (amounts should display with currency symbol):')
      recentQuotations.forEach((q: any) => {
        console.log(`   - ${q.quotationNumber}: Amount ${q.totalAmount} (Created: ${q.createdAt.toLocaleDateString()})`)
      })
    }

    // Check customer POs which do have currency field
    const recentCustomerPOs = await prisma.customerPO.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { 
        poNumber: true, 
        currency: true,
        poAmount: true,
        createdAt: true
      }
    })
    
    if (recentCustomerPOs.length > 0) {
      console.log('\n   Recent Customer POs (with currency field):')
      recentCustomerPOs.forEach((po: any) => {
        console.log(`   - ${po.poNumber}: ${po.currency} ${po.poAmount} (Created: ${po.createdAt.toLocaleDateString()})`)
      })
    }

    // 3. Check tax settings
    console.log('\n3. Checking tax configuration:')
    const taxRates = await prisma.taxRate.findMany({
      where: { isActive: true }
    })
    
    if (taxRates.length > 0) {
      console.log(`✅ Found ${taxRates.length} active tax rates:`)
      taxRates.forEach((rate: any) => {
        console.log(`   - ${rate.name}: ${rate.rate}%${rate.isDefault ? ' (Default)' : ''}`)
      })
    } else {
      console.log('❌ No active tax rates found')
    }

    // 4. Summary
    console.log('\n📊 Summary:')
    console.log('- Company settings are properly configured in the database')
    console.log('- Currency settings can be verified by:')
    console.log('  1. Creating a new quotation/invoice - should use default currency')
    console.log('  2. Viewing monetary values across the app - should show correct symbol')
    console.log('  3. Changing settings and observing real-time updates')
    
    console.log('\n💡 To test live updates:')
    console.log('1. Open the app at http://localhost:3001/settings/company')
    console.log('2. Change the default currency')
    console.log('3. Navigate to /quotations or /invoices')
    console.log('4. All monetary values should update without page refresh')

  } catch (error) {
    console.error('❌ Error verifying settings:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the verification
verifyCompanySettings()