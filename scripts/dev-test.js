#!/usr/bin/env node

// Start Next.js dev server
const { spawn } = require('child_process');

// Set test environment variables directly
const testEnv = {
  ...process.env,
  DATABASE_URL: 'file:./prisma/e2e-test.db',
  JWT_SECRET: 'test-secret-key-for-e2e-tests',
  NODE_ENV: 'test'
};

console.log('🚀 Starting dev server with test configuration...');
console.log('📋 Environment:');
console.log(`   DATABASE_URL: ${testEnv.DATABASE_URL}`);
console.log(`   NODE_ENV: ${testEnv.NODE_ENV}`);

const server = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  env: testEnv
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  server.kill();
  process.exit(0);
});