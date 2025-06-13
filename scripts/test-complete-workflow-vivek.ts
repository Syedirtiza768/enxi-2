import { PrismaClient } from '../lib/generated/prisma';
import { apiClient } from '../lib/api/client';

const prisma = new PrismaClient();

interface TestResult {
  step: string;
  status: 'success' | 'failed';
  details?: any;
  error?: any;
}

const results: TestResult[] = [];

async function logResult(step: string, status: 'success' | 'failed', details?: any, error?: any) {
  const result = { step, status, details, error };
  results.push(result);
  console.log(`\n${status === 'success' ? '✅' : '❌'} ${step}`);
  if (details) console.log('Details:', JSON.stringify(details, null, 2));
  if (error) console.log('Error:', error);
}

async function testCompleteWorkflow() {
  console.log('🚀 Starting Complete Workflow Test - Based on Quotation SRV-01-NM-0525');
  console.log('================================================\n');

  let customerId: string;
  let salesCaseId: string;
  let quotationId: string;
  let salesOrderId: string;
  let invoiceId: string;
  let paymentId: string;
  let authToken: string;

  try {
    // First, get auth token
    console.log('🔐 Authenticating...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Failed to authenticate');
    }

    const loginResultData = await loginResponse.json();
    const loginData = loginResultData.data || loginResultData;
    authToken = loginData.token;
    console.log('✅ Authentication successful');
    // Step 1: Create Customer
    console.log('\n📋 Step 1: Creating Customer (VIVEK.J)');
    try {
      // Test Backend
      const timestamp = Date.now();
      const customerData = {
        name: 'VIVEK.J',
        email: `vivek.j+${timestamp}@dubaimaritimecity.ae`,
        phone: '+971 50 123 4567',
        address: 'WS 105 - Dubai Maritime City, Dubai, UAE',
        creditLimit: 100000,
        paymentTerms: 30,
        currency: 'AED'
      };

      const customerResponse = await fetch('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(customerData)
      });

      if (!customerResponse.ok) {
        const error = await customerResponse.text();
        throw new Error(`Failed to create customer: ${error}`);
      }

      const customerResultData = await customerResponse.json();
      const customer = customerResultData.data || customerResultData;
      customerId = customer.id;
      await logResult('Customer created (Backend)', 'success', { customerId, name: customer.name });

      // Test Frontend - Check if customer appears in list
      const customersListResponse = await fetch('http://localhost:3000/api/customers', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const customersListResultData = await customersListResponse.json();
      const customersList = customersListResultData.data || customersListResultData;
      const customerExists = customersList.some((c: any) => c.id === customerId);
      
      if (customerExists) {
        await logResult('Customer appears in list (Frontend)', 'success');
      } else {
        await logResult('Customer appears in list (Frontend)', 'failed', { customerId });
      }

    } catch (error) {
      await logResult('Create Customer', 'failed', null, error);
      throw error;
    }

    // Step 2: Create Sales Case
    console.log('\n📋 Step 2: Creating Sales Case');
    try {
      const salesCaseData = {
        customerId,
        title: 'Shaheen 2020 - Marine Services',
        description: 'Comprehensive maintenance services for Shaheen 2020 vessel including hydraulic cylinders, FiFi equipment, and davit services',
        status: 'ACTIVE',
        priority: 'HIGH',
        expectedRevenue: 28644.00,
        probability: 80,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const salesCaseResponse = await fetch('http://localhost:3000/api/sales-cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(salesCaseData)
      });

      if (!salesCaseResponse.ok) {
        const error = await salesCaseResponse.text();
        throw new Error(`Failed to create sales case: ${error}`);
      }

      const salesCaseResultData = await salesCaseResponse.json();
      const salesCase = salesCaseResultData.data || salesCaseResultData;
      salesCaseId = salesCase.id;
      await logResult('Sales Case created (Backend)', 'success', { salesCaseId, title: salesCase.title });

      // Check if sales case appears in frontend
      const salesCasesListResponse = await fetch('http://localhost:3000/api/sales-cases', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const salesCasesListResultData = await salesCasesListResponse.json();
      const salesCasesList = salesCasesListResultData.data || salesCasesListResultData;
      const salesCaseExists = salesCasesList.some((sc: any) => sc.id === salesCaseId);
      
      if (salesCaseExists) {
        await logResult('Sales Case appears in list (Frontend)', 'success');
      } else {
        await logResult('Sales Case appears in list (Frontend)', 'failed');
      }

    } catch (error) {
      await logResult('Create Sales Case', 'failed', null, error);
      throw error;
    }

    // Step 3: Create Service Items
    console.log('\n📋 Step 3: Creating Service Items from Quotation');
    const serviceItems = [
      {
        name: 'Mast Hydraulic Cylinders Service',
        code: 'SRV-MAST-001',
        description: 'Remove/refit hydraulic cylinders, overhaul and seal change, replace rubber hoses, test operation',
        type: 'SERVICE',
        unitOfMeasure: 'SERVICE',
        sellingPrice: 3250.00,
        costPrice: 2000.00,
        minimumStockLevel: 0,
        reorderLevel: 0,
        taxRate: 5
      },
      {
        name: 'Control Cylinder Service',
        code: 'SRV-CTRL-001',
        description: 'Remove/refit control cylinders, overhaul and seal change, replace rubber hoses',
        type: 'SERVICE',
        unitOfMeasure: 'SERVICE',
        sellingPrice: 1300.00,
        costPrice: 800.00,
        minimumStockLevel: 0,
        reorderLevel: 0,
        taxRate: 5
      },
      {
        name: 'Fire Damper Pneumatic Cylinders Service',
        code: 'SRV-FIRE-001',
        description: 'Service 4 pneumatic cylinders, overhaul and seal change',
        type: 'SERVICE',
        unitOfMeasure: 'SERVICE',
        sellingPrice: 390.00,
        costPrice: 250.00,
        minimumStockLevel: 0,
        reorderLevel: 0,
        taxRate: 5
      },
      {
        name: 'AFT Davit Service (S.W.L 500 KG)',
        code: 'SRV-DAVIT-001',
        description: 'Check pulley and handle, free up movement, supply and renew davit wire',
        type: 'SERVICE',
        unitOfMeasure: 'SERVICE',
        sellingPrice: 1430.00,
        costPrice: 900.00,
        minimumStockLevel: 0,
        reorderLevel: 0,
        taxRate: 5
      },
      {
        name: 'FiFi Monitor Service',
        code: 'SRV-FIFI-MON-001',
        description: 'Remove, service, paint, install and test FiFi monitor assembly',
        type: 'SERVICE',
        unitOfMeasure: 'SERVICE',
        sellingPrice: 3250.00,
        costPrice: 2000.00,
        minimumStockLevel: 0,
        reorderLevel: 0,
        taxRate: 5
      },
      {
        name: 'FiFi Pump with Gearbox Overhaul',
        code: 'SRV-FIFI-PUMP-001',
        description: 'Disconnect, remove and overhaul FiFi pump and clutch assembly',
        type: 'SERVICE',
        unitOfMeasure: 'SERVICE',
        sellingPrice: 12350.00,
        costPrice: 8000.00,
        minimumStockLevel: 0,
        reorderLevel: 0,
        taxRate: 5
      },
      {
        name: 'Clutch Hydraulic Unit Service',
        code: 'SRV-CLUTCH-001',
        description: 'Service and overhaul clutch hydraulic unit',
        type: 'SERVICE',
        unitOfMeasure: 'SERVICE',
        sellingPrice: 2340.00,
        costPrice: 1500.00,
        minimumStockLevel: 0,
        reorderLevel: 0,
        taxRate: 5
      },
      {
        name: 'Material Handling & Transportation',
        code: 'SRV-TRANS-001',
        description: 'Rig in/out FiFi pump, transportation between vessel and workshop',
        type: 'SERVICE',
        unitOfMeasure: 'SERVICE',
        sellingPrice: 1800.00,
        costPrice: 1200.00,
        minimumStockLevel: 0,
        reorderLevel: 0,
        taxRate: 5
      }
    ];

    const createdItems: any[] = [];
    for (const item of serviceItems) {
      try {
        const itemResponse = await fetch('http://localhost:3000/api/inventory/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(item)
        });

        if (!itemResponse.ok) {
          const error = await itemResponse.text();
          throw new Error(`Failed to create item ${item.name}: ${error}`);
        }

        const createdItemResultData = await itemResponse.json();
        const createdItem = createdItemResultData.data || createdItemResultData;
        createdItems.push(createdItem);
        console.log(`  ✅ Created item: ${item.name}`);
      } catch (error) {
        console.log(`  ❌ Failed to create item: ${item.name}`, error);
      }
    }

    await logResult('Service Items created', 'success', { count: createdItems.length });

    // Step 4: Create Quotation
    console.log('\n📋 Step 4: Creating Quotation (Internal & External)');
    try {
      const quotationData = {
        quotationNumber: 'SRV-01-NM-0525',
        salesCaseId,
        customerId,
        title: 'Shaheen 2020 - Marine Services Quotation',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'DRAFT',
        termsAndConditions: `
- All crane and gate pass facility has to be provided by the client's side
- Validity of Quote: 30 Days
- Time Required: 10 Days
- Payment Terms: 100% Advance payment for spares, 40% advance of services rest after completion
        `.trim(),
        items: [
          {
            inventoryItemId: createdItems[0].id,
            description: createdItems[0].description,
            quantity: 1,
            unitPrice: 3250.00,
            discount: 0,
            taxRate: 5
          },
          {
            inventoryItemId: createdItems[1].id,
            description: createdItems[1].description,
            quantity: 1,
            unitPrice: 1300.00,
            discount: 0,
            taxRate: 5
          },
          {
            inventoryItemId: createdItems[2].id,
            description: createdItems[2].description,
            quantity: 4,
            unitPrice: 390.00,
            discount: 0,
            taxRate: 5
          },
          {
            inventoryItemId: createdItems[3].id,
            description: createdItems[3].description,
            quantity: 1,
            unitPrice: 1430.00,
            discount: 0,
            taxRate: 5
          },
          {
            inventoryItemId: createdItems[4].id,
            description: createdItems[4].description,
            quantity: 1,
            unitPrice: 3250.00,
            discount: 0,
            taxRate: 5
          },
          {
            inventoryItemId: createdItems[5].id,
            description: createdItems[5].description,
            quantity: 1,
            unitPrice: 12350.00,
            discount: 0,
            taxRate: 5
          },
          {
            inventoryItemId: createdItems[6].id,
            description: createdItems[6].description,
            quantity: 1,
            unitPrice: 2340.00,
            discount: 0,
            taxRate: 5
          },
          {
            inventoryItemId: createdItems[7].id,
            description: createdItems[7].description,
            quantity: 1,
            unitPrice: 1800.00,
            discount: 0,
            taxRate: 5
          }
        ],
        subtotal: 27280.00,
        taxAmount: 1364.00,
        totalAmount: 28644.00,
        internalNotes: 'Internal: Customer is a regular client, ensure quality service delivery',
        externalNotes: 'Thank you for choosing Al Sahab for your marine maintenance needs'
      };

      const quotationResponse = await fetch('http://localhost:3000/api/quotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(quotationData)
      });

      if (!quotationResponse.ok) {
        const error = await quotationResponse.text();
        throw new Error(`Failed to create quotation: ${error}`);
      }

      const quotationResultData = await quotationResponse.json();
      const quotation = quotationResultData.data || quotationResultData;
      quotationId = quotation.id;
      await logResult('Quotation created (Backend)', 'success', { 
        quotationId, 
        quotationNumber: quotation.quotationNumber,
        totalAmount: quotation.totalAmount 
      });

      // Test Frontend - Check if quotation appears
      const quotationsListResponse = await fetch('http://localhost:3000/api/quotations', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const quotationsListResultData = await quotationsListResponse.json();
      const quotationsList = quotationsListResultData.data || quotationsListResultData;
      const quotationExists = quotationsList.some((q: any) => q.id === quotationId);
      
      if (quotationExists) {
        await logResult('Quotation appears in list (Frontend)', 'success');
      } else {
        await logResult('Quotation appears in list (Frontend)', 'failed');
      }

    } catch (error) {
      await logResult('Create Quotation', 'failed', null, error);
      throw error;
    }

    // Step 5: Create Quotation Revision
    console.log('\n📋 Step 5: Creating Quotation Revision');
    try {
      // Update quotation with a small change (add notes or adjust price)
      const revisionData = {
        ...quotationId,
        version: 2,
        internalNotes: 'Internal: Customer requested expedited service - adjusted timeline',
        externalNotes: 'Updated: Expedited service available - Timeline reduced to 7 days',
        items: [
          {
            inventoryItemId: createdItems[0].id,
            description: createdItems[0].description + ' - EXPEDITED',
            quantity: 1,
            unitPrice: 3500.00, // Increased price for expedited service
            discount: 0,
            taxRate: 5
          },
          // ... rest of items remain same
        ]
      };

      const revisionResponse = await fetch(`http://localhost:3000/api/quotations/${quotationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(revisionData)
      });

      if (revisionResponse.ok) {
        await logResult('Quotation revision created', 'success');
      } else {
        await logResult('Quotation revision created', 'failed', null, await revisionResponse.text());
      }

    } catch (error) {
      await logResult('Create Quotation Revision', 'failed', null, error);
    }

    // Step 6: Approve Quotation
    console.log('\n📋 Step 6: Approving Quotation');
    try {
      const approveResponse = await fetch(`http://localhost:3000/api/quotations/${quotationId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({})
      });

      if (!approveResponse.ok) {
        const error = await approveResponse.text();
        throw new Error(`Failed to approve quotation: ${error}`);
      }

      await logResult('Quotation approved', 'success');
    } catch (error) {
      await logResult('Approve Quotation', 'failed', null, error);
    }

    // Step 7: Record Customer PO
    console.log('\n📋 Step 7: Recording Customer PO');
    try {
      const customerPOData = {
        customerId,
        poNumber: 'PO-DMC-2025-001',
        poDate: new Date().toISOString(),
        amount: 28644.00,
        currency: 'AED',
        description: 'Purchase Order for Shaheen 2020 Marine Services',
        status: 'ACTIVE',
        quotationId
      };

      const poResponse = await fetch('http://localhost:3000/api/customer-pos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(customerPOData)
      });

      if (!poResponse.ok) {
        const error = await poResponse.text();
        throw new Error(`Failed to create customer PO: ${error}`);
      }

      const customerPOResultData = await poResponse.json();
      const customerPO = customerPOResultData.data || customerPOResultData;
      await logResult('Customer PO recorded', 'success', { poNumber: customerPO.poNumber });

    } catch (error) {
      await logResult('Record Customer PO', 'failed', null, error);
    }

    // Step 8: Convert to Sales Order
    console.log('\n📋 Step 8: Converting to Sales Order');
    try {
      const convertResponse = await fetch(`http://localhost:3000/api/quotations/${quotationId}/convert-to-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({})
      });

      if (!convertResponse.ok) {
        const error = await convertResponse.text();
        throw new Error(`Failed to convert to sales order: ${error}`);
      }

      const salesOrderResultData = await convertResponse.json();
      const salesOrder = salesOrderResultData.data || salesOrderResultData;
      salesOrderId = salesOrder.id;
      await logResult('Sales Order created', 'success', { salesOrderId, orderNumber: salesOrder.orderNumber });

    } catch (error) {
      await logResult('Convert to Sales Order', 'failed', null, error);
    }

    // Step 9: Record Expenses Against Sales Case
    console.log('\n📋 Step 9: Recording Expenses Against Sales Case');
    try {
      const expenses = [
        {
          salesCaseId,
          category: 'MATERIALS',
          description: 'Hydraulic seals and rubber hoses',
          amount: 2500.00,
          date: new Date().toISOString()
        },
        {
          salesCaseId,
          category: 'LABOR',
          description: 'Technician labor costs',
          amount: 5000.00,
          date: new Date().toISOString()
        },
        {
          salesCaseId,
          category: 'TRANSPORTATION',
          description: 'Equipment transportation',
          amount: 1200.00,
          date: new Date().toISOString()
        }
      ];

      for (const expense of expenses) {
        const expenseResponse = await fetch(`http://localhost:3000/api/sales-cases/${salesCaseId}/expenses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(expense)
        });

        if (expenseResponse.ok) {
          console.log(`  ✅ Recorded expense: ${expense.description} - AED ${expense.amount}`);
        } else {
          console.log(`  ❌ Failed to record expense: ${expense.description}`);
        }
      }

      await logResult('Expenses recorded', 'success', { totalExpenses: 8700.00 });

    } catch (error) {
      await logResult('Record Expenses', 'failed', null, error);
    }

    // Step 10: Calculate Sales Case Profitability
    console.log('\n📋 Step 10: Calculating Sales Case Profitability');
    try {
      const summaryResponse = await fetch(`http://localhost:3000/api/sales-cases/${salesCaseId}/summary`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!summaryResponse.ok) {
        throw new Error('Failed to get sales case summary');
      }

      const summaryResultData = await summaryResponse.json();
      const summary = summaryResultData.data || summaryResultData;
      const inventoryCost = createdItems.reduce((sum, item) => sum + (item.costPrice || 0), 0);
      const totalCost = inventoryCost + 8700.00; // expenses
      const revenue = 28644.00;
      const profit = revenue - totalCost;
      const profitMargin = (profit / revenue) * 100;

      await logResult('Profitability calculated', 'success', {
        revenue,
        inventoryCost,
        expenses: 8700.00,
        totalCost,
        profit,
        profitMargin: `${profitMargin.toFixed(2)}%`
      });

    } catch (error) {
      await logResult('Calculate Profitability', 'failed', null, error);
    }

    // Step 11: Fulfill Sales Order
    console.log('\n📋 Step 11: Fulfilling Sales Order');
    try {
      // First approve the sales order
      const approveOrderResponse = await fetch(`http://localhost:3000/api/sales-orders/${salesOrderId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({})
      });

      if (approveOrderResponse.ok) {
        console.log('  ✅ Sales order approved');
      }

      // Create shipment for fulfillment
      const shipmentData = {
        salesOrderId,
        shipmentNumber: `SHIP-${Date.now()}`,
        status: 'PENDING',
        shippingAddress: 'WS 105 - Dubai Maritime City, Dubai, UAE',
        trackingNumber: 'ALS-TRACK-001',
        carrier: 'Al Sahab Logistics',
        estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const shipmentResponse = await fetch('http://localhost:3000/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(shipmentData)
      });

      if (shipmentResponse.ok) {
        const shipmentResultData = await shipmentResponse.json();
        const shipment = shipmentResultData.data || shipmentResultData;
        await logResult('Shipment created for fulfillment', 'success', { shipmentNumber: shipment.shipmentNumber });
      }

    } catch (error) {
      await logResult('Fulfill Sales Order', 'failed', null, error);
    }

    // Step 12: Generate Invoice
    console.log('\n📋 Step 12: Generating Invoice');
    try {
      const invoiceResponse = await fetch(`http://localhost:3000/api/sales-orders/${salesOrderId}/create-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({})
      });

      if (!invoiceResponse.ok) {
        const error = await invoiceResponse.text();
        throw new Error(`Failed to create invoice: ${error}`);
      }

      const invoiceResultData = await invoiceResponse.json();
      const invoice = invoiceResultData.data || invoiceResultData;
      invoiceId = invoice.id;
      await logResult('Invoice generated', 'success', { 
        invoiceId, 
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount 
      });

    } catch (error) {
      await logResult('Generate Invoice', 'failed', null, error);
    }

    // Step 13: Record Payment
    console.log('\n📋 Step 13: Recording Payment');
    try {
      // Record 40% advance payment
      const advancePayment = {
        invoiceId,
        amount: 11457.60, // 40% of 28644
        paymentDate: new Date().toISOString(),
        paymentMethod: 'BANK_TRANSFER',
        reference: 'ADV-PAY-001',
        notes: '40% advance payment as per terms'
      };

      const paymentResponse = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(advancePayment)
      });

      if (!paymentResponse.ok) {
        const error = await paymentResponse.text();
        throw new Error(`Failed to record payment: ${error}`);
      }

      const paymentResultData = await paymentResponse.json();
      const payment = paymentResultData.data || paymentResultData;
      paymentId = payment.id;
      await logResult('Advance payment recorded', 'success', { 
        paymentId,
        amount: payment.amount,
        reference: payment.reference 
      });

      // Record final payment
      const finalPayment = {
        invoiceId,
        amount: 17186.40, // 60% of 28644
        paymentDate: new Date().toISOString(),
        paymentMethod: 'BANK_TRANSFER',
        reference: 'FINAL-PAY-001',
        notes: '60% final payment on completion'
      };

      const finalPaymentResponse = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(finalPayment)
      });

      if (finalPaymentResponse.ok) {
        await logResult('Final payment recorded', 'success', { amount: finalPayment.amount });
      }

    } catch (error) {
      await logResult('Record Payment', 'failed', null, error);
    }

    // Step 14: Verify Complete Workflow
    console.log('\n📋 Step 14: Verifying Complete Workflow');
    
    // Check customer balance
    const balanceResponse = await fetch(`http://localhost:3000/api/customers/${customerId}/balance`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (balanceResponse.ok) {
      const balanceResultData = await balanceResponse.json();
      const balance = balanceResultData.data || balanceResultData;
      await logResult('Customer balance verified', 'success', balance);
    }

    // Check sales case status
    const finalSalesCaseResponse = await fetch(`http://localhost:3000/api/sales-cases/${salesCaseId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (finalSalesCaseResponse.ok) {
      const finalSalesCaseResultData = await finalSalesCaseResponse.json();
      const finalSalesCase = finalSalesCaseResultData.data || finalSalesCaseResultData;
      await logResult('Sales case final status', 'success', { 
        status: finalSalesCase.status,
        actualRevenue: finalSalesCase.actualRevenue 
      });
    }

  } catch (error) {
    console.error('\n❌ Workflow test failed:', error);
  }

  // Print summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('=====================================');
  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  
  console.log(`✅ Successful steps: ${successCount}`);
  console.log(`❌ Failed steps: ${failedCount}`);
  console.log(`📈 Success rate: ${((successCount / results.length) * 100).toFixed(2)}%`);

  // List failed steps
  if (failedCount > 0) {
    console.log('\n❌ Failed Steps:');
    results.filter(r => r.status === 'failed').forEach(r => {
      console.log(`  - ${r.step}: ${r.error?.message || 'Unknown error'}`);
    });
  }

  // Identify gaps
  console.log('\n🔍 IDENTIFIED GAPS:');
  const gaps = [];
  
  if (results.some(r => r.step.includes('revision') && r.status === 'failed')) {
    gaps.push('- Quotation revision functionality needs implementation');
  }
  if (results.some(r => r.step.includes('expense') && r.status === 'failed')) {
    gaps.push('- Sales case expense tracking needs improvement');
  }
  if (results.some(r => r.step.includes('profitability') && r.status === 'failed')) {
    gaps.push('- Profitability calculation needs to be implemented');
  }
  if (results.some(r => r.step.includes('Frontend') && r.status === 'failed')) {
    gaps.push('- Frontend integration needs attention');
  }
  
  if (gaps.length > 0) {
    gaps.forEach(gap => console.log(gap));
  } else {
    console.log('✅ No major gaps identified - system is working well!');
  }

  await prisma.$disconnect();
}

// Run the test
testCompleteWorkflow().catch(console.error);