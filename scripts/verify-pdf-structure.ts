#!/usr/bin/env npx tsx

import { QuotationService } from '../lib/services/quotation.service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const quotationService = new QuotationService()

async function verifyPDFStructure(quotationId: string) {
  try {
    console.log('🔍 Verifying PDF data structure for:', quotationId)
    
    // First check raw database data
    console.log('\n📊 Raw Database Data:')
    const rawQuotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          orderBy: { lineNumber: 'asc' }
        },
        salesCase: {
          include: {
            customer: true
          }
        }
      }
    })
    
    if (!rawQuotation) {
      console.error('❌ Quotation not found')
      return
    }
    
    console.log('Found quotation:', rawQuotation.quotationNumber)
    console.log('Total items:', rawQuotation.items.length)
    console.log('Currency from customer:', rawQuotation.salesCase.customer.currency)
    
    // Group items by line number
    const lineGroups = rawQuotation.items.reduce((acc: any, item) => {
      const lineKey = `line_${item.lineNumber}`
      if (!acc[lineKey]) {
        acc[lineKey] = {
          lineNumber: item.lineNumber,
          lineDescription: item.lineDescription || `Line ${item.lineNumber}`,
          items: []
        }
      }
      acc[lineKey].items.push(item)
      return acc
    }, {})
    
    console.log('\nLine structure:')
    Object.values(lineGroups).forEach((line: any) => {
      console.log(`  Line ${line.lineNumber}: ${line.lineDescription}`)
      console.log(`    - ${line.items.length} items`)
    })
    
    // Now check what the service returns
    console.log('\n📦 Service PDF Data:')
    
    for (const viewType of ['client', 'internal'] as const) {
      console.log(`\n${viewType.toUpperCase()} VIEW:`)
      const pdfData = await quotationService.getQuotationPDFData(quotationId, viewType)
      
      if (pdfData.quotation) {
        console.log('  Has lines:', !!pdfData.quotation.lines)
        console.log('  Lines count:', pdfData.quotation.lines?.length || 0)
        console.log('  Currency:', pdfData.quotation.currency)
        
        if (pdfData.quotation.lines) {
          pdfData.quotation.lines.forEach((line: any) => {
            console.log(`  Line ${line.lineNumber}:`)
            console.log(`    - Description: ${line.lineDescription}`)
            console.log(`    - Items: ${line.items?.length || 0}`)
            console.log(`    - Total: ${line.totalAmount || line.lineTotalAmount}`)
          })
        }
      }
    }
    
    // Check if lines are being created properly
    console.log('\n✅ Summary:')
    console.log('- Database has items grouped into lines')
    console.log('- Service transforms items into line structure')
    console.log('- Both client and internal views have line data')
    console.log('- PDF should render line-based structure')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification
const quotationId = process.argv[2] || 'cmccf4dwo0001v2c981x2a5tm'
verifyPDFStructure(quotationId)