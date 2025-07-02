#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'
import { QuotationService } from '../lib/services/quotation.service'

const prisma = new PrismaClient()
const quotationService = new QuotationService()

async function checkPDFData(quotationId: string) {
  try {
    console.log('🔍 Checking PDF data for quotation:', quotationId)
    
    // Check both views
    for (const viewType of ['client', 'internal'] as const) {
      console.log(`\n📄 ${viewType.toUpperCase()} VIEW PDF DATA:`)
      
      const pdfData = await quotationService.getQuotationPDFData(quotationId, viewType)
      
      if (!pdfData.quotation) {
        console.error('❌ No quotation data returned')
        continue
      }
      
      const { quotation } = pdfData
      
      console.log('Quotation Number:', quotation.quotationNumber)
      console.log('Currency:', quotation.currency)
      console.log('Has lines:', !!quotation.lines)
      console.log('Lines count:', quotation.lines?.length || 0)
      console.log('Has items:', !!quotation.items)
      console.log('Items count:', quotation.items?.length || 0)
      
      if (quotation.lines && quotation.lines.length > 0) {
        console.log('\nLines structure:')
        quotation.lines.forEach((line: any) => {
          console.log(`  Line ${line.lineNumber}:`)
          console.log(`    - Description: ${line.lineDescription}`)
          console.log(`    - Has items: ${!!line.items}`)
          console.log(`    - Items count: ${line.items?.length || 0}`)
          console.log(`    - Total: ${line.totalAmount || line.lineTotalAmount}`)
          
          if (viewType === 'internal' && line.items) {
            line.items.forEach((item: any, idx: number) => {
              console.log(`      Item ${idx + 1}: ${item.itemCode} - ${item.description}`)
            })
          }
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get quotation ID from command line
const quotationId = process.argv[2] || 'cmccf4dwo0001v2c981x2a5tm'

checkPDFData(quotationId)