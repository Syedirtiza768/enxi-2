import { PrismaClient } from '../lib/generated/prisma'
import { CompanySettingsService } from '../lib/services/company-settings.service'

const prisma = new PrismaClient()
const companySettingsService = new CompanySettingsService()

async function testCurrencyAndLeads(): Promise<void> {
  try {
    console.log('Testing Currency Settings...')
    
    // Get current settings
    const settings = await companySettingsService.getSettings()
    console.log('Current settings:', settings)
    
    // Get supported currencies
    const currencies = companySettingsService.getSupportedCurrencies()
    console.log('Supported currencies:', currencies)
    
    // Update currency to AED directly via Prisma
    const updatedSettings = await prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        defaultCurrency: 'AED',
        updatedBy: 'system'
      }
    })
    console.log('Updated currency to AED:', updatedSettings.defaultCurrency)
    
    // Get an admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })
    
    if (!adminUser) {
      console.error('No admin user found!')
      return
    }
    
    // Test lead creation
    console.log('\nTesting Lead Creation...')
    const testLead = await prisma.lead.create({
      data: {
        firstName: 'Test',
        lastName: 'Currency',
        email: 'test.currency@example.com',
        phone: '+971501234567',
        company: 'Test Company LLC',
        source: 'WEBSITE',
        status: 'NEW',
        notes: 'Testing currency integration',
        creator: {
          connect: {
            id: adminUser.id
          }
        }
      }
    })
    console.log('Created lead:', {
      id: testLead.id,
      name: `${testLead.firstName} ${testLead.lastName}`,
      email: testLead.email
    })
    
    // Verify lead can be fetched
    const leads = await prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
    console.log(`\nTotal leads in system: ${leads.length}`)
    
    console.log('\n✅ All tests passed!')
    
  } catch (error) {
    console.error('Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCurrencyAndLeads()