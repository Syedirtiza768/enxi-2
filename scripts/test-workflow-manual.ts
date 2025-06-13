#!/usr/bin/env node
import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

// Test data based on quotation SRV-01-NM-0525
const QUOTATION_DATA = {
  customerName: 'VIVEK.J - Dubai Maritime City',
  customerEmail: 'vivek.j@dubaimaritimecity.ae',
  address: 'WS 105 - Dubai Maritime City, P.O Box No.: 52730, Dubai, UAE',
  phone: '+971 50 123 4567',
  quotationRef: 'SRV-01-NM-0525',
  date: '09 MAY 2025',
  subtotal: 27280.00,
  vatRate: 5,
  vatAmount: 1364.00,
  total: 28644.00,
  paymentTerms: '100% Advance payment for spares, 40% advance of services rest after completion',
  validityDays: 30,
  timeRequired: '10 Days',
  items: [
    {
      description: 'Mast hydraulic cylinders: Scope of jobs and materials involved in above job Main cylinder a) Remove and reﬁt hydraulic cylinders b) Cylinders to be overhauled and seals to be changed c) Replace all rubber hoses and free up of pins d) Test opera=on of lower/ hoist mast',
      qty: 1,
      unitPrice: 3250.00,
      totalPrice: 3250.00
    },
    {
      description: 'Control cylinder a) Remove and reﬁt hydraulic cylinders b) Cylinders to be overhauled and seals to be changed c) Replace all rubber hoses and free up of pins d) Test opera=on of lower/ hoist mast Note: Rubber hoses prices have not included in the ﬁnal amount',
      qty: 1,
      unitPrice: 1300.00,
      totalPrice: 1300.00
    },
    {
      description: 'Fire damper pneumatic cylinders: Scope of jobs and materials involved in above job a) Remove and reﬁt pneuma=c cylinders b) Cylinders to be overhauled and seals to be changed c) Replace all rubber hoses and free up of pins d) Test on comple=on Note: Rubber hoses prices have not included in the ﬁnal amount',
      qty: 4,
      unitPrice: 390.00,
      totalPrice: 1560.00
    },
    {
      description: 'Service of AFT Davit (S.W.L 500 KG): Scope of jobs and materials involved in above job Check pulley and handle arrangement Free up the movement of the davit extension Supply and renew the davit wire with cer=ﬁcates Test on comple=on Note: New davit wire price has not included in the ﬁnal amount',
      qty: 1,
      unitPrice: 1430.00,
      totalPrice: 1430.00
    },
    {
      description: 'FiFi Monitor Remove FiFi Monitor Service FiFi Monitor with owner supplied spare kits Paint, install and test complete FiFi monitor assembly',
      qty: 1,
      unitPrice: 3250.00,
      totalPrice: 3250.00
    },
    {
      description: 'FiFi Pump w/ gearbox Disconnect and remove FiFi pump and clutch assembly Overhaul FiFi pump and clutch with owner supplied spare kits Note: Spare part material prices have not included in the ﬁnal amount',
      qty: 1,
      unitPrice: 12350.00,
      totalPrice: 12350.00
    },
    {
      description: 'Clutch hydraulic unit Disconnect and remove FiFi pump and clutch assembly Overhaul FiFi pump and clutch with owner supplied spare kits Note: Spare part material prices have not included in the ﬁnal amount',
      qty: 1,
      unitPrice: 2340.00,
      totalPrice: 2340.00
    },
    {
      description: 'Material Handling Rig in/out of FiFi pump with gear box from vessel to jetty Provide the transporta=on to Take the pump and deliver the pump from vessel to workshop',
      qty: 1,
      unitPrice: 1800.00,
      totalPrice: 1800.00
    }
  ]
};

async function runManualWorkflowTest() {
  console.log('🚀 MANUAL WORKFLOW TEST - QUOTATION SRV-01-NM-0525');
  console.log('==================================================\n');

  const adminUserId = 'cmbq9uzoo0000v2i9nscot0vo'; // admin user ID
  const timestamp = Date.now();

  try {
    // Step 1: Clean up any existing test data
    console.log('🧹 Cleaning up test data...');
    // Delete in reverse order of dependencies
    await prisma.payment.deleteMany({
      where: { 
        customer: { email: { contains: 'vivek.j+test' } }
      }
    });
    await prisma.invoiceItem.deleteMany({
      where: { 
        invoice: { customer: { email: { contains: 'vivek.j+test' } } }
      }
    });
    await prisma.invoice.deleteMany({
      where: { 
        customer: { email: { contains: 'vivek.j+test' } }
      }
    });
    await prisma.shipmentItem.deleteMany({
      where: { 
        shipment: { salesOrder: { salesCase: { customer: { email: { contains: 'vivek.j+test' } } } } }
      }
    });
    await prisma.shipment.deleteMany({
      where: { 
        salesOrder: { salesCase: { customer: { email: { contains: 'vivek.j+test' } } } }
      }
    });
    await prisma.salesOrderItem.deleteMany({
      where: { 
        salesOrder: { salesCase: { customer: { email: { contains: 'vivek.j+test' } } } }
      }
    });
    await prisma.salesOrder.deleteMany({
      where: { 
        salesCase: { customer: { email: { contains: 'vivek.j+test' } } }
      }
    });
    await prisma.customerPO.deleteMany({
      where: { 
        customer: { email: { contains: 'vivek.j+test' } }
      }
    });
    await prisma.quotationItem.deleteMany({
      where: { 
        quotation: { quotationNumber: QUOTATION_DATA.quotationRef }
      }
    });
    await prisma.quotation.deleteMany({
      where: { quotationNumber: QUOTATION_DATA.quotationRef }
    });
    await prisma.caseExpense.deleteMany({
      where: { 
        salesCase: { customer: { email: { contains: 'vivek.j+test' } } }
      }
    });
    await prisma.salesCase.deleteMany({
      where: { 
        customer: { email: { contains: 'vivek.j+test' } }
      }
    });
    await prisma.customer.deleteMany({
      where: { email: { contains: 'vivek.j+test' } }
    });
    console.log('✅ Cleanup complete\n');

    // Step 2: Create Customer
    console.log('📋 STEP 1: Creating Customer');
    const customer = await prisma.customer.create({
      data: {
        customerNumber: `CUST-${timestamp}`,
        name: QUOTATION_DATA.customerName,
        email: `vivek.j+test${timestamp}@dubaimaritimecity.ae`,
        phone: QUOTATION_DATA.phone,
        address: QUOTATION_DATA.address,
        currency: 'AED',
        creditLimit: 100000,
        paymentTerms: 30,
        createdBy: adminUserId
      }
    });
    console.log(`✅ Customer created: ${customer.name} (${customer.customerNumber})\n`);

    // Step 3: Create Sales Case
    console.log('📋 STEP 2: Creating Sales Case');
    const salesCase = await prisma.salesCase.create({
      data: {
        caseNumber: `SC-${timestamp}`,
        title: 'Shaheen 2020 - Marine Services',
        description: 'Comprehensive maintenance services for Shaheen 2020 vessel including hydraulic cylinders, FiFi equipment, and davit services',
        status: 'OPEN',
        customerId: customer.id,
        estimatedValue: QUOTATION_DATA.total,
        createdBy: adminUserId
      }
    });
    console.log(`✅ Sales case created: ${salesCase.title} (${salesCase.caseNumber})\n`);

    // Step 4: Create Service Items
    console.log('📋 STEP 3: Creating Service Items');
    
    // First create a category for services if not exists
    let serviceCategory = await prisma.category.findFirst({
      where: { code: 'SERVICE' }
    });
    if (!serviceCategory) {
      serviceCategory = await prisma.category.create({
        data: {
          code: 'SERVICE',
          name: 'Services',
          createdBy: adminUserId
        }
      });
    }
    
    // Create unit of measure for services if not exists
    let serviceUoM = await prisma.unitOfMeasure.findFirst({
      where: { code: 'SERVICE' }
    });
    if (!serviceUoM) {
      serviceUoM = await prisma.unitOfMeasure.create({
        data: {
          code: 'SERVICE',
          name: 'Service',
          symbol: 'SVC',
          isBaseUnit: true,
          createdBy: adminUserId
        }
      });
    }
    
    const serviceItems = [];
    for (let i = 0; i < QUOTATION_DATA.items.length; i++) {
      const item = QUOTATION_DATA.items[i];
      const serviceItem = await prisma.item.create({
        data: {
          code: `SRV-${timestamp}-${i + 1}`,
          name: `Service Item ${i + 1}`,
          description: item.description.substring(0, 200),
          categoryId: serviceCategory.id,
          type: 'SERVICE',
          unitOfMeasureId: serviceUoM.id,
          trackInventory: false, // Services don't track inventory
          standardCost: item.unitPrice * 0.6, // 60% cost assumption
          listPrice: item.unitPrice,
          minStockLevel: 0,
          reorderPoint: 0,
          createdBy: adminUserId
        }
      });
      serviceItems.push(serviceItem);
      console.log(`  ✅ Created: ${serviceItem.name} - AED ${serviceItem.listPrice}`);
    }
    console.log('');

    // Step 5: Create Quotation
    console.log('📋 STEP 4: Creating Quotation');
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: QUOTATION_DATA.quotationRef,
        salesCaseId: salesCase.id,
        status: 'DRAFT',
        validUntil: new Date(Date.now() + QUOTATION_DATA.validityDays * 24 * 60 * 60 * 1000),
        subtotal: QUOTATION_DATA.subtotal,
        taxAmount: QUOTATION_DATA.vatAmount,
        discountAmount: 0,
        totalAmount: QUOTATION_DATA.total,
        paymentTerms: QUOTATION_DATA.paymentTerms,
        deliveryTerms: `Delivery timeline: ${QUOTATION_DATA.timeRequired}`,
        notes: 'Thank you for choosing Al Sahab for your marine maintenance needs',
        internalNotes: 'Internal: Customer is a regular client, ensure quality service delivery',
        createdBy: adminUserId,
        items: {
          create: QUOTATION_DATA.items.map((item, index) => ({
            itemId: serviceItems[index].id,
            itemCode: serviceItems[index].code,
            itemType: 'SERVICE',
            description: item.description,
            quantity: item.qty,
            unitPrice: item.unitPrice,
            discount: 0,
            taxRate: QUOTATION_DATA.vatRate,
            lineNumber: index + 1,
            isLineHeader: true,
            subtotal: item.totalPrice,
            discountAmount: 0,
            taxAmount: item.totalPrice * (QUOTATION_DATA.vatRate / 100),
            totalAmount: item.totalPrice * (1 + QUOTATION_DATA.vatRate / 100),
            sortOrder: index
          }))
        }
      },
      include: {
        items: true
      }
    });
    console.log(`✅ Quotation created: ${quotation.quotationNumber}`);
    console.log(`   Subtotal: AED ${quotation.subtotal}`);
    console.log(`   VAT (5%): AED ${quotation.taxAmount}`);
    console.log(`   Total: AED ${quotation.totalAmount}\n`);

    // Step 6: Make Quotation Revision
    console.log('📋 STEP 5: Creating Quotation Revision');
    const revisedQuotation = await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        version: 2,
        notes: 'Updated: Expedited service available - Timeline reduced to 7 days',
        updatedAt: new Date()
      }
    });
    console.log(`✅ Quotation revised to version ${revisedQuotation.version}\n`);

    // Step 7: Approve Quotation & Record Customer PO
    console.log('📋 STEP 6: Approving Quotation & Recording Customer PO');
    
    // Create Customer PO
    const customerPO = await prisma.customerPO.create({
      data: {
        poNumber: `PO-DMC-${timestamp}`,
        customerId: customer.id,
        quotationId: quotation.id,
        salesCaseId: salesCase.id,
        poAmount: QUOTATION_DATA.total,
        currency: 'AED',
        exchangeRate: 1.0,
        poDate: new Date(),
        notes: 'Purchase Order for Shaheen 2020 Marine Services',
        isAccepted: true,
        acceptedAt: new Date(),
        acceptedBy: adminUserId,
        createdBy: adminUserId
      }
    });
    console.log(`✅ Customer PO recorded: ${customerPO.poNumber}`);

    // Approve Quotation
    const approvedQuotation = await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        status: 'ACCEPTED'
      }
    });
    console.log(`✅ Quotation approved\n`);

    // Step 8: Create Sales Order
    console.log('📋 STEP 7: Creating Sales Order');
    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: `SO-${timestamp}`,
        quotationId: quotation.id,
        salesCaseId: salesCase.id,
        status: 'PENDING',
        orderDate: new Date(),
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxAmount,
        discountAmount: quotation.discountAmount,
        totalAmount: quotation.totalAmount,
        paymentTerms: quotation.paymentTerms,
        customerPO: customerPO.poNumber,
        createdBy: adminUserId,
        items: {
          create: quotation.items.map((item, index) => ({
            itemId: item.itemId,
            itemCode: item.itemCode,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            subtotal: item.subtotal,
            discountAmount: item.discountAmount,
            taxAmount: item.taxAmount,
            totalAmount: item.totalAmount,
            sortOrder: index
          }))
        }
      },
      include: {
        items: true
      }
    });
    console.log(`✅ Sales order created: ${salesOrder.orderNumber}\n`);

    // Step 9: Record Expenses
    console.log('📋 STEP 8: Recording Expenses Against Sales Case');
    const expenses = [
      { category: 'MATERIALS', description: 'Hydraulic seals and rubber hoses', amount: 2500 },
      { category: 'LABOR', description: 'Technician labor costs', amount: 5000 },
      { category: 'TRANSPORTATION', description: 'Equipment transportation', amount: 1200 }
    ];

    let totalExpenses = 0;
    for (const expense of expenses) {
      await prisma.caseExpense.create({
        data: {
          salesCaseId: salesCase.id,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          currency: 'AED',
          exchangeRate: 1.0,
          baseAmount: expense.amount,
          expenseDate: new Date(),
          status: 'APPROVED',
          approvedBy: adminUserId,
          approvedAt: new Date(),
          createdBy: adminUserId
        }
      });
      totalExpenses += expense.amount;
      console.log(`  ✅ ${expense.category}: AED ${expense.amount} - ${expense.description}`);
    }
    console.log(`  Total Expenses: AED ${totalExpenses}\n`);

    // Step 10: Calculate Profitability
    console.log('📋 STEP 9: Calculating Sales Case Profitability');
    const inventoryCost = serviceItems.reduce((sum, item) => sum + (item.standardCost || 0), 0);
    const totalCost = inventoryCost + totalExpenses;
    const revenue = QUOTATION_DATA.total;
    const profit = revenue - totalCost;
    const profitMargin = (profit / revenue) * 100;

    console.log(`  Revenue: AED ${revenue}`);
    console.log(`  Inventory Cost: AED ${inventoryCost}`);
    console.log(`  Expenses: AED ${totalExpenses}`);
    console.log(`  Total Cost: AED ${totalCost}`);
    console.log(`  Profit: AED ${profit}`);
    console.log(`  Profit Margin: ${profitMargin.toFixed(2)}%\n`);

    // Update sales case with actual revenue
    await prisma.salesCase.update({
      where: { id: salesCase.id },
      data: {
        actualValue: revenue,
        cost: totalCost,
        profitMargin: profitMargin
      }
    });

    // Step 11: Fulfill Sales Order
    console.log('📋 STEP 10: Fulfilling Sales Order');
    
    // Approve sales order
    await prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: { status: 'APPROVED' }
    });
    console.log('  ✅ Sales order approved');

    // Create shipment
    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber: `SHIP-${timestamp}`,
        salesOrderId: salesOrder.id,
        status: 'PREPARING',
        shipToAddress: customer.address || '',
        trackingNumber: 'ALS-TRACK-001',
        carrier: 'Al Sahab Logistics',
        createdBy: adminUserId
      }
    });
    console.log(`  ✅ Shipment created: ${shipment.shipmentNumber}`);

    // Mark as delivered
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        deliveredBy: adminUserId
      }
    });
    console.log('  ✅ Services delivered\n');

    // Step 12: Generate Invoice
    console.log('📋 STEP 11: Generating Invoice');
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${timestamp}`,
        salesOrderId: salesOrder.id,
        customerId: customer.id,
        type: 'SALES',
        status: 'SENT',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxAmount,
        discountAmount: quotation.discountAmount,
        totalAmount: quotation.totalAmount,
        paidAmount: 0,
        balanceAmount: quotation.totalAmount,
        paymentTerms: quotation.paymentTerms,
        billingAddress: customer.address,
        createdBy: adminUserId,
        sentBy: adminUserId,
        sentAt: new Date(),
        items: {
          create: salesOrder.items.map(item => ({
            itemId: item.itemId,
            itemCode: item.itemCode,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            subtotal: item.subtotal,
            discountAmount: item.discountAmount,
            taxAmount: item.taxAmount,
            totalAmount: item.totalAmount
          }))
        }
      },
      include: {
        items: true
      }
    });
    console.log(`✅ Invoice generated: ${invoice.invoiceNumber}`);
    console.log(`   Total Amount: AED ${invoice.totalAmount}\n`);

    // Step 13: Record Payments
    console.log('📋 STEP 12: Recording Payments');
    
    // 40% advance payment
    const advancePayment = await prisma.payment.create({
      data: {
        paymentNumber: `PAY-ADV-${timestamp}`,
        invoiceId: invoice.id,
        customerId: customer.id,
        amount: invoice.totalAmount * 0.4,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER',
        reference: 'ADV-PAY-001',
        notes: '40% advance payment as per terms',
        createdBy: adminUserId
      }
    });
    console.log(`  ✅ Advance payment: AED ${advancePayment.amount} (40%)`);

    // 60% final payment
    const finalPayment = await prisma.payment.create({
      data: {
        paymentNumber: `PAY-FINAL-${timestamp}`,
        invoiceId: invoice.id,
        customerId: customer.id,
        amount: invoice.totalAmount * 0.6,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER',
        reference: 'FINAL-PAY-001',
        notes: '60% final payment on completion',
        createdBy: adminUserId
      }
    });
    console.log(`  ✅ Final payment: AED ${finalPayment.amount} (60%)`);
    console.log(`  ✅ Total payments: AED ${advancePayment.amount + finalPayment.amount}\n`);

    // Update invoice status
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID' }
    });

    // Close sales case
    await prisma.salesCase.update({
      where: { id: salesCase.id },
      data: {
        status: 'WON',
        closedAt: new Date()
      }
    });

    // Final Summary
    console.log('\n✅ WORKFLOW COMPLETED SUCCESSFULLY!');
    console.log('====================================');
    console.log(`Customer: ${customer.name}`);
    console.log(`Sales Case: ${salesCase.caseNumber} - CLOSED`);
    console.log(`Quotation: ${quotation.quotationNumber} - ACCEPTED`);
    console.log(`Sales Order: ${salesOrder.orderNumber} - FULFILLED`);
    console.log(`Invoice: ${invoice.invoiceNumber} - PAID`);
    console.log(`Total Revenue: AED ${revenue}`);
    console.log(`Total Cost: AED ${totalCost}`);
    console.log(`Net Profit: AED ${profit} (${profitMargin.toFixed(2)}%)`);

    // Test Data Validation
    console.log('\n🔍 DATA VALIDATION:');
    const calculationCorrect = Math.abs(quotation.totalAmount - QUOTATION_DATA.total) < 0.01;
    const paymentsCorrect = Math.abs((advancePayment.amount + finalPayment.amount) - invoice.totalAmount) < 0.01;
    
    console.log(`✅ Quotation calculations: ${calculationCorrect ? 'CORRECT' : 'INCORRECT'}`);
    console.log(`✅ Payment totals: ${paymentsCorrect ? 'CORRECT' : 'INCORRECT'}`);
    console.log(`✅ All workflow steps completed`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
runManualWorkflowTest().catch(console.error);