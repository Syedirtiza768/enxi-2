import { QuotationService } from '../lib/services/quotation.service'

async function debugQuotationStructure() {
  const quotationService = new QuotationService()
  
  // The quotation ID from the URL
  const quotationId = 'cmcd8ugzr0169v2dpq2eipa1v'
  
  try {
    console.log('=== FETCHING INTERNAL VIEW ===')
    const internalView = await quotationService.getQuotationInternalView(quotationId)
    
    console.log('\nStructure:')
    console.log('- Has items:', !!internalView.items)
    console.log('- Has lines:', !!internalView.lines)
    
    if (internalView.lines && Array.isArray(internalView.lines)) {
      console.log('\n=== LINES STRUCTURE ===')
      internalView.lines.forEach((line: any) => {
        console.log(`\nLine ${line.lineNumber}:`)
        console.log('- Line description:', line.lineDescription)
        console.log('- Is line header:', line.isLineHeader)
        console.log('- Number of items:', line.items?.length || 0)
        
        if (line.items && line.items.length > 0) {
          console.log('- First item structure:')
          const firstItem = line.items[0]
          console.log('  - id:', firstItem.id)
          console.log('  - lineNumber:', firstItem.lineNumber)
          console.log('  - isLineHeader:', firstItem.isLineHeader)
          console.log('  - itemCode:', firstItem.itemCode)
          console.log('  - description:', firstItem.description)
          console.log('  - quantity:', firstItem.quantity)
          console.log('  - unitPrice:', firstItem.unitPrice)
        }
      })
    }
    
    // Now test extracting items as the page component does
    console.log('\n=== EXTRACTED ITEMS ===')
    const extractedItems = internalView.lines ? internalView.lines.flatMap((line: any) => line.items || []) : []
    console.log('Total extracted items:', extractedItems.length)
    
    if (extractedItems.length > 0) {
      console.log('\nFirst extracted item:')
      console.log(JSON.stringify(extractedItems[0], null, 2))
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
  
  process.exit(0)
}

debugQuotationStructure()