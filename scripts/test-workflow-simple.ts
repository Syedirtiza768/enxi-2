#!/usr/bin/env npx tsx

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
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    console.error('❌ Request failed:', error);
    throw error;
  }
}

async function testWorkflow(): Promise<void> {
  let token: string;
  
  try {
    // 1. Login
    console.log('\n🔐 Logging in...');
    const loginResponse = await makeRequest('/auth/login', 'POST', {
      username: 'admin',
      password: 'admin123',
    });
    token = loginResponse.token;
    console.log('✅ Login successful');

    // 2. Get an existing open sales case
    console.log('\n\n=== GETTING SALES CASE ===');
    const salesCases = await makeRequest('/sales-cases', 'GET', null, token);
    const salesCase = salesCases.data?.find((sc: any) => sc.status === 'OPEN');
    
    if (!salesCase) {
      throw new Error('No open sales cases found');
    }
    console.log(`✅ Found open sales case: ${salesCase.title} (ID: ${salesCase.id})`);

    // 3. Get inventory items
    console.log('\n\n=== GETTING INVENTORY ITEMS ===');
    const items = await makeRequest('/inventory/items', 'GET', null, token);
    const item1 = items.data?.[0];
    const item2 = items.data?.[1];
    
    if (!item1 || !item2) {
      throw new Error('Required inventory items not found');
    }
    console.log(`✅ Found items: ${item1.name}, ${item2.name}`);

    // 4. Create quotation with exact calculations
    console.log('\n\n=== CREATING QUOTATION ===');
    const quotationData = {
      salesCaseId: salesCase.id,
      items: [
        {
          itemId: item1.id,
          itemCode: item1.code,
          quantity: 200,
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
      paymentTerms: 'Payment due within 30 days',
      notes: 'Thank you for your business',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const quotation = await makeRequest('/quotations', 'POST', quotationData, token);
    console.log(`✅ Quotation created: ${quotation.data.quotationNumber}`);
    console.log(`   Subtotal: ${quotation.data.subtotal} AED`);
    console.log(`   Tax: ${quotation.data.taxAmount} AED`);
    console.log(`   Total: ${quotation.data.totalAmount} AED`);

    // 5. Send quotation
    console.log('\n\n=== SENDING QUOTATION ===');
    await makeRequest(`/quotations/${quotation.data.id}/send`, 'POST', {}, token);
    console.log('✅ Quotation sent');

    // 6. Accept quotation
    console.log('\n\n=== ACCEPTING QUOTATION ===');
    await makeRequest(`/quotations/${quotation.data.id}/accept`, 'POST', {}, token);
    console.log('✅ Quotation accepted');

    // 7. Convert to sales order
    console.log('\n\n=== CONVERTING TO SALES ORDER ===');
    const salesOrder = await makeRequest(
      `/quotations/${quotation.data.id}/convert-to-order`,
      'POST',
      {},
      token
    );
    console.log(`✅ Sales order created: ${salesOrder.orderNumber}`);
    console.log(`   Total: ${salesOrder.totalAmount} AED`);

    // 8. Approve sales order first
    console.log('\n\n=== APPROVING SALES ORDER ===');
    const approvedOrder = await makeRequest(
      `/sales-orders/${salesOrder.id}/approve`,
      'POST',
      {},
      token
    );
    console.log(`✅ Sales order approved: Status = ${approvedOrder.status}`);

    // 9. Create invoice
    console.log('\n\n=== CREATING INVOICE ===');
    const invoice = await makeRequest(
      `/sales-orders/${salesOrder.id}/create-invoice`,
      'POST',
      {},
      token
    );
    console.log(`✅ Invoice created: ${invoice.data.invoiceNumber}`);
    console.log(`   Total: ${invoice.data.totalAmount} AED`);
    console.log(`   Status: ${invoice.data.status}`);

    // 10. Record payment
    console.log('\n\n=== RECORDING PAYMENT ===');
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
    console.log(`   Method: ${payment.data.paymentMethod}`);
    console.log(`   Reference: ${payment.data.reference}`);

    // 11. Check invoice status
    console.log('\n\n=== CHECKING INVOICE STATUS ===');
    const updatedInvoice = await makeRequest(
      `/invoices/${invoice.data.id}`,
      'GET',
      null,
      token
    );
    console.log(`✅ Invoice status: ${updatedInvoice.data.status}`);

    console.log('\n\n🎉 WORKFLOW COMPLETED SUCCESSFULLY! 🎉');
    console.log('\nSummary:');
    console.log(`- Quotation: ${quotation.data.quotationNumber} (${quotation.data.totalAmount} AED)`);
    console.log(`- Sales Order: ${salesOrder.orderNumber} (${salesOrder.totalAmount} AED)`);
    console.log(`- Invoice: ${invoice.data.invoiceNumber} (${invoice.data.totalAmount} AED)`);
    console.log(`- Payment: ${payment.data.amount} AED`);
    console.log(`- Final Status: ${updatedInvoice.data.status}`);

  } catch (error) {
    console.error('\n\n❌ WORKFLOW TEST FAILED:', error);
    process.exit(1);
  }
}

// Run the test
testWorkflow().catch(console.error);