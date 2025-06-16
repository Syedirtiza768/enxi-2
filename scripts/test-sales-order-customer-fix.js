#!/usr/bin/env node

/**
 * Test script to verify the sales order customer selection fix
 */

const API_BASE_URL = 'http://localhost:3000/api';

async function testCustomerListAPI() {
  console.log('🔍 Testing Customer List API...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Customer API is working');
      console.log(`   Found ${data.data?.length || data.length || 0} customers`);
      
      // Check if there are any customers
      const customers = Array.isArray(data) ? data : (data.data || []);
      if (customers.length > 0) {
        console.log('   Sample customer:', {
          id: customers[0].id,
          name: customers[0].name,
          email: customers[0].email
        });
        return customers[0].id; // Return first customer ID for testing
      } else {
        console.log('⚠️  No customers found in the system');
        return null;
      }
    } else {
      console.error('❌ Customer API failed:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error calling Customer API:', error.message);
    return null;
  }
}

async function testSalesOrderCreationWithCustomer(customerId) {
  console.log('\n🔍 Testing Sales Order creation with direct customer selection...');
  
  if (!customerId) {
    console.log('⚠️  Skipping test - no customer available');
    return;
  }
  
  try {
    const orderData = {
      customerId: customerId,
      paymentTerms: 'Net 30 days',
      shippingTerms: 'FOB Origin',
      customerPO: `TEST-PO-${Date.now()}`,
      items: [{
        lineNumber: 1,
        isLineHeader: false,
        itemType: 'PRODUCT',
        itemCode: 'TEST-ITEM-001',
        description: 'Test Product',
        quantity: 1,
        unitPrice: 100,
        discount: 0,
        taxRate: 0
      }]
    };
    
    console.log('📤 Sending sales order data with customerId:', customerId);
    
    const response = await fetch(`${API_BASE_URL}/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Sales order created successfully!');
      console.log('   Order Number:', result.data?.orderNumber);
      console.log('   Sales Case ID:', result.data?.salesCaseId);
      console.log('   Customer:', result.data?.salesCase?.customer?.name);
    } else {
      console.error('❌ Sales order creation failed:', result.error || result.message);
      if (result.details) {
        console.error('   Validation errors:', result.details);
      }
    }
  } catch (error) {
    console.error('❌ Error creating sales order:', error.message);
  }
}

async function checkUIComponents() {
  console.log('\n🔍 Checking UI Components...');
  
  try {
    // Check if CustomerSearch component exists
    const fs = require('fs');
    const path = require('path');
    
    const customerSearchPath = path.join(__dirname, '..', 'components', 'customers', 'customer-search.tsx');
    if (fs.existsSync(customerSearchPath)) {
      console.log('✅ CustomerSearch component exists');
    } else {
      console.log('❌ CustomerSearch component not found');
    }
    
    // Check if new sales order page is updated
    const salesOrderNewPath = path.join(__dirname, '..', 'app', '(auth)', 'sales-orders', 'new', 'page.tsx');
    if (fs.existsSync(salesOrderNewPath)) {
      const content = fs.readFileSync(salesOrderNewPath, 'utf8');
      if (content.includes('CustomerSearch')) {
        console.log('✅ Sales order new page includes CustomerSearch');
      } else {
        console.log('❌ Sales order new page missing CustomerSearch');
      }
    }
  } catch (error) {
    console.error('❌ Error checking UI components:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Sales Order Customer Fix Tests\n');
  
  // Test 1: Check UI components
  checkUIComponents();
  
  // Test 2: Check customer API
  const customerId = await testCustomerListAPI();
  
  // Test 3: Test sales order creation with customer
  await testSalesOrderCreationWithCustomer(customerId);
  
  console.log('\n✨ Tests completed!');
  console.log('\n📝 Summary:');
  console.log('- Customer selection has been added to the new sales order page');
  console.log('- When creating a sales order without a sales case, a sales case is automatically created');
  console.log('- The CustomerSearch component provides a searchable dropdown for customer selection');
  console.log('\n🌐 To test in the browser:');
  console.log('1. Navigate to http://localhost:3000/sales-orders');
  console.log('2. Click "New Order"');
  console.log('3. You should now see a "Select Customer" section');
  console.log('4. Select a customer from the dropdown');
  console.log('5. The order form should appear after customer selection');
}

// Run the tests
runTests().catch(console.error);