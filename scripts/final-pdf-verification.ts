#!/usr/bin/env npx tsx

import { QuotationService } from '../lib/services/quotation.service'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotationPDF } from '../lib/pdf/quotation-template'
import { QuotationPDFDebug } from '../lib/pdf/quotation-template-debug'
import fs from 'fs/promises'
import path from 'path'

const quotationService = new QuotationService()

async function finalPDFVerification(quotationId: string) {
  console.log('🔍 Final PDF Verification for:', quotationId)
  
  try {
    // Test both views
    for (const viewType of ['client', 'internal'] as const) {
      console.log(`\n========== ${viewType.toUpperCase()} VIEW ==========`)
      
      // Get PDF data
      const pdfData = await quotationService.getQuotationPDFData(quotationId, viewType)
      
      if (!pdfData.quotation) {
        console.error('❌ No quotation data')
        continue
      }
      
      const q = pdfData.quotation
      
      // Log structure
      console.log('\n📊 Data Structure:')
      console.log('  Quotation Number:', q.quotationNumber)
      console.log('  Currency:', q.currency)
      console.log('  Has lines:', !!q.lines)
      console.log('  Lines count:', q.lines?.length || 0)
      
      if (q.lines) {
        console.log('\n📝 Lines:')
        q.lines.forEach((line: any) => {
          console.log(`  Line ${line.lineNumber}: ${line.lineDescription}`)
          console.log(`    - Items: ${line.items?.length || 0}`)
          console.log(`    - Total: ${line.totalAmount || line.lineTotalAmount}`)
        })
      }
      
      // Generate both PDF versions
      console.log('\n📄 Generating PDFs...')
      
      // 1. Main template
      try {
        const mainPdfBuffer = await renderToBuffer(
          QuotationPDF({
            quotation: q,
            companyInfo: pdfData.companyInfo,
            showLogo: pdfData.showLogo,
            showTaxBreakdown: pdfData.showTaxBreakdown,
            viewType
          })
        )
        
        const mainFilename = `final-main-${q.quotationNumber}-${viewType}.pdf`
        await fs.writeFile(mainFilename, mainPdfBuffer)
        console.log(`  ✅ Main PDF: ${mainFilename} (${(mainPdfBuffer.length / 1024).toFixed(2)} KB)`)
      } catch (error) {
        console.error('  ❌ Main PDF error:', error)
      }
      
      // 2. Debug template
      try {
        const debugPdfBuffer = await renderToBuffer(
          QuotationPDFDebug({
            quotation: q,
            viewType
          })
        )
        
        const debugFilename = `final-debug-${q.quotationNumber}-${viewType}.pdf`
        await fs.writeFile(debugFilename, debugPdfBuffer)
        console.log(`  ✅ Debug PDF: ${debugFilename} (${(debugPdfBuffer.length / 1024).toFixed(2)} KB)`)
      } catch (error) {
        console.error('  ❌ Debug PDF error:', error)
      }
    }
    
    console.log('\n✅ Verification complete!')
    console.log('\nPDFs generated:')
    console.log('  - final-main-QUOT-2025-0008-client.pdf')
    console.log('  - final-main-QUOT-2025-0008-internal.pdf')
    console.log('  - final-debug-QUOT-2025-0008-client.pdf')
    console.log('  - final-debug-QUOT-2025-0008-internal.pdf')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run verification
const quotationId = process.argv[2] || 'cmccf4dwo0001v2c981x2a5tm'
finalPDFVerification(quotationId)