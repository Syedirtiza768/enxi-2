#!/usr/bin/env node

/**
 * Test script for Stock-In functionality with GL integration
 * This script tests the complete flow from stock movement to journal entry creation
 */

const API_BASE = 'http://localhost:3000/api';

// Test configuration
const TEST_CONFIG = {
  items: [
    {
      itemCode: 'LAPTOP-001',
      quantity: 5,
      unitCost: 1500.00,
      location: 'WAREHOUSE-A',
      reference: `TEST-LAPTOP-${Date.now()}`,
      notes: 'Test laptop stock-in with GL'
    },
    {
      itemCode: 'PAPER-A4',
      quantity: 100,
      unitCost: 5.00,
      location: 'WAREHOUSE-A',
      reference: `TEST-PAPER-${Date.now()}`,
      notes: 'Test paper stock-in with GL'
    }
  ]
};

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`API Error: ${data.error || response.statusText}`);
  }
  return data;
}

// Test a single stock-in transaction
async function testStockIn(config) {
  console.log(`\n🧪 Testing Stock-In for ${config.itemCode}`);
  console.log('─'.repeat(50));
  
  try {
    // Step 1: Check initial balance
    console.log('📊 Checking initial inventory balance...');
    const initialBalance = await apiCall(`/inventory/balances?itemCode=${config.itemCode}&location=${config.location}`);
    const currentQty = initialBalance.data?.[0]?.quantity || 0;
    console.log(`  Initial balance: ${currentQty}`);
    
    // Step 2: Create stock-in movement
    console.log('\n📥 Creating stock-in transaction...');
    const stockInData = {
      type: 'IN',
      itemCode: config.itemCode,
      quantity: config.quantity,
      unitCost: config.unitCost,
      location: config.location,
      reference: config.reference,
      notes: config.notes
    };
    
    const movement = await apiCall('/stock-movements', {
      method: 'POST',
      body: JSON.stringify(stockInData)
    });
    
    console.log(`  ✅ Movement created: ID ${movement.data.id}`);
    console.log(`  Total value: $${(config.quantity * config.unitCost).toFixed(2)}`);
    
    // Step 3: Verify inventory update
    console.log('\n📈 Verifying inventory balance update...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for processing
    
    const newBalance = await apiCall(`/inventory/balances?itemCode=${config.itemCode}&location=${config.location}`);
    const newQty = newBalance.data?.[0]?.quantity || 0;
    const expectedQty = currentQty + config.quantity;
    
    console.log(`  New balance: ${newQty}`);
    console.log(`  Expected: ${expectedQty}`);
    console.log(`  ${newQty === expectedQty ? '✅ Balance updated correctly' : '❌ Balance mismatch!'}`);
    
    // Step 4: Check journal entry
    console.log('\n📚 Checking journal entry creation...');
    const journalEntries = await apiCall(`/journal-entries?reference=STOCK-IN-${movement.data.id}`);
    
    if (journalEntries.data && journalEntries.data.length > 0) {
      const entry = journalEntries.data[0];
      console.log(`  ✅ Journal entry found: ID ${entry.id}`);
      console.log(`  Date: ${new Date(entry.date).toLocaleDateString()}`);
      console.log(`  Description: ${entry.description}`);
      
      // Analyze journal lines
      console.log('\n  Journal Lines:');
      const totalAmount = config.quantity * config.unitCost;
      
      entry.lines.forEach(line => {
        const accountName = line.account?.name || line.accountCode;
        console.log(`    ${line.type}: ${accountName} - $${line.amount}`);
        
        // Verify amounts
        if (Math.abs(parseFloat(line.amount) - totalAmount) > 0.01) {
          console.log(`    ⚠️  Amount mismatch! Expected: $${totalAmount}`);
        }
      });
      
      // Verify balanced entry
      const totalDebits = entry.lines
        .filter(l => l.type === 'DEBIT')
        .reduce((sum, l) => sum + parseFloat(l.amount), 0);
      const totalCredits = entry.lines
        .filter(l => l.type === 'CREDIT')
        .reduce((sum, l) => sum + parseFloat(l.amount), 0);
      
      console.log(`\n  Total Debits: $${totalDebits.toFixed(2)}`);
      console.log(`  Total Credits: $${totalCredits.toFixed(2)}`);
      console.log(`  ${Math.abs(totalDebits - totalCredits) < 0.01 ? '✅ Entry is balanced' : '❌ Entry is not balanced!'}`);
      
    } else {
      console.log('  ❌ No journal entry found!');
    }
    
    return { success: true, movementId: movement.data.id };
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test GL account balances
async function testGLBalances() {
  console.log('\n💰 Checking GL Account Balances');
  console.log('─'.repeat(50));
  
  try {
    // Check inventory account (1300)
    console.log('Inventory Account (1300):');
    const inventoryBalance = await apiCall('/accounts/1300/balance');
    console.log(`  Balance: $${inventoryBalance.balance || 0}`);
    
    // Check accounts payable (2100)
    console.log('\nAccounts Payable (2100):');
    const payableBalance = await apiCall('/accounts/2100/balance');
    console.log(`  Balance: $${payableBalance.balance || 0}`);
    
  } catch (error) {
    console.error(`  Error checking balances: ${error.message}`);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Stock-In GL Integration Tests');
  console.log('═'.repeat(50));
  console.log(`Server: ${API_BASE}`);
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  const results = [];
  
  // Test each item
  for (const config of TEST_CONFIG.items) {
    const result = await testStockIn(config);
    results.push({ ...config, ...result });
  }
  
  // Check GL balances
  await testGLBalances();
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('═'.repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.itemCode}: ${r.error}`);
    });
  }
  
  console.log('\n✨ Test run complete!');
}

// Run the tests
runTests().catch(console.error);