#!/usr/bin/env npx tsx

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

const API_BASE_URL = 'http://localhost:3001/api';

async function makeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  token?: string
) {
  console.log(`\n📡 ${method} ${endpoint}`);
  if (body) {
    console.log('Request body:', JSON.stringify(body, null, 2));
  }

  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    console.error('❌ Request failed:', error);
    throw error;
  }
}

async function login() {
  console.log('\n🔐 Logging in...');
  const response = await makeRequest('/auth/login', 'POST', {
    username: 'admin',
    password: 'admin123',
  });
  return response.token;
}

async function testCompleteWorkflow() {
  let token: string;
  
  try {
    // Login first
    token = await login();
    console.log('✅ Login successful');

    // 1. Get test data
    console.log('\n\n=== 1. GETTING TEST DATA ===');
    
    // Get a customer
    const customers = await makeRequest('/customers', 'GET', null, token);
    const customer = customers.data?.[0];
    if (!customer) {
      throw new Error('No customers found');
    }
    console.log(`✅ Found customer: ${customer.name} (ID: ${customer.id})`);

    // Get an existing sales case or create a new one with a unique title
    console.log('Getting sales case...');
    const salesCases = await makeRequest('/sales-cases', 'GET', null, token);
    let salesCase = salesCases.data?.find((sc: any) => sc.status === 'OPEN');
    
    if (!salesCase) {
      // Create a new sales case with unique title
      const timestamp = Date.now();
      const newSalesCase = await makeRequest('/sales-cases', 'POST', {
        customerId: customer.id,
        title: `Test Workflow Case ${timestamp}`,
        description: 'Testing complete workflow',
        expectedValue: 30000,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'HIGH',
      }, token);
      salesCase = newSalesCase.data;
      console.log(`✅ Created sales case: ${salesCase.title} (ID: ${salesCase.id})`);
    } else {
      console.log(`✅ Found open sales case: ${salesCase.title} (ID: ${salesCase.id})`);
    }

    // Get inventory items
    const items = await makeRequest('/inventory/items', 'GET', null, token);
    // Use any available items for testing
    const item1 = items.data?.[0];
    const item2 = items.data?.[1];
    
    if (!item1 || !item2) {
      throw new Error('Required inventory items not found');
    }
    console.log(`✅ Found items: ${item1.name}, ${item2.name}`);

    // 2. Create quotation with exact values from document
    console.log('\n\n=== 2. CREATING QUOTATION ===');
    
    // Calculate quantities and prices to match expected totals
    // Expected: Subtotal 27,280, Tax 1,364, Total 28,644
    // Need to adjust quantities: We need subtotal of exactly 27,280
    // Option 1: 200 * 130 = 26,000 + 16 * 80 = 1,280 = 27,280
    // Option 2: 208 * 130 = 27,040 + 4 * 60 = 240 = 27,280
    
    const quotationData = {
      salesCaseId: salesCase.id,
      items: [
        {
          itemId: item1.id,
          itemCode: item1.code,
          quantity: 200,
          unitPrice: 130,
          description: item1.name || 'Item 1',
          taxRate: 5, // 5% VAT per item
        },
        {
          itemId: item2.id,
          itemCode: item2.code,
          quantity: 16,
          unitPrice: 80,
          description: item2.name || 'Item 2',
          taxRate: 5, // 5% VAT per item
        }
      ],
      paymentTerms: 'Payment due within 30 days',
      notes: 'Thank you for your business',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const quotation = await makeRequest('/quotations', 'POST', quotationData, token);
    console.log(`✅ Quotation created: ${quotation.data.quotationNumber}`);
    
    // Verify calculations
    const expectedSubtotal = 27280; // (200 * 130) + (16 * 80) = 26000 + 1280 = 27280
    const expectedTax = 1364; // 27280 * 0.05 = 1364
    const expectedTotal = 28644; // 27280 + 1364 = 28644
    
    console.log('\n📊 Calculation verification:');
    console.log(`Subtotal: ${quotation.data.subtotal} (expected: ${expectedSubtotal}) ${quotation.data.subtotal === expectedSubtotal ? '✅' : '❌'}`);
    console.log(`Tax: ${quotation.data.taxAmount} (expected: ${expectedTax}) ${quotation.data.taxAmount === expectedTax ? '✅' : '❌'}`);
    console.log(`Total: ${quotation.data.totalAmount} (expected: ${expectedTotal}) ${quotation.data.totalAmount === expectedTotal ? '✅' : '❌'}`);

    // 3. Test quotation revision
    console.log('\n\n=== 3. TESTING QUOTATION REVISION ===');
    const revisionData = {
      items: [
        {
          itemId: item1.id,
          itemCode: item1.code,
          quantity: 210, // Updated quantity
          unitPrice: 130,
          description: item1.name || 'Item 1',
          taxRate: 5,
        },
        {
          itemId: item2.id,
          itemCode: item2.code,
          quantity: 16,
          unitPrice: 80,
          description: item2.name || 'Item 2',
          taxRate: 5,
        }
      ],
      paymentTerms: 'Payment due within 30 days - Revised',
      notes: 'Revised quotation',
    };

    const revisedQuotation = await makeRequest(
      `/quotations/${quotation.data.id}`,
      'PUT',
      revisionData,
      token
    );
    console.log(`✅ Quotation revised: Version ${revisedQuotation.data.version}`);

    // 4. Send quotation first (required before acceptance)
    console.log('\n\n=== 4. SENDING QUOTATION ===');
    const sentQuotation = await makeRequest(
      `/quotations/${quotation.data.id}/send`,
      'POST',
      {},
      token
    );
    console.log(`✅ Quotation sent: Status = ${sentQuotation.data.status}`);

    // 5. Accept quotation
    console.log('\n\n=== 5. ACCEPTING QUOTATION ===');
    const acceptedQuotation = await makeRequest(
      `/quotations/${quotation.data.id}/accept`,
      'POST',
      {},
      token
    );
    console.log(`✅ Quotation accepted: Status = ${acceptedQuotation.data.status}`);

    // 6. Convert to sales order
    console.log('\n\n=== 6. CONVERTING TO SALES ORDER ===');
    const salesOrder = await makeRequest(
      `/quotations/${quotation.data.id}/convert-to-order`,
      'POST',
      {},
      token
    );
    console.log(`✅ Sales order created: ${salesOrder.data.orderNumber}`);

    // 7. Add expenses to sales case
    console.log('\n\n=== 7. ADDING EXPENSES ===');
    const expenseData = {
      description: 'Transportation costs',
      amount: 500,
      date: new Date().toISOString(),
      category: 'Transportation',
    };

    const expense = await makeRequest(
      `/sales-cases/${salesCase.id}/expenses`,
      'POST',
      expenseData,
      token
    );
    console.log(`✅ Expense added: ${expense.data.description} - ${expense.data.amount} AED`);

    // 8. Check profitability
    console.log('\n\n=== 8. CHECKING PROFITABILITY ===');
    const summary = await makeRequest(
      `/sales-cases/${salesCase.id}/summary`,
      'GET',
      null,
      token
    );
    console.log('✅ Sales case summary:');
    console.log(`  Revenue: ${summary.data.totalRevenue} AED`);
    console.log(`  Expenses: ${summary.data.totalExpenses} AED`);
    console.log(`  Profit: ${summary.data.profit} AED`);
    console.log(`  Margin: ${summary.data.profitMargin}%`);

    // 9. Create invoice from sales order
    console.log('\n\n=== 9. CREATING INVOICE ===');
    const invoice = await makeRequest(
      `/sales-orders/${salesOrder.data.id}/create-invoice`,
      'POST',
      {},
      token
    );
    console.log(`✅ Invoice created: ${invoice.data.invoiceNumber}`);
    console.log(`  Total: ${invoice.data.totalAmount} AED`);
    console.log(`  Status: ${invoice.data.status}`);

    // 10. Record payment
    console.log('\n\n=== 10. RECORDING PAYMENT ===');
    const paymentData = {
      amount: invoice.data.totalAmount,
      paymentDate: new Date().toISOString(),
      paymentMethod: 'Bank Transfer',
      reference: 'TRF-001',
      notes: 'Full payment received',
    };

    const payment = await makeRequest(
      `/invoices/${invoice.data.id}/payments`,
      'POST',
      paymentData,
      token
    );
    console.log(`✅ Payment recorded: ${payment.data.amount} AED`);
    console.log(`  Method: ${payment.data.paymentMethod}`);
    console.log(`  Reference: ${payment.data.reference}`);

    // Get updated invoice status
    const updatedInvoice = await makeRequest(
      `/invoices/${invoice.data.id}`,
      'GET',
      null,
      token
    );
    console.log(`  Invoice status: ${updatedInvoice.data.status}`);

    console.log('\n\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('\n\n❌ WORKFLOW TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCompleteWorkflow().catch(console.error);