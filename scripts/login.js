#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';

async function login() {
  try {
    console.log('Logging in to get auth token...');
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'demo123'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Login failed:', errorText);
      return;
    }
    
    const data = await response.json();
    const token = data.token || data.data?.token;
    
    if (!token) {
      console.error('No token received in login response');
      return;
    }
    
    // Save token to file
    const tokenPath = path.join(__dirname, '..', '.auth-token');
    fs.writeFileSync(tokenPath, token, 'utf8');
    
    console.log('✓ Login successful! Token saved to .auth-token');
    console.log('Token:', token.substring(0, 20) + '...');
    
  } catch (error) {
    console.error('Error during login:', error);
  }
}

login();