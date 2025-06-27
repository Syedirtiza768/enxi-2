#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'
import { QuotationService } from '../lib/services/quotation.service'

const prisma = new PrismaClient()
const quotationService = new QuotationService()

async function createDemoQuotation() {
  try {
    console.log('🚀 Creating demo multi-line quotation...')
    
    // Find a sales case to use
    const salesCase = await prisma.salesCase.findFirst({
      where: { status: 'OPEN' },
      include: { customer: true }
    })
    
    if (!salesCase) {
      console.error('❌ No open sales case found')
      return
    }
    
    console.log(`Using sales case: ${salesCase.caseNumber} for customer: ${salesCase.customer.name}`)
    
    // Create a comprehensive multi-line quotation
    const quotation = await quotationService.createQuotation({
      salesCaseId: salesCase.id,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      paymentTerms: '30 days net',
      deliveryTerms: 'FOB Warehouse',
      notes: 'This quotation is valid for 30 days. Prices are subject to availability.',
      internalNotes: 'Customer requested expedited delivery. Check stock before confirming.',
      items: [
        // Line 1 - IT Equipment
        {
          lineNumber: 1,
          lineDescription: 'IT Equipment & Hardware',
          isLineHeader: true,
          itemType: 'PRODUCT',
          itemCode: 'LAPTOP-PRO-01',
          description: 'Professional Laptop - Intel i7, 32GB RAM, 1TB SSD',
          internalDescription: 'Dell Precision 5570 - Check availability with supplier',
          quantity: 5,
          unitPrice: 2500,
          discount: 10,
          taxRate: 5,
          sortOrder: 1
        },
        {
          lineNumber: 1,
          isLineHeader: false,
          itemType: 'PRODUCT',
          itemCode: 'MONITOR-4K-27',
          description: '27" 4K Professional Monitor',
          internalDescription: 'Dell UltraSharp U2723DE',
          quantity: 5,
          unitPrice: 800,
          discount: 10,
          taxRate: 5,
          sortOrder: 2
        },
        {
          lineNumber: 1,
          isLineHeader: false,
          itemType: 'PRODUCT',
          itemCode: 'DOCK-USB-C',
          description: 'USB-C Docking Station with Power Delivery',
          quantity: 5,
          unitPrice: 300,
          discount: 10,
          taxRate: 5,
          sortOrder: 3
        },
        // Line 2 - Software Licenses
        {
          lineNumber: 2,
          lineDescription: 'Software Licenses & Subscriptions',
          isLineHeader: true,
          itemType: 'SERVICE',
          itemCode: 'LIC-MS365-E3',
          description: 'Microsoft 365 Business Premium - Annual License',
          internalDescription: 'MS Partner Portal - 1 year subscription',
          quantity: 10,
          unitPrice: 360,
          discount: 5,
          taxRate: 5,
          sortOrder: 4
        },
        {
          lineNumber: 2,
          isLineHeader: false,
          itemType: 'SERVICE',
          itemCode: 'LIC-ADOBE-CC',
          description: 'Adobe Creative Cloud - Annual License',
          quantity: 3,
          unitPrice: 600,
          discount: 5,
          taxRate: 5,
          sortOrder: 5
        },
        {
          lineNumber: 2,
          isLineHeader: false,
          itemType: 'SERVICE',
          itemCode: 'LIC-ANTIVIRUS',
          description: 'Enterprise Antivirus Solution - Annual License',
          quantity: 10,
          unitPrice: 50,
          discount: 5,
          taxRate: 5,
          sortOrder: 6
        },
        // Line 3 - Professional Services
        {
          lineNumber: 3,
          lineDescription: 'Implementation & Support Services',
          isLineHeader: true,
          itemType: 'SERVICE',
          itemCode: 'SVC-SETUP',
          description: 'Initial Setup and Configuration',
          internalDescription: 'Allocate 2 engineers for 3 days',
          quantity: 1,
          unitPrice: 3000,
          discount: 0,
          taxRate: 5,
          sortOrder: 7
        },
        {
          lineNumber: 3,
          isLineHeader: false,
          itemType: 'SERVICE',
          itemCode: 'SVC-TRAINING',
          description: 'On-site Training (2 days)',
          internalDescription: 'Training for up to 15 users',
          quantity: 1,
          unitPrice: 2000,
          discount: 0,
          taxRate: 5,
          sortOrder: 8
        },
        {
          lineNumber: 3,
          isLineHeader: false,
          itemType: 'SERVICE',
          itemCode: 'SVC-SUPPORT-ANNUAL',
          description: 'Annual Support Contract (Business Hours)',
          quantity: 1,
          unitPrice: 5000,
          discount: 0,
          taxRate: 5,
          sortOrder: 9
        }
      ],
      createdBy: 'system'
    })
    
    console.log('\n✅ Demo quotation created successfully!')
    console.log(`Quotation Number: ${quotation.quotationNumber}`)
    console.log(`Total Lines: 3`)
    console.log(`Total Items: ${quotation.items.length}`)
    console.log(`Total Amount: ${quotation.totalAmount} ${salesCase.customer.currency}`)
    console.log(`\nView at: http://localhost:3000/quotations/${quotation.id}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDemoQuotation()