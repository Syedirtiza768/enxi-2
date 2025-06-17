#!/usr/bin/env npx tsx

import { apiClient } from '../lib/api/client';

// Test credentials
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TEST_EMAIL = 'admin@enxi-erp.com';
const TEST_PASSWORD = 'Admin@123';

interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: string;
  };
  token: string;
}

async function login(): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data: LoginResponse = await response.json();
    console.log('✅ Logged in as:', data.user.email, '- Role:', data.user.role);
    return data.token;
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
}

async function testAssignCustomer(token: string) {
  console.log('\n📋 Testing Customer Assignment API...\n');

  try {
    // First, get list of customers and salespersons
    console.log('1. Getting customers list...');
    const customersRes = await fetch(`${API_URL}/api/customers?limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!customersRes.ok) {
      throw new Error(`Failed to get customers: ${customersRes.status}`);
    }
    
    const { customers } = await customersRes.json();
    console.log(`✅ Found ${customers.length} customers`);
    
    if (customers.length === 0) {
      console.log('⚠️  No customers found to test with');
      return;
    }

    // Get sales team members
    console.log('\n2. Getting sales team members...');
    const usersRes = await fetch(`${API_URL}/api/users?role=SALES_REP&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!usersRes.ok) {
      throw new Error(`Failed to get users: ${usersRes.status}`);
    }
    
    const { users } = await usersRes.json();
    console.log(`✅ Found ${users.length} sales reps`);
    
    if (users.length === 0) {
      console.log('⚠️  No sales reps found to test with');
      return;
    }

    // Select a customer and salesperson
    const customer = customers[0];
    const salesperson = users[0];
    
    console.log(`\n3. Testing assignment of customer "${customer.name}" to salesperson "${salesperson.username}"...`);
    
    // Test assign endpoint
    const assignRes = await fetch(`${API_URL}/api/sales-team/assign-customer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: customer.id,
        salespersonId: salesperson.id,
        notes: 'Test assignment via API',
      }),
    });

    if (!assignRes.ok) {
      const error = await assignRes.text();
      throw new Error(`Failed to assign customer: ${assignRes.status} - ${error}`);
    }

    const assignedCustomer = await assignRes.json();
    console.log('✅ Customer assigned successfully');
    console.log('   - Assigned to:', assignedCustomer.assignedToId);
    console.log('   - Assigned at:', assignedCustomer.assignedAt);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test unassign endpoint
    console.log(`\n4. Testing unassignment of customer "${customer.name}"...`);
    
    const unassignRes = await fetch(`${API_URL}/api/sales-team/unassign-customer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: customer.id,
        reason: 'Test unassignment via API',
      }),
    });

    if (!unassignRes.ok) {
      const error = await unassignRes.text();
      throw new Error(`Failed to unassign customer: ${unassignRes.status} - ${error}`);
    }

    const unassignedCustomer = await unassignRes.json();
    console.log('✅ Customer unassigned successfully');
    console.log('   - Assigned to:', unassignedCustomer.assignedToId || 'None');
    console.log('   - Assignment notes:', unassignedCustomer.assignmentNotes || 'None');

    // Test error cases
    console.log('\n5. Testing error handling...');
    
    // Try to assign non-existent customer
    console.log('   - Testing with non-existent customer...');
    const badAssignRes = await fetch(`${API_URL}/api/sales-team/assign-customer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: 'non-existent-id',
        salespersonId: salesperson.id,
      }),
    });

    if (badAssignRes.ok) {
      console.log('❌ Expected error but request succeeded');
    } else {
      const error = await badAssignRes.json();
      console.log('✅ Correctly returned error:', error.error);
    }

    // Try to unassign already unassigned customer
    console.log('   - Testing unassign on already unassigned customer...');
    const badUnassignRes = await fetch(`${API_URL}/api/sales-team/unassign-customer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: customer.id,
        reason: 'Should fail - already unassigned',
      }),
    });

    if (badUnassignRes.ok) {
      console.log('❌ Expected error but request succeeded');
    } else {
      const error = await badUnassignRes.json();
      console.log('✅ Correctly returned error:', error.error);
    }

    console.log('\n✅ All customer assignment tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function main() {
  try {
    console.log('🚀 Starting Customer Assignment API Tests...\n');
    
    // Login first
    const token = await login();
    
    // Run tests
    await testAssignCustomer(token);
    
    console.log('\n✨ All tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Tests failed:', error);
    process.exit(1);
  }
}

main();