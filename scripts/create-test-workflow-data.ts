#!/usr/bin/env npx tsx

import { prisma } from '../lib/db/prisma'
import { Role, QuotationStatus, OrderStatus } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'

async function createTestWorkflowData() {
  console.warn('🛠️  Creating test data for sales workflow automation...\n')

  try {
    // Step 1: Ensure we have test inventory items with stock
    console.warn('📦 Setting up inventory items...')
    
    const testCategory = await prisma.category.upsert({
      where: { code: 'TEST-CAT' },
      update: {},
      create: {
        code: 'TEST-CAT',
        name: 'Test Category',
        description: 'Category for workflow testing',
        createdBy: 'system'
      }
    })

    const uom = await prisma.unitOfMeasure.upsert({
      where: { code: 'PCS' },
      update: {},
      create: {
        code: 'PCS',
        name: 'Pieces',
        symbol: 'pcs',
        createdBy: 'system'
      }
    })

    const testItem = await prisma.item.upsert({
      where: { code: 'TEST-ITEM-001' },
      update: {
        standardCost: 50,
        listPrice: 100
      },
      create: {
        code: 'TEST-ITEM-001',
        name: 'Test Widget Pro',
        description: 'Premium test widget for workflow automation',
        categoryId: testCategory.id,
        unitOfMeasureId: uom.id,
        type: 'PRODUCT',
        trackInventory: true,
        reorderPoint: 10,
        maxStockLevel: 200,
        standardCost: 50,
        listPrice: 100,
        isActive: true,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: 'system'
      }
    })

    // Create initial stock lot for the test item
    const lotNumber = `LOT-TEST-${Date.now().toString().slice(-6)}`
    const stockLot = await prisma.stockLot.create({
      data: {
        lotNumber,
        itemId: testItem.id,
        receivedDate: new Date(),
        receivedQty: 100,
        availableQty: 100,
        reservedQty: 0,
        unitCost: 50,
        totalCost: 5000,
        supplier: 'Test Supplier',
        purchaseRef: 'PO-TEST-001',
        createdBy: 'system'
      }
    })

    // Create opening stock movement
    const movementNumber = `MOV-TEST-${Date.now().toString().slice(-6)}`
    const stockMovement = await prisma.stockMovement.create({
      data: {
        movementNumber,
        itemId: testItem.id,
        stockLotId: stockLot.id,
        movementType: 'OPENING',
        movementDate: new Date(),
        quantity: 100,
        unitCost: 50,
        totalCost: 5000,
        unitOfMeasureId: uom.id,
        referenceType: 'OPENING',
        referenceNumber: 'OPENING-BALANCE',
        notes: 'Opening stock for workflow testing',
        createdBy: 'system'
      }
    })

    console.warn(`✅ Created item: ${testItem.code} with ${stockLot.availableQty} units in stock (lot: ${stockLot.lotNumber})`)

    // Step 2: Create a test customer
    console.warn('\n👤 Setting up test customer...')
    
    const testCustomer = await prisma.customer.upsert({
      where: { email: 'workflow-test@example.com' },
      update: {},
      create: {
        customerNumber: 'CUST-WF-001',
        name: 'Workflow Test Customer',
        email: 'workflow-test@example.com',
        phone: '+1-555-WORKFLOW',
        address: '123 Test Street, Workflow City, WF 12345',
        creditLimit: 10000,
        paymentTerms: 30,
        createdBy: 'system'
      }
    })

    console.warn(`✅ Created customer: ${testCustomer.name} (${testCustomer.customerNumber})`)

    // Step 3: Create a sales case
    console.warn('\n📋 Setting up sales case...')
    
    const salesCase = await prisma.salesCase.upsert({
      where: { caseNumber: 'CASE-WF-001' },
      update: {},
      create: {
        caseNumber: 'CASE-WF-001',
        title: 'Workflow Automation Test Case',
        description: 'Test case for automated sales workflow',
        customerId: testCustomer.id,
        status: 'OPEN',
        estimatedValue: 1100,
        assignedTo: 'cmbfhby810000v2toyp296q1c', // admin user
        createdBy: 'system'
      }
    })

    console.warn(`✅ Created sales case: ${salesCase.caseNumber}`)

    // Step 4: Create a quotation
    console.warn('\n💰 Creating quotation...')
    
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: 'QUO-WF-001',
        salesCaseId: salesCase.id,
        status: QuotationStatus.SENT,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        subtotal: 1000,
        taxAmount: 100,
        totalAmount: 1100,
        paymentTerms: 'Net 30',
        deliveryTerms: 'FOB Origin',
        notes: 'Test quotation for workflow automation',
        createdBy: 'system',
        items: {
          create: [
            {
              itemId: testItem.id,
              itemCode: testItem.code,
              description: testItem.description || testItem.name,
              quantity: 10,
              unitPrice: 100,
              discount: 0,
              taxRate: 10,
              subtotal: 1000,
              discountAmount: 0,
              taxAmount: 100,
              totalAmount: 1100,
              sortOrder: 1,
              unitOfMeasureId: uom.id
            }
          ]
        }
      }
    })

    console.warn(`✅ Created quotation: ${quotation.quotationNumber}`)

    // Step 5: Convert quotation to sales order
    console.warn('\n📝 Converting quotation to sales order...')
    
    const orderNumber = `SO-${Date.now().toString().slice(-6)}`
    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber,
        quotationId: quotation.id,
        salesCaseId: salesCase.id,
        status: OrderStatus.PENDING,
        orderDate: new Date(),
        requestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxAmount,
        totalAmount: quotation.totalAmount,
        paymentTerms: quotation.paymentTerms,
        notes: 'Converted from quotation for workflow testing',
        createdBy: 'system',
        items: {
          create: [
            {
              itemId: testItem.id,
              itemCode: testItem.code,
              description: testItem.description || testItem.name,
              quantity: 10,
              unitPrice: 100,
              discount: 0,
              taxRate: 10,
              subtotal: 1000,
              discountAmount: 0,
              taxAmount: 100,
              totalAmount: 1100,
              quantityReserved: 0,
              quantityShipped: 0,
              quantityInvoiced: 0,
              sortOrder: 1,
              unitOfMeasureId: uom.id
            }
          ]
        }
      }
    })

    console.warn(`✅ Created sales order: ${salesOrder.orderNumber}`)

    console.warn('\n🎯 Test Data Creation Complete!')
    console.warn('\n📊 Summary:')
    console.warn(`   • Item: ${testItem.code} (${stockLot.availableQty} units available)`)
    console.warn(`   • Customer: ${testCustomer.name}`)
    console.warn(`   • Sales Case: ${salesCase.caseNumber}`)
    console.warn(`   • Quotation: ${quotation.quotationNumber}`)
    console.warn(`   • Sales Order: ${salesOrder.orderNumber} (Status: ${salesOrder.status})`)

    console.warn('\n🚀 Ready to test workflow automation!')
    console.warn('   Run: npx tsx scripts/test-sales-workflow-automation.ts')

} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

createTestWorkflowData()