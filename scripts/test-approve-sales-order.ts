#!/usr/bin/env npx tsx

const API_BASE_URL = 'http://localhost:3001/api';

async function testApprove(): Promise<void> {
  try {
    // Login
    const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const { token } = await loginRes.json();

    // Get a pending sales order
    const ordersRes = await fetch(`${API_BASE_URL}/sales-orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orders = await ordersRes.json();
    
    const pendingOrder = orders.data?.find((o: any) => o.status === 'PENDING');
    if (!pendingOrder) {
      console.log('No pending orders found');
      return;
    }

    console.log('Found pending order:', pendingOrder.orderNumber);

    // Try to approve it
    const approveRes = await fetch(`${API_BASE_URL}/sales-orders/${pendingOrder.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    });

    const result = await approveRes.json();
    console.log('Approve result:', result);

  } catch (error) {
    console.error('Error:', error);
  }
}

testApprove();