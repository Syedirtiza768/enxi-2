#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';
const journalEntryId = 'cmc1oy9cy0000v25xp5bf9y9c'; // The test entry we just created

async function testPostJournalEntry() {
  try {
    // Read auth token
    const tokenPath = path.join(__dirname, '..', '.auth-token');
    const token = fs.readFileSync(tokenPath, 'utf8').trim();
    
    console.log('Testing POST to journal entry...');
    console.log('Journal Entry ID:', journalEntryId);
    console.log('Using token:', token.substring(0, 20) + '...');
    
    const response = await fetch(`${API_URL}/api/accounting/journal-entries/${journalEntryId}/post`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${token}`
      },
      credentials: 'include'
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✓ Journal entry posted successfully!');
    } else {
      console.error('✗ Failed to post journal entry');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPostJournalEntry();