#!/usr/bin/env npx tsx

import { renderToBuffer } from '@react-pdf/renderer'
import { QuotationPDFDebug } from '../lib/pdf/quotation-template-debug'
import { QuotationService } from '../lib/services/quotation.service'
import fs from 'fs/promises'
import path from 'path'

const quotationService = new QuotationService()

async function testDebugPDF(quotationId: string) {
  try {
    console.log('🧪 Testing debug PDF generation for quotation:', quotationId)
    
    // Test both views
    for (const viewType of ['client', 'internal'] as const) {
      console.log(`\n📄 Generating ${viewType.toUpperCase()} view debug PDF...`)
      
      // Get PDF data
      const pdfData = await quotationService.getQuotationPDFData(quotationId, viewType)
      
      if (!pdfData.quotation) {
        console.error('❌ No quotation data returned')
        continue
      }
      
      console.log('PDF Data:', {
        number: pdfData.quotation.quotationNumber,
        currency: pdfData.quotation.currency,
        hasLines: !!pdfData.quotation.lines,
        linesCount: pdfData.quotation.lines?.length,
        viewType
      })
      
      try {
        // Generate debug PDF
        const pdfBuffer = await renderToBuffer(
          QuotationPDFDebug({
            quotation: pdfData.quotation,
            viewType
          })
        )
        
        // Save to file for inspection
        const filename = `test-debug-${pdfData.quotation.quotationNumber}-${viewType}.pdf`
        const filepath = path.join(process.cwd(), filename)
        await fs.writeFile(filepath, pdfBuffer)
        
        console.log(`✅ Debug PDF generated successfully: ${filename}`)
        console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`)
        console.log(`   Path: ${filepath}`)
        
      } catch (pdfError) {
        console.error('❌ PDF generation error:', pdfError)
        if (pdfError instanceof Error) {
          console.error('   Stack:', pdfError.stack)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run test
const quotationId = process.argv[2] || 'cmccf4dwo0001v2c981x2a5tm'
testDebugPDF(quotationId)