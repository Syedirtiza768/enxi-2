import { prisma } from '@/lib/db/prisma'

async function addCompanySettings() {
  try {
    console.log('Checking for existing company settings...')
    
    const existingSettings = await prisma.companySettings.findFirst()
    
    if (existingSettings) {
      console.log('Company settings already exist:', existingSettings)
      return
    }

    console.log('Creating default company settings...')
    
    const settings = await prisma.companySettings.create({
      data: {
        companyName: 'EnXi ERP',
        defaultCurrency: 'USD',
        isActive: true
      }
    })

    console.log('Company settings created successfully:', settings)
  } catch (error) {
    console.error('Error creating company settings:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
addCompanySettings()