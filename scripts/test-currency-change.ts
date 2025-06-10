#!/usr/bin/env tsx

import { PrismaClient } from '../lib/generated/prisma/index.js'

const prisma = new PrismaClient()

async function testCurrencyChange() {
  try {
    console.log('🔧 Testing currency change to AED...\n')

    // Check current company settings
    const currentSettings = await prisma.companySettings.findFirst()
    
    if (!currentSettings) {
      console.log('❌ No company settings found. Creating default settings...')
      
      const newSettings = await prisma.companySettings.create({
        data: {
          companyName: 'Enxi ERP',
          defaultCurrency: 'AED'
        }
      })
      
      console.log('✅ Created company settings with AED as default currency')
      console.log('Settings:', newSettings)
    } else {
      console.log('Current settings:')
      console.log(`- Company: ${currentSettings.companyName}`)
      console.log(`- Default Currency: ${currentSettings.defaultCurrency}`)
      
      // Update to AED
      const updatedSettings = await prisma.companySettings.update({
        where: { id: currentSettings.id },
        data: {
          defaultCurrency: 'AED'
        }
      })
      
      console.log('\n✅ Updated default currency to AED')
      console.log('New settings:', updatedSettings)
    }
    
    // Create a test invoice with AED currency
    console.log('\n📝 Creating test invoice with AED...')
    
    // Find a customer
    const customer = await prisma.customer.findFirst()
    
    if (customer) {
      const invoice = await prisma.invoice.create({
        data: {
          customerId: customer.id,
          type: 'SALES',
          status: 'DRAFT',
          currency: 'AED',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          subtotal: 1000,
          taxAmount: 50,
          totalAmount: 1050,
          items: {
            create: [
              {
                description: 'Test Product',
                quantity: 10,
                unitPrice: 100,
                subtotal: 1000,
                taxAmount: 50,
                totalAmount: 1050
              }
            ]
          }
        },
        include: {
          customer: true,
          items: true
        }
      })
      
      console.log(`✅ Created invoice ${invoice.invoiceNumber} with currency: ${invoice.currency}`)
      console.log(`   Total: ${invoice.currency} ${invoice.totalAmount}`)
    }
    
    // Create a test quotation with AED
    console.log('\n📝 Creating test quotation with AED...')
    
    const salesCase = await prisma.salesCase.findFirst()
    
    if (salesCase) {
      const quotation = await prisma.quotation.create({
        data: {
          salesCaseId: salesCase.id,
          status: 'DRAFT',
          currency: 'AED',
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          subtotal: 5000,
          discountAmount: 250,
          taxAmount: 237.50,
          totalAmount: 4987.50,
          items: {
            create: [
              {
                itemCode: 'PROD-001',
                description: 'Premium Product',
                quantity: 5,
                unitPrice: 1000,
                subtotal: 5000,
                discountAmount: 250,
                taxAmount: 237.50,
                totalAmount: 4987.50
              }
            ]
          }
        },
        include: {
          salesCase: {
            include: {
              customer: true
            }
          },
          items: true
        }
      })
      
      console.log(`✅ Created quotation ${quotation.quotationNumber} with currency: ${quotation.currency}`)
      console.log(`   Total: ${quotation.currency} ${quotation.totalAmount}`)
    }
    
    console.log('\n✨ Currency test complete!')
    console.log('\nTo see the changes:')
    console.log('1. Visit http://localhost:3002/settings/company')
    console.log('2. Check that default currency shows AED')
    console.log('3. Visit quotations/invoices pages to see AED formatting')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testCurrencyChange().catch(console.error)