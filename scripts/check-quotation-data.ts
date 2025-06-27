#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'
import { QuotationService } from '../lib/services/quotation.service'

const prisma = new PrismaClient()
const quotationService = new QuotationService()

async function checkQuotation(quotationId: string) {
  try {
    console.log('🔍 Checking quotation:', quotationId)
    
    // Get raw data from database
    const rawQuotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
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
    
    console.log('\n📊 Raw Database Data:')
    console.log('Quotation Number:', rawQuotation.quotationNumber)
    console.log('Items Count:', rawQuotation.items.length)
    console.log('Total Amount:', rawQuotation.totalAmount)
    
    if (rawQuotation.items.length > 0) {
      console.log('\n📋 Items:')
      rawQuotation.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`)
        console.log(`    - Line: ${item.lineNumber}`)
        console.log(`    - Description: ${item.description}`)
        console.log(`    - Line Description: ${item.lineDescription || 'N/A'}`)
        console.log(`    - Is Header: ${item.isLineHeader}`)
        console.log(`    - Quantity: ${item.quantity}`)
        console.log(`    - Unit Price: ${item.unitPrice}`)
        console.log(`    - Total: ${item.totalAmount}`)
      })
    }
    
    // Get internal view
    console.log('\n🏢 Internal View:')
    const internalView = await quotationService.getQuotationInternalView(quotationId)
    console.log('Has lines:', !!(internalView as any).lines)
    console.log('Lines count:', (internalView as any).lines?.length || 0)
    console.log('Has items:', !!(internalView as any).items)
    
    if ((internalView as any).lines) {
      console.log('\nLines Structure:')
      ;(internalView as any).lines.forEach((line: any, index: number) => {
        console.log(`  Line ${line.lineNumber}:`)
        console.log(`    - Description: ${line.lineDescription}`)
        console.log(`    - Items Count: ${line.items?.length || 0}`)
        console.log(`    - Line Total: ${line.lineTotalAmount}`)
      })
    }
    
    // Get client view
    console.log('\n👤 Client View:')
    const clientView = await quotationService.getQuotationClientView(quotationId)
    console.log('Has lines:', !!(clientView as any).lines)
    console.log('Lines count:', (clientView as any).lines?.length || 0)
    console.log('Has items:', !!(clientView as any).items)
    console.log('Currency:', (clientView as any).currency)
    
    if ((clientView as any).lines) {
      console.log('\nClient Lines:')
      ;(clientView as any).lines.forEach((line: any, index: number) => {
        console.log(`  Line ${line.lineNumber}:`)
        console.log(`    - Description: ${line.lineDescription}`)
        console.log(`    - Quantity: ${line.quantity}`)
        console.log(`    - Total: ${line.totalAmount}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get quotation ID from command line
const quotationId = process.argv[2]

if (!quotationId) {
  console.error('Please provide a quotation ID')
  console.log('Usage: npx tsx scripts/check-quotation-data.ts <quotation-id>')
  process.exit(1)
}

checkQuotation(quotationId)