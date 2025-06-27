import { prisma } from '@/lib/db/prisma'
import { TaxType } from '@/lib/types/shared-enums'

async function seedTaxConfiguration(): Promise<User> {
  console.log('🌱 Starting tax configuration seed...')

  try {
    // Check if tax configuration already exists
    const existingCategories = await prisma.taxCategory.count()
    if (existingCategories > 0) {
      console.log('Tax configuration already exists, skipping...')
      return
    }

    // Create default user if doesn't exist
    let systemUser = await prisma.user.findFirst({
      where: { username: 'system' }
    })

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          username: 'system',
          email: 'system@enxi.com',
          password: 'system',
          role: 'SUPER_ADMIN'
        }
      })
    }

    // Create default GL accounts if they don't exist
    const taxCollectedAccount = await prisma.account.findFirst({
      where: { code: '2200' }
    }) || await prisma.account.create({
      data: {
        code: '2200',
        name: 'Sales Tax Payable',
        type: 'LIABILITY',
        currency: 'AED',
        description: 'Sales tax collected from customers',
        status: 'ACTIVE',
        isSystemAccount: true,
        createdBy: systemUser.id
      }
    })

    const taxPaidAccount = await prisma.account.findFirst({
      where: { code: '1250' }
    }) || await prisma.account.create({
      data: {
        code: '1250',
        name: 'Input Tax Credit',
        type: 'ASSET',
        currency: 'AED',
        description: 'Tax paid on purchases',
        status: 'ACTIVE',
        isSystemAccount: true,
        createdBy: systemUser.id
      }
    })

    // Create tax categories
    console.log('Creating tax categories...')
    
    const standardCategory = await prisma.taxCategory.create({
      data: {
        code: 'STANDARD',
        name: 'Standard Tax',
        description: 'Standard tax rates',
        isActive: true,
        isDefault: true,
        createdBy: systemUser.id
      }
    })

    const zeroRatedCategory = await prisma.taxCategory.create({
      data: {
        code: 'ZERO_RATED',
        name: 'Zero Rated',
        description: 'Zero-rated items',
        isActive: true,
        createdBy: systemUser.id
      }
    })

    const exemptCategory = await prisma.taxCategory.create({
      data: {
        code: 'EXEMPT',
        name: 'Tax Exempt',
        description: 'Tax exempt items',
        isActive: true,
        createdBy: systemUser.id
      }
    })

    // Create tax rates
    console.log('Creating tax rates...')

    // UAE VAT 5% - Default
    await prisma.taxRate.create({
      data: {
        code: 'UAE_VAT_5',
        name: 'UAE VAT 5%',
        description: 'Standard UAE VAT rate',
        rate: 5,
        categoryId: standardCategory.id,
        taxType: TaxType.SALES,
        appliesTo: 'ALL',
        isActive: true,
        isDefault: true,
        collectedAccountId: taxCollectedAccount.id,
        paidAccountId: taxPaidAccount.id,
        createdBy: systemUser.id
      }
    })

    // UAE VAT 5% for purchases
    await prisma.taxRate.create({
      data: {
        code: 'UAE_VAT_5_PURCHASE',
        name: 'UAE VAT 5% (Purchase)',
        description: 'UAE VAT on purchases',
        rate: 5,
        categoryId: standardCategory.id,
        taxType: TaxType.PURCHASE,
        appliesTo: 'ALL',
        isActive: true,
        isDefault: true,
        collectedAccountId: taxCollectedAccount.id,
        paidAccountId: taxPaidAccount.id,
        createdBy: systemUser.id
      }
    })

    // Zero rated
    await prisma.taxRate.create({
      data: {
        code: 'UAE_VAT_0',
        name: 'UAE VAT 0%',
        description: 'Zero-rated VAT',
        rate: 0,
        categoryId: zeroRatedCategory.id,
        taxType: TaxType.SALES,
        appliesTo: 'ALL',
        isActive: true,
        collectedAccountId: taxCollectedAccount.id,
        paidAccountId: taxPaidAccount.id,
        createdBy: systemUser.id
      }
    })

    // Tax Exempt
    await prisma.taxRate.create({
      data: {
        code: 'TAX_EXEMPT',
        name: 'Tax Exempt',
        description: 'No tax applicable',
        rate: 0,
        categoryId: exemptCategory.id,
        taxType: TaxType.SALES,
        appliesTo: 'ALL',
        isActive: true,
        createdBy: systemUser.id
      }
    })

    // Update company settings with default tax rate
    const defaultTaxRate = await prisma.taxRate.findFirst({
      where: {
        code: 'UAE_VAT_5',
        isActive: true
      }
    })

    if (defaultTaxRate) {
      await prisma.companySettings.updateMany({
        data: {
          defaultTaxRateId: defaultTaxRate.id,
          taxRegistrationNumber: 'TRN123456789012345' // Example UAE TRN
        }
      })
    }

    console.log('✅ Tax configuration seed completed successfully!')
  } catch (error) {
    console.error('Error seeding tax configuration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed
seedTaxConfiguration()
  .then(() => {
    console.log('Tax configuration seed completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to seed tax configuration:', error)
    process.exit(1)
  })