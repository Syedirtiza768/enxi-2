import { CompanySettingsService } from '../lib/services/company-settings.service'
import { prisma } from '../lib/db/prisma'

async function testCompanySettingsGLUpdate() {
  try {
    console.log('Testing Company Settings GL Account Update...')
    
    const companySettingsService = new CompanySettingsService()
    
    // Get current settings
    const currentSettings = await companySettingsService.getSettings()
    console.log('\nCurrent Settings:')
    console.log('- Company Name:', currentSettings.companyName)
    console.log('- Default Inventory Account:', currentSettings.defaultInventoryAccountId)
    console.log('- Default COGS Account:', currentSettings.defaultCogsAccountId)
    console.log('- Default Sales Account:', currentSettings.defaultSalesAccountId)
    
    // Get available GL accounts
    const inventoryAccounts = await prisma.account.findMany({
      where: { type: 'ASSET', code: { startsWith: '1' } },
      select: { id: true, code: true, name: true }
    })
    
    const cogsAccounts = await prisma.account.findMany({
      where: { type: 'EXPENSE', code: { startsWith: '5' } },
      select: { id: true, code: true, name: true }
    })
    
    const salesAccounts = await prisma.account.findMany({
      where: { type: 'INCOME', code: { startsWith: '4' } },
      select: { id: true, code: true, name: true }
    })
    
    console.log('\nAvailable Accounts:')
    console.log('Inventory Accounts:', inventoryAccounts.length)
    console.log('COGS Accounts:', cogsAccounts.length)
    console.log('Sales Accounts:', salesAccounts.length)
    
    if (inventoryAccounts.length > 0 && cogsAccounts.length > 0 && salesAccounts.length > 0) {
      // Try to update with GL accounts
      console.log('\n\nAttempting to update GL accounts...')
      
      const updateData = {
        defaultInventoryAccountId: inventoryAccounts[0].id,
        defaultCogsAccountId: cogsAccounts[0].id,
        defaultSalesAccountId: salesAccounts[0].id,
        updatedBy: 'test-script'
      }
      
      console.log('Update data:', updateData)
      
      try {
        const updatedSettings = await companySettingsService.updateSettings(updateData)
        
        console.log('\n✅ Update successful!')
        console.log('Updated Settings:')
        console.log('- Default Inventory Account:', updatedSettings.defaultInventoryAccountId)
        console.log('- Default COGS Account:', updatedSettings.defaultCogsAccountId)
        console.log('- Default Sales Account:', updatedSettings.defaultSalesAccountId)
      } catch (updateError: any) {
        console.error('\n❌ Update failed:', updateError.message)
        console.error('Error details:', updateError)
        
        // Check if it's a database constraint error
        if (updateError.code) {
          console.error('Database error code:', updateError.code)
        }
      }
    } else {
      console.log('\n⚠️  Not enough GL accounts available for testing')
    }
    
    // Test direct database update
    console.log('\n\nTesting direct database update...')
    
    if (inventoryAccounts.length > 0) {
      try {
        const directUpdate = await prisma.companySettings.update({
          where: { id: currentSettings.id },
          data: {
            defaultInventoryAccountId: inventoryAccounts[0].id,
            updatedAt: new Date()
          }
        })
        
        console.log('✅ Direct database update successful')
        console.log('Updated inventory account ID:', directUpdate.defaultInventoryAccountId)
      } catch (dbError: any) {
        console.error('❌ Direct database update failed:', dbError.message)
        console.error('Error details:', dbError)
      }
    }
    
  } catch (error: any) {
    console.error('Test failed:', error.message)
    console.error('Stack trace:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testCompanySettingsGLUpdate()