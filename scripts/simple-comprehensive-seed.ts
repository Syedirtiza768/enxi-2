#!/usr/bin/env npx tsx

import { PrismaClient } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.warn('🌱 Starting Simple Comprehensive Seed...\n')

  try {
    // Step 1: Create admin user
    console.warn('👥 Creating admin user...')
    const hashedPassword = await bcrypt.hash('demo123', 10)
    
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@enxi-erp.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    })
    console.warn('✅ Admin user created')

    // Step 2: Create basic chart of accounts
    console.warn('💰 Creating chart of accounts...')
    const cash = await prisma.account.create({
      data: {
        code: '1000',
        name: 'Cash',
        type: 'ASSET',
        description: 'Cash and cash equivalents',
        isActive: true,
        createdBy: admin.id
      }
    })

    const accountsReceivable = await prisma.account.create({
      data: {
        code: '1200',
        name: 'Accounts Receivable',
        type: 'ASSET',
        description: 'Customer receivables',
        isActive: true,
        createdBy: admin.id
      }
    })

    const inventory = await prisma.account.create({
      data: {
        code: '1300',
        name: 'Inventory',
        type: 'ASSET',
        description: 'Inventory assets',
        isActive: true,
        createdBy: admin.id
      }
    })

    const salesRevenue = await prisma.account.create({
      data: {
        code: '4000',
        name: 'Sales Revenue',
        type: 'INCOME',
        description: 'Revenue from sales',
        isActive: true,
        createdBy: admin.id
      }
    })

    const cogs = await prisma.account.create({
      data: {
        code: '5000',
        name: 'Cost of Goods Sold',
        type: 'EXPENSE',
        description: 'Direct cost of goods sold',
        isActive: true,
        createdBy: admin.id
      }
    })
    console.warn('✅ Chart of accounts created')

    // Step 3: Create customers
    console.warn('🏢 Creating customers...')
    const customer1 = await prisma.customer.create({
      data: {
        customerNumber: 'CUST-001',
        name: 'TechCorp Solutions',
        email: 'info@techcorp.com',
        phone: '+1 (555) 123-4567',
        industry: 'Technology',
        creditLimit: 100000,
        paymentTerms: 30,
        currency: 'USD',
        status: 'ACTIVE',
        createdBy: admin.id,
        account: {
          create: {
            code: '1200-001',
            name: 'AR - TechCorp Solutions',
            type: 'ASSET',
            parentId: accountsReceivable.id,
            currency: 'USD',
            description: 'Accounts Receivable for TechCorp Solutions',
            isActive: true,
            createdBy: admin.id
          }
        }
      },
      include: { account: true }
    })

    const customer2 = await prisma.customer.create({
      data: {
        customerNumber: 'CUST-002',
        name: 'Global Retail Inc',
        email: 'orders@globalretail.com',
        phone: '+1 (555) 987-6543',
        industry: 'Retail',
        creditLimit: 250000,
        paymentTerms: 45,
        currency: 'USD',
        status: 'ACTIVE',
        createdBy: admin.id,
        account: {
          create: {
            code: '1200-002',
            name: 'AR - Global Retail Inc',
            type: 'ASSET',
            parentId: accountsReceivable.id,
            currency: 'USD',
            description: 'Accounts Receivable for Global Retail Inc',
            isActive: true,
            createdBy: admin.id
          }
        }
      },
      include: { account: true }
    })
    console.warn('✅ Customers created with AR accounts')

    // Step 4: Create inventory items
    console.warn('📦 Creating inventory items...')
    const pieces = await prisma.unitOfMeasure.create({
      data: {
        code: 'PCS',
        name: 'Pieces',
        symbol: 'pcs',
        isBaseUnit: true,
        createdBy: admin.id
      }
    })

    const category = await prisma.category.create({
      data: {
        code: 'ELEC',
        name: 'Electronics',
        description: 'Electronic products',
        createdBy: admin.id
      }
    })

    const laptop = await prisma.item.create({
      data: {
        code: 'LAP-001',
        name: 'Business Laptop',
        description: 'High-performance business laptop',
        categoryId: category.id,
        type: 'PRODUCT',
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderPoint: 20,
        standardCost: 800,
        listPrice: 1200,
        inventoryAccountId: inventory.id,
        cogsAccountId: cogs.id,
        salesAccountId: salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: admin.id
      }
    })

    const mouse = await prisma.item.create({
      data: {
        code: 'MSE-001',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        categoryId: category.id,
        type: 'PRODUCT',
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 50,
        maxStockLevel: 500,
        reorderPoint: 100,
        standardCost: 20,
        listPrice: 35,
        inventoryAccountId: inventory.id,
        cogsAccountId: cogs.id,
        salesAccountId: salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: admin.id
      }
    })
    console.warn('✅ Inventory items created')

    // Step 5: Create opening stock
    console.warn('📊 Creating opening stock...')
    await prisma.stockMovement.create({
      data: {
        movementNumber: 'OPEN-001',
        itemId: laptop.id,
        movementType: 'OPENING',
        movementDate: new Date('2024-01-01'),
        quantity: 50,
        unitCost: 800,
        totalCost: 40000,
        unitOfMeasureId: pieces.id,
        notes: 'Opening stock balance',
        createdBy: admin.id,
        stockLot: {
          create: {
            lotNumber: 'LOT-LAP-001',
            itemId: laptop.id,
            receivedDate: new Date('2024-01-01'),
            receivedQty: 50,
            availableQty: 50,
            unitCost: 800,
            totalCost: 40000,
            createdBy: admin.id
          }
        }
      }
    })

    await prisma.stockMovement.create({
      data: {
        movementNumber: 'OPEN-002',
        itemId: mouse.id,
        movementType: 'OPENING',
        movementDate: new Date('2024-01-01'),
        quantity: 200,
        unitCost: 20,
        totalCost: 4000,
        unitOfMeasureId: pieces.id,
        notes: 'Opening stock balance',
        createdBy: admin.id,
        stockLot: {
          create: {
            lotNumber: 'LOT-MSE-001',
            itemId: mouse.id,
            receivedDate: new Date('2024-01-01'),
            receivedQty: 200,
            availableQty: 200,
            unitCost: 20,
            totalCost: 4000,
            createdBy: admin.id
          }
        }
      }
    })
    console.warn('✅ Opening stock created')

    // Step 6: Create a sales case
    console.warn('💼 Creating sales case...')
    const salesCase = await prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-001',
        title: 'TechCorp Office Equipment',
        description: 'Office equipment upgrade for TechCorp',
        customerId: customer1.id,
        estimatedValue: 50000,
        actualValue: 0,
        cost: 0,
        profitMargin: 0,
        probability: 80,
        expectedCloseDate: new Date('2024-03-31'),
        status: 'OPEN',
        assignedTo: admin.id,
        createdBy: admin.id
      }
    })
    console.warn('✅ Sales case created')

    // Step 7: Create quotation
    console.warn('📋 Creating quotation...')
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: 'Q-2024-001',
        customerId: customer1.id,
        salesCaseId: salesCase.id,
        createdBy: admin.id
      }
    })

    await prisma.quotationVersion.create({
      data: {
        quotationId: quotation.id,
        versionNumber: 1,
        date: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: 'USD',
        exchangeRate: 1,
        paymentTerms: '30 days net',
        deliveryTerms: 'FOB Warehouse',
        notes: 'Enterprise pricing',
        termsAndConditions: 'Standard terms apply',
        status: 'DRAFT',
        isCurrent: true,
        createdBy: admin.id,
        items: {
          create: [
            {
              itemId: laptop.id,
              description: 'Business Laptop - Enterprise configuration',
              quantity: 20,
              unitPrice: 1100,
              discountPercent: 8.33,
              taxRate: 10,
              sortOrder: 1
            },
            {
              itemId: mouse.id,
              description: 'Wireless Mouse - Included with laptop',
              quantity: 20,
              unitPrice: 30,
              discountPercent: 14.29,
              taxRate: 10,
              sortOrder: 2
            }
          ]
        }
      }
    })
    console.warn('✅ Quotation created')

    // Step 8: Create sales order
    console.warn('📝 Creating sales order...')
    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: 'SO-2024-001',
        quotationId: quotation.id,
        customerId: customer1.id,
        orderDate: new Date(),
        requestedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        currency: 'USD',
        exchangeRate: 1.0,
        paymentTerms: 'Net 30',
        billingAddress: 'TechCorp Solutions\\n123 Business Ave\\nSan Francisco, CA 94105',
        shippingAddress: 'TechCorp Solutions\\n123 Business Ave\\nSan Francisco, CA 94105',
        status: 'APPROVED',
        notes: 'Standard delivery',
        approvedBy: admin.id,
        approvedAt: new Date(),
        createdBy: admin.id
      }
    })

    await Promise.all([
      prisma.salesOrderItem.create({
        data: {
          salesOrderId: salesOrder.id,
          itemId: laptop.id,
          itemCode: laptop.code,
          description: 'Business Laptop - Enterprise configuration',
          quantity: 20,
          unitPrice: 1100,
          discount: 8.33,
          taxRate: 10,
          sortOrder: 1
        }
      }),
      prisma.salesOrderItem.create({
        data: {
          salesOrderId: salesOrder.id,
          itemId: mouse.id,
          itemCode: mouse.code,
          description: 'Wireless Mouse - Included with laptop',
          quantity: 20,
          unitPrice: 30,
          discount: 14.29,
          taxRate: 10,
          sortOrder: 2
        }
      })
    ])
    console.warn('✅ Sales order created')

    // Step 9: Create invoice
    console.warn('🧾 Creating invoice...')
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2024-001',
        salesOrderId: salesOrder.id,
        customerId: customer1.id,
        type: 'SALES',
        status: 'SENT',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: 22600,
        taxAmount: 2060,
        discountAmount: 1900,
        totalAmount: 22760,
        balanceAmount: 22760,
        paidAmount: 0,
        paymentTerms: 'Net 30',
        billingAddress: 'TechCorp Solutions\\n123 Business Ave\\nSan Francisco, CA 94105',
        notes: 'Thank you for your business',
        sentBy: admin.id,
        sentAt: new Date(),
        createdBy: admin.id
      }
    })

    await Promise.all([
      prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          itemId: laptop.id,
          itemCode: laptop.code,
          description: 'Business Laptop - Enterprise configuration',
          quantity: 20,
          unitPrice: 1100,
          discount: 8.33,
          taxRate: 10,
          subtotal: 22000,
          discountAmount: 1833.33,
          taxAmount: 2016.67,
          totalAmount: 22183.34
        }
      }),
      prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          itemId: mouse.id,
          itemCode: mouse.code,
          description: 'Wireless Mouse - Included with laptop',
          quantity: 20,
          unitPrice: 30,
          discount: 14.29,
          taxRate: 10,
          subtotal: 600,
          discountAmount: 85.71,
          taxAmount: 51.43,
          totalAmount: 565.72
        }
      })
    ])
    console.warn('✅ Invoice created')

    // Step 10: Create payment
    console.warn('💳 Creating payment...')
    const payment = await prisma.payment.create({
      data: {
        paymentNumber: 'PAY-2024-001',
        invoiceId: invoice.id,
        customerId: customer1.id,
        amount: 22760,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER',
        reference: 'Wire-123456',
        notes: 'Payment in full',
        createdBy: admin.id
      }
    })

    // Update invoice to paid
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: 22760,
        balanceAmount: 0,
        status: 'PAID',
        paidAt: new Date()
      }
    })
    console.warn('✅ Payment created and invoice marked as paid')

    // Final summary
    console.warn('\n' + '='.repeat(60))
    console.warn('📊 SEED SUMMARY')
    console.warn('='.repeat(60))

    const counts = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.customer.count(),
      prisma.item.count(),
      prisma.salesCase.count(),
      prisma.quotation.count(),
      prisma.salesOrder.count(),
      prisma.invoice.count(),
      prisma.payment.count(),
      prisma.stockMovement.count()
    ])

    console.warn('\n📈 DATA CREATED:')
    console.warn(`   👥 Users: ${counts[0]}`)
    console.warn(`   💰 Accounts: ${counts[1]}`)
    console.warn(`   🏢 Customers: ${counts[2]}`)
    console.warn(`   📦 Items: ${counts[3]}`)
    console.warn(`   💼 Sales Cases: ${counts[4]}`)
    console.warn(`   📋 Quotations: ${counts[5]}`)
    console.warn(`   📝 Sales Orders: ${counts[6]}`)
    console.warn(`   🧾 Invoices: ${counts[7]}`)
    console.warn(`   💳 Payments: ${counts[8]}`)
    console.warn(`   📊 Stock Movements: ${counts[9]}`)

    console.warn('\n🔑 LOGIN CREDENTIALS:')
    console.warn('   Username: admin')
    console.warn('   Password: demo123')

    console.warn('\n🎉 Comprehensive seed completed successfully!')
    console.warn('🚀 Ready to test the complete ERP workflow!')

} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })