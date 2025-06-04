#!/usr/bin/env tsx

/**
 * Create test invoices for testing the invoice-payment workflow
 */

import { PrismaClient } from '@/lib/generated/prisma'

async function createTestInvoices() {
  console.log('🚀 Creating test invoices...\n')
  
  const prisma = new PrismaClient()
  
  try {
    // 1. Get customers and items
    const customers = await prisma.customer.findMany({
      take: 3
    })
    
    const items = await prisma.item.findMany({
      where: { isActive: true },
      take: 5
    })
    
    if (customers.length === 0) {
      console.error('❌ No customers found. Please run a seed script first.')
      return
    }
    
    if (items.length === 0) {
      console.error('❌ No items found. Please run a seed script first.')
      return
    }
    
    console.log(`📋 Found ${customers.length} customers and ${items.length} items`)
    
    // 2. Create test invoices
    const invoicesToCreate = [
      {
        customer: customers[0],
        items: items.slice(0, 2),
        status: 'SENT' as const,
        description: 'Test invoice for laptop and monitor'
      },
      {
        customer: customers[1] || customers[0],
        items: items.slice(2, 4),
        status: 'DRAFT' as const,
        description: 'Draft invoice for materials'
      },
      {
        customer: customers[2] || customers[0],
        items: items.slice(0, 3),
        status: 'SENT' as const,
        description: 'Mixed items invoice'
      }
    ]
    
    console.log(`\n📄 Creating ${invoicesToCreate.length} test invoices...`)
    
    for (let i = 0; i < invoicesToCreate.length; i++) {
      const invoiceData = invoicesToCreate[i]
      
      // Calculate invoice items
      const invoiceItems = invoiceData.items.map((item, index) => {
        const quantity = index + 1
        const unitPrice = item.listPrice
        const discount = index === 0 ? 5 : 0 // 5% discount on first item
        const taxRate = 10 // 10% tax
        
        const subtotal = quantity * unitPrice
        const discountAmount = subtotal * (discount / 100)
        const taxableAmount = subtotal - discountAmount
        const taxAmount = taxableAmount * (taxRate / 100)
        const totalAmount = taxableAmount + taxAmount
        
        return {
          itemId: item.id,
          itemCode: item.code,
          description: item.name,
          quantity,
          unitPrice,
          discount,
          taxRate,
          subtotal,
          discountAmount,
          taxAmount,
          totalAmount
        }
      })
      
      // Calculate invoice totals
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0)
      const discountAmount = invoiceItems.reduce((sum, item) => sum + item.discountAmount, 0)
      const taxAmount = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0)
      const totalAmount = invoiceItems.reduce((sum, item) => sum + item.totalAmount, 0)
      
      // Generate invoice number
      const timestamp = Date.now()
      const invoiceNumber = `INV-${timestamp}-${i + 1}`
      
      // Create invoice dates
      const invoiceDate = new Date()
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30) // 30 days from now
      
      try {
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            customerId: invoiceData.customer.id,
            type: 'SALES',
            status: invoiceData.status,
            invoiceDate,
            dueDate,
            paymentTerms: 'Net 30',
            billingAddress: `${invoiceData.customer.name}\n123 Business St\nCity, State 12345`,
            notes: `${invoiceData.description}\n\nThis is a test invoice created for integration testing.`,
            subtotal,
            discountAmount,
            taxAmount,
            totalAmount,
            paidAmount: 0,
            balanceAmount: totalAmount,
            createdBy: 'test-script',
            items: {
              create: invoiceItems
            }
          },
          include: {
            customer: true,
            items: true
          }
        })
        
        console.log(`✅ Invoice ${i + 1} created:`)
        console.log(`   - Number: ${invoice.invoiceNumber}`)
        console.log(`   - Customer: ${invoice.customer.name}`)
        console.log(`   - Status: ${invoice.status}`)
        console.log(`   - Items: ${invoice.items.length}`)
        console.log(`   - Total: $${invoice.totalAmount.toFixed(2)}`)
        
      } catch (error) {
        console.error(`❌ Failed to create invoice ${i + 1}:`, error.message)
      }
    }
    
    // 3. Summary
    console.log('\n📊 Invoice Creation Summary:')
    const createdInvoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        items: true
      }
    })
    
    console.log(`✅ Total invoices in system: ${createdInvoices.length}`)
    
    if (createdInvoices.length > 0) {
      const totalValue = createdInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
      const unpaidValue = createdInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0)
      
      console.log(`💰 Total invoice value: $${totalValue.toFixed(2)}`)
      console.log(`💳 Unpaid balance: $${unpaidValue.toFixed(2)}`)
      
      console.log('\n📋 Invoice Breakdown:')
      createdInvoices.forEach((invoice, index) => {
        console.log(`   ${index + 1}. ${invoice.invoiceNumber}: ${invoice.customer.name} - $${invoice.totalAmount.toFixed(2)} (${invoice.status})`)
      })
      
      console.log('\n🎉 Test invoices created successfully!')
      console.log('\n🔗 Next steps:')
      console.log('1. Run: npm run dev')
      console.log('2. Navigate to: http://localhost:3000/invoices')
      console.log('3. Test the invoice-payment workflow')
      console.log('4. Record payments for invoices')
    }
    
  } catch (error) {
    console.error('❌ Error creating test invoices:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestInvoices()