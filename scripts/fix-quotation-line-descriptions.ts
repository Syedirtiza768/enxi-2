#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixQuotationLineDescriptions() {
  try {
    console.log('🔧 Fixing quotation line descriptions...')
    
    // Find all quotation items that are line headers without descriptions
    const itemsToFix = await prisma.quotationItem.findMany({
      where: {
        isLineHeader: true,
        OR: [
          { lineDescription: null },
          { lineDescription: '' }
        ]
      },
      include: {
        quotation: true
      }
    })
    
    console.log(`Found ${itemsToFix.length} line headers without descriptions`)
    
    // Group by line type and create appropriate descriptions
    for (const item of itemsToFix) {
      let lineDescription = ''
      
      // Determine line description based on item type and content
      if (item.itemType === 'PRODUCT') {
        lineDescription = 'Products & Equipment'
      } else if (item.itemType === 'SERVICE') {
        lineDescription = 'Professional Services'
      } else {
        lineDescription = 'Line Items'
      }
      
      // Update the line description
      await prisma.quotationItem.update({
        where: { id: item.id },
        data: { lineDescription }
      })
      
      console.log(`✅ Updated ${item.quotation.quotationNumber} - Line ${item.lineNumber}: ${lineDescription}`)
    }
    
    // Special fix for the specific quotation
    const quotationId = 'cmcccsn4n0009v2vx9p6cvrzc'
    const specificItems = await prisma.quotationItem.findMany({
      where: { quotationId },
      orderBy: { sortOrder: 'asc' }
    })
    
    if (specificItems.length > 0) {
      console.log('\n📋 Fixing specific quotation QUOT-2025-0007:')
      
      // Update the first item to have a proper line description
      await prisma.quotationItem.update({
        where: { id: specificItems[0].id },
        data: { 
          lineDescription: 'IT Equipment & Hardware',
          isLineHeader: true
        }
      })
      
      console.log('✅ Updated line description for QUOT-2025-0007')
    }
    
    console.log('\n✨ All line descriptions fixed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixQuotationLineDescriptions()