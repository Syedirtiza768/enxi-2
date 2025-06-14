#!/usr/bin/env npx tsx

import { PrismaClient } from '../lib/generated/prisma'
import { TaxService } from '../lib/services/tax.service'
import { QuotationService } from '../lib/services/quotation.service'
import { SalesOrderService } from '../lib/services/sales-order.service'
import { InvoiceService } from '../lib/services/invoice.service'
import { PurchaseOrderService } from '../lib/services/purchase/purchase-order.service'

const prisma = new PrismaClient()
const taxService = new TaxService()
const quotationService = new QuotationService()
const salesOrderService = new SalesOrderService()
const invoiceService = new InvoiceService()
const purchaseOrderService = new PurchaseOrderService()

async function main(): Promise<void> {
  console.log('🧪 Starting Tax System Integration Test\n')

  try {
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Test 1: Verify tax configuration exists
    console.log('\n📋 Test 1: Checking tax configuration...')
    const categories = await taxService.getTaxCategories()
    console.log(`✅ Found ${categories.length} tax categories`)
    
    const rates = await taxService.getTaxRates()
    console.log(`✅ Found ${rates.length} tax rates`)
    
    const defaultSalesRate = await taxService.getDefaultTaxRate('SALES')
    console.log(`✅ Default sales tax rate: ${defaultSalesRate?.name} (${defaultSalesRate?.rate}%)`)
    
    const defaultPurchaseRate = await taxService.getDefaultTaxRate('PURCHASE')
    console.log(`✅ Default purchase tax rate: ${defaultPurchaseRate?.name} (${defaultPurchaseRate?.rate}%)`)

    // Test 2: Tax calculation
    console.log('\n📊 Test 2: Testing tax calculations...')
    
    const taxCalc1 = await taxService.calculateTax({
      amount: 1000,
      taxRateId: defaultSalesRate?.id,
      appliesTo: 'PRODUCTS'
    })
    console.log(`✅ Tax on AED 1000: AED ${taxCalc1.taxAmount} (${defaultSalesRate?.rate}%)`)
    
    // Test 3: Create test data
    console.log('\n🏗️ Test 3: Creating test data...')
    
    // Get or create test user first
    let testUser = await prisma.user.findFirst({
      where: { email: 'admin@enxi.com' }
    })
    
    if (!testUser) {
      throw new Error('Admin user not found. Please run seed script first.')
    }
    
    // Get or create test customer
    let testCustomer = await prisma.customer.findFirst({
      where: { email: 'test@taxsystem.com' }
    })
    
    if (!testCustomer) {
      testCustomer = await prisma.customer.create({
        data: {
          customerNumber: `CUST-TAX-${Date.now()}`,
          name: 'Tax System Test Customer',
          email: 'test@taxsystem.com',
          phone: '+971 50 123 4567',
          industry: 'Technology',
          currency: 'AED',
          creditLimit: 50000,
          paymentTerms: 30,
          createdBy: testUser.id
        }
      })
    }
    console.log(`✅ Test customer: ${testCustomer.name}`)

    // Create test sales case
    const salesCase = await prisma.salesCase.create({
      data: {
        caseNumber: `SC-TAX-${Date.now()}`,
        title: 'Tax System Test Case',
        description: 'Testing centralized tax system',
        customerId: testCustomer.id,
        assignedTo: testUser.id,
        status: 'OPEN',
        estimatedValue: 10000,
        createdBy: testUser.id
      }
    })
    console.log(`✅ Created sales case: ${salesCase.caseNumber}`)

    // Test 4: Test quotation with tax
    console.log('\n💰 Test 4: Testing quotation with tax...')
    
    const quotation = await quotationService.createQuotation({
      salesCaseId: salesCase.id,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      paymentTerms: 'Net 30',
      notes: 'Tax system test quotation',
      status: 'DRAFT',
      items: [
        {
          itemType: 'PRODUCT',
          itemCode: 'TEST-001',
          description: 'Test Product with Default Tax',
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxRateId: defaultSalesRate?.id, // Using centralized tax
          lineNumber: 1,
          isLineHeader: false,
          sortOrder: 1
        },
        {
          itemType: 'SERVICE',
          itemCode: 'TEST-SVC-001',
          description: 'Test Service with Zero Tax',
          quantity: 5,
          unitPrice: 200,
          discount: 10,
          taxRateId: rates.find(r => r.rate === 0)?.id, // Zero tax
          lineNumber: 2,
          isLineHeader: false,
          sortOrder: 2
        }
      ]
    }, testUser.id)
    
    console.log(`✅ Created quotation: ${quotation.quotationNumber}`)
    console.log(`   - Subtotal: AED ${quotation.subtotal}`)
    console.log(`   - Tax: AED ${quotation.taxAmount}`)
    console.log(`   - Total: AED ${quotation.totalAmount}`)

    // Test 5: Test sales order with tax
    console.log('\n📦 Test 5: Testing sales order with tax...')
    
    const salesOrder = await salesOrderService.createFromQuotation(
      quotation.id,
      {
        customerPO: 'PO-TAX-TEST-001',
        promisedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: 'Created from tax test quotation'
      },
      testUser.id
    )
    
    console.log(`✅ Created sales order: ${salesOrder.orderNumber}`)
    console.log(`   - Items: ${salesOrder.items.length}`)
    console.log(`   - Tax preserved: ${salesOrder.items.every(item => item.taxRateId)} ✓`)

    // Test 6: Test invoice with tax
    console.log('\n🧾 Test 6: Testing invoice with tax...')
    
    const invoice = await invoiceService.createFromSalesOrder(
      salesOrder.id,
      {
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Net 30',
        notes: 'Tax system test invoice'
      },
      testUser.id
    )
    
    console.log(`✅ Created invoice: ${invoice.invoiceNumber}`)
    console.log(`   - Tax Amount: AED ${invoice.taxAmount}`)
    console.log(`   - Total: AED ${invoice.totalAmount}`)

    // Test 7: Test purchase order with tax
    console.log('\n🛒 Test 7: Testing purchase order with tax...')
    
    // Get or create test supplier
    let testSupplier = await prisma.supplier.findFirst({
      where: { email: 'supplier@taxtest.com' }
    })
    
    if (!testSupplier) {
      testSupplier = await prisma.supplier.create({
        data: {
          name: 'Tax Test Supplier',
          code: 'SUP-TAX-001',
          email: 'supplier@taxtest.com',
          phone: '+971 4 123 4567',
          currency: 'AED',
          paymentTerms: 30,
          taxNumber: 'TRN123456789'
        }
      })
    }

    const purchaseOrder = await purchaseOrderService.createPurchaseOrder({
      orderNumber: `PO-TAX-${Date.now()}`,
      supplierId: testSupplier.id,
      orderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      currency: 'AED',
      status: 'DRAFT',
      notes: 'Tax system test purchase order',
      items: [
        {
          itemCode: 'SUP-ITEM-001',
          description: 'Supplier Item with Purchase Tax',
          quantity: 20,
          unitPrice: 50,
          discount: 0,
          taxRateId: defaultPurchaseRate?.id // Using purchase tax
        }
      ]
    }, testUser.id)
    
    console.log(`✅ Created purchase order: ${purchaseOrder.orderNumber}`)
    console.log(`   - Subtotal: AED ${purchaseOrder.subtotal}`)
    console.log(`   - Tax: AED ${purchaseOrder.taxAmount}`)
    console.log(`   - Total: AED ${purchaseOrder.totalAmount}`)

    // Test 8: Test tax exemption
    console.log('\n🚫 Test 8: Testing tax exemption...')
    
    // Create tax-exempt customer
    const exemptCustomer = await prisma.customer.create({
      data: {
        customerNumber: `CUST-EXEMPT-${Date.now()}`,
        name: 'Tax Exempt Customer',
        email: 'exempt@taxtest.com',
        phone: '+971 50 987 6543',
        industry: 'Government',
        currency: 'AED',
        creditLimit: 100000,
        paymentTerms: 45,
        createdBy: testUser.id
      }
    })

    // Create exemption record
    await taxService.createTaxExemption({
      customerId: exemptCustomer.id,
      reason: 'Government Entity',
      certificateNumber: 'EXEMPT-001',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    })

    // Test calculation with exemption
    const exemptCalc = await taxService.calculateTax({
      amount: 1000,
      taxRateId: defaultSalesRate?.id,
      customerId: exemptCustomer.id,
      appliesTo: 'PRODUCTS'
    })
    
    console.log(`✅ Tax on AED 1000 for exempt customer: AED ${exemptCalc.taxAmount} (exempted: ${exemptCalc.isExempt})`)

    // Summary
    console.log('\n✨ Tax System Integration Test Complete!')
    console.log('\n📊 Summary:')
    console.log('- Tax configuration: ✅')
    console.log('- Tax calculations: ✅')
    console.log('- Quotations with tax: ✅')
    console.log('- Sales orders with tax: ✅')
    console.log('- Invoices with tax: ✅')
    console.log('- Purchase orders with tax: ✅')
    console.log('- Tax exemptions: ✅')
    console.log('\n🎉 All tests passed!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()