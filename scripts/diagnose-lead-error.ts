#!/usr/bin/env npx tsx

import { api } from '../lib/api/client';

const BASE_URL = 'http://localhost:3000';

async function diagnoseLeadCreation() {
  console.log('🔍 Diagnosing Lead Creation Issues\n');

  try {
    // Step 1: Try to create a lead without authentication
    console.log('1. Testing lead creation without authentication...');
    try {
      const response = await api.post(`${BASE_URL}/api/leads`, {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        company: 'Test Company',
        source: 'WEBSITE'
      });
      console.log('Unexpected success:', response.data);
    } catch (error: any) {
      console.log('Error (expected):', {
        status: error.response?.status,
        error: error.response?.data?.error || error.message,
        details: error.response?.data?.details
      });
    }

    // Step 2: Login first
    console.log('\n2. Attempting to login...');
    try {
      const loginResponse = await api.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@example.com',
        password: 'password123'
      });
      console.log('Login response:', {
        status: loginResponse.status,
        hasToken: !!loginResponse.data?.token,
        hasUser: !!loginResponse.data?.user
      });
    } catch (error: any) {
      console.log('Login error:', {
        status: error.response?.status,
        error: error.response?.data?.error || error.message
      });
    }

    // Step 3: Try to create a lead with authentication
    console.log('\n3. Testing lead creation with authentication...');
    try {
      const leadResponse = await api.post(`${BASE_URL}/api/leads`, {
        firstName: 'Test',
        lastName: 'User',
        email: `test${Date.now()}@example.com`,
        phone: '+1234567890',
        company: 'Test Company',
        source: 'WEBSITE',
        jobTitle: 'Manager',
        notes: 'Testing lead creation'
      });
      console.log('Lead created:', {
        status: leadResponse.status,
        leadId: leadResponse.data?.id
      });
    } catch (error: any) {
      console.log('Lead creation error:', {
        status: error.response?.status,
        error: error.response?.data?.error || error.message,
        details: error.response?.data?.details,
        fullError: error.response?.data
      });
    }

    // Step 4: Check if leads table exists
    console.log('\n4. Checking database structure...');
    try {
      const leadsResponse = await api.get(`${BASE_URL}/api/leads`);
      console.log('Leads GET response:', {
        status: leadsResponse.status,
        hasData: !!leadsResponse.data
      });
    } catch (error: any) {
      console.log('Leads GET error:', {
        status: error.response?.status,
        error: error.response?.data?.error || error.message
      });
    }

    // Step 5: Try to access debug logs
    console.log('\n5. Attempting to access debug logs...');
    try {
      const logsResponse = await api.get(`${BASE_URL}/api/debug-logs?limit=10`);
      console.log('Debug logs accessible:', {
        status: logsResponse.status,
        logCount: logsResponse.data?.logs?.length || 0
      });
      
      // Show recent errors if any
      const errors = logsResponse.data?.logs?.filter((log: any) => 
        log.level === 'ERROR' || log.level === 'FATAL'
      );
      
      if (errors?.length > 0) {
        console.log('\nRecent errors from logs:');
        errors.slice(0, 5).forEach((error: any) => {
          console.log(`\n[${error.timestamp}] ${error.message}`);
          if (error.error) {
            console.log('Error details:', error.error);
          }
          if (error.data) {
            console.log('Additional data:', error.data);
          }
        });
      }
    } catch (error: any) {
      console.log('Debug logs error:', {
        status: error.response?.status,
        error: error.response?.data?.error || error.message
      });
    }

  } catch (error: any) {
    console.error('\nUnexpected error:', error.message);
  }
}

// Run diagnosis
diagnoseLeadCreation();