#!/usr/bin/env npx tsx

import { renderToBuffer } from '@react-pdf/renderer'
import { QuotationPDF } from '../lib/pdf/quotation-template'
import { QuotationService } from '../lib/services/quotation.service'
import fs from 'fs/promises'
import path from 'path'

const quotationService = new QuotationService()

async function testPDFGeneration(quotationId: string) {
  try {
    console.log('🧪 Testing PDF generation for quotation:', quotationId)
    
    // Test both views
    for (const viewType of ['client', 'internal'] as const) {
      console.log(`\n📄 Generating ${viewType.toUpperCase()} view PDF...`)
      
      // Get PDF data
      const pdfData = await quotationService.getQuotationPDFData(quotationId, viewType)
      
      if (!pdfData.quotation) {
        console.error('❌ No quotation data returned')
        continue
      }
      
      console.log('Quotation data:', {
        number: pdfData.quotation.quotationNumber,
        currency: pdfData.quotation.currency,
        hasLines: !!pdfData.quotation.lines,
        linesCount: pdfData.quotation.lines?.length,
        viewType
      })
      
      try {
        // Generate PDF
        const pdfBuffer = await renderToBuffer(
          QuotationPDF({
            quotation: pdfData.quotation,
            companyInfo: pdfData.companyInfo,
            showLogo: pdfData.showLogo,
            showTaxBreakdown: pdfData.showTaxBreakdown,
            viewType
          })
        )
        
        // Save to file for inspection
        const filename = `test-${pdfData.quotation.quotationNumber}-${viewType}.pdf`
        const filepath = path.join(process.cwd(), filename)
        await fs.writeFile(filepath, pdfBuffer)
        
        console.log(`✅ PDF generated successfully: ${filename}`)
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
testPDFGeneration(quotationId)