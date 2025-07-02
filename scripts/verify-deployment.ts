#!/usr/bin/env node
import { execSync } from 'child_process';
import * as fs from 'fs';

console.log('🔍 Verifying application health...\n');

// Check if server is responding
setTimeout(() => {
  try {
    execSync('curl -f http://localhost:3000 > /dev/null 2>&1', { stdio: 'pipe' });
    console.log('✅ Server is responding on port 3000');
  } catch (error) {
    console.log('❌ Server is not responding');
    console.log('\nTroubleshooting steps:');
    console.log('1. Check PM2 logs: pm2 logs enxi-erp');
    console.log('2. Check PM2 status: pm2 status');
    console.log('3. Restart if needed: pm2 restart enxi-erp');
  }
}, 5000);
