// Test script to check customer API
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtYzEzaGJqNDAwMDB2Mnd1OXZwam1oYmQiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBtYXJpbmVwb3dlcnVhZS5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3NTAyMDQzMjMsImV4cCI6MTc1MDgwOTEyM30.K6Fb36zPpCRWYjkGFqBfD4h6kUinjTR4lw5Z10nxysI';

async function testCustomerAPI() {
    console.log('Testing Customer API...');
    
    // First, let's check the auth validate endpoint
    console.log('\n1. Testing auth validation:');
    try {
        const authResponse = await fetch('http://localhost:3000/api/auth/validate', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        console.log('Auth Response Status:', authResponse.status);
        const authData = await authResponse.json();
        console.log('Auth Data:', authData);
    } catch (error) {
        console.error('Auth Error:', error);
    }
    
    // Now test the customers endpoint
    console.log('\n2. Testing customers endpoint:');
    try {
        const response = await fetch('http://localhost:3000/api/customers', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        console.log('Customers Response Status:', response.status);
        const data = await response.json();
        console.log('Response Data:', data);
        
        if (data.customers) {
            console.log(`✓ Success! Found ${data.customers.length} customers`);
            console.log('First customer:', data.customers[0]);
        } else if (data.error) {
            console.log('✗ Error:', data.error);
        }
    } catch (error) {
        console.error('Customers Error:', error);
    }
}

testCustomerAPI();