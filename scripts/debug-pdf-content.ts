#!/usr/bin/env npx tsx

import { QuotationService } from '../lib/services/quotation.service'

const quotationService = new QuotationService()

async function debugPDFContent(quotationId: string) {
  console.log('🔍 Debugging PDF content for:', quotationId)
  
  // Get data for both views
  for (const viewType of ['client', 'internal'] as const) {
    console.log(`\n============ ${viewType.toUpperCase()} VIEW ============`)
    
    const pdfData = await quotationService.getQuotationPDFData(quotationId, viewType)
    
    if (!pdfData.quotation) {
      console.error('❌ No quotation data')
      continue
    }
    
    const q = pdfData.quotation
    
    console.log('\n📋 Basic Info:')
    console.log('  Number:', q.quotationNumber)
    console.log('  Currency:', q.currency)
    console.log('  Status:', q.status)
    console.log('  Total Amount:', q.totalAmount)
    
    console.log('\n📦 Structure:')
    console.log('  Has lines?:', !!q.lines)
    console.log('  Lines count:', q.lines?.length || 0)
    console.log('  Has items?:', !!q.items)
    console.log('  Items count:', q.items?.length || 0)
    
    if (q.lines && q.lines.length > 0) {
      console.log('\n📝 Lines Detail:')
      q.lines.forEach((line: any, idx: number) => {
        console.log(`\n  Line ${line.lineNumber}:`)
        console.log('    Description:', line.lineDescription)
        console.log('    Has items?:', !!line.items)
        console.log('    Item count:', line.items?.length || 0)
        console.log('    Total Amount:', line.totalAmount || line.lineTotalAmount)
        
        if (viewType === 'internal' && line.items) {
          console.log('    Items:')
          line.items.forEach((item: any, i: number) => {
            console.log(`      ${i + 1}. ${item.itemCode} - ${item.description}`)
            console.log(`         Qty: ${item.quantity}, Price: ${item.unitPrice}, Total: ${item.totalAmount}`)
          })
        }
      })
    }
    
    console.log('\n🏢 Customer Info:')
    console.log('  Name:', q.salesCase?.customer?.name)
    console.log('  Email:', q.salesCase?.customer?.email)
    console.log('  Currency:', q.salesCase?.customer?.currency)
  }
}

// Run debug
const quotationId = process.argv[2] || 'cmccf4dwo0001v2c981x2a5tm'
debugPDFContent(quotationId)