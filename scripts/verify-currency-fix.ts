#!/usr/bin/env npx tsx

import { QuotationService } from '../lib/services/quotation.service'
import { CompanySettingsService } from '../lib/services/company-settings.service'
import { PrismaClient } from '@prisma/client'

const quotationService = new QuotationService()
const settingsService = new CompanySettingsService()
const prisma = new PrismaClient()

async function verifyCurrencyFix(quotationId: string) {
  try {
    console.log('🔍 Verifying Currency Fix\n')
    
    // Check company settings
    console.log('1️⃣ Company Settings:')
    const settings = await settingsService.getSettings()
    console.log('   Default Currency:', settings.defaultCurrency)
    console.log('   Company Name:', settings.companyName)
    
    // Check customer currency
    console.log('\n2️⃣ Customer Currency (should not be used):')
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        salesCase: {
          include: {
            customer: true
          }
        }
      }
    })
    console.log('   Customer:', quotation?.salesCase.customer.name)
    console.log('   Customer Currency:', quotation?.salesCase.customer.currency || 'Not set')
    
    // Check quotation views
    console.log('\n3️⃣ Quotation Views (should use company currency):')
    
    // Client view
    const clientView = await quotationService.getQuotationClientView(quotationId)
    console.log('   Client View Currency:', clientView.currency)
    
    // Internal view
    const internalView = await quotationService.getQuotationInternalView(quotationId)
    console.log('   Internal View Currency:', internalView.currency)
    
    // PDF data
    console.log('\n4️⃣ PDF Data:')
    const clientPDF = await quotationService.getQuotationPDFData(quotationId, 'client')
    console.log('   Client PDF Currency:', clientPDF.quotation.currency)
    
    const internalPDF = await quotationService.getQuotationPDFData(quotationId, 'internal')
    console.log('   Internal PDF Currency:', internalPDF.quotation.currency)
    
    console.log('\n✅ Summary:')
    console.log('   Company Default: AED')
    console.log('   All views should show: AED')
    console.log('   Customer currency should be ignored')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification
const quotationId = process.argv[2] || 'cmccf4dwo0001v2c981x2a5tm'
verifyCurrencyFix(quotationId)