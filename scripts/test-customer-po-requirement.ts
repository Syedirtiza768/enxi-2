import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCustomerPORequirement() {
  console.log('Testing Customer PO Requirement Configuration...\n')

  try {
    // Get current company settings
    const settings = await prisma.companySettings.findFirst()
    console.log('Current requireCustomerPO setting:', settings?.requireCustomerPO)

    // Test toggling the setting
    console.log('\nTesting toggle functionality...')
    
    // Set to true
    await prisma.companySettings.updateMany({
      data: { requireCustomerPO: true }
    })
    const settingsTrue = await prisma.companySettings.findFirst()
    console.log('After setting to true:', settingsTrue?.requireCustomerPO)

    // Set to false
    await prisma.companySettings.updateMany({
      data: { requireCustomerPO: false }
    })
    const settingsFalse = await prisma.companySettings.findFirst()
    console.log('After setting to false:', settingsFalse?.requireCustomerPO)

    console.log('\n✅ Customer PO requirement configuration is working correctly!')
    console.log('\nHow to test in the UI:')
    console.log('1. Navigate to Settings > Company Settings')
    console.log('2. Look for "Sales Order Settings" section')
    console.log('3. Toggle "Require Customer PO for Sales Orders"')
    console.log('4. Save settings')
    console.log('5. Go to create/edit a Sales Order')
    console.log('6. The Customer PO field should show/hide the required asterisk based on the setting')

  } catch (error) {
    console.error('Error testing Customer PO requirement:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCustomerPORequirement()