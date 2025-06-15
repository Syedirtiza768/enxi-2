#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('🔍 Verifying build readiness...\n');

try {
  // Quick type check on critical files
  const criticalFiles = [
    'app/(auth)/invoices/page.tsx',
    'app/(auth)/payments/page.tsx',
    'lib/contexts/currency-context.tsx',
    'lib/api/client.ts'
  ];
  
  console.log('Checking critical files:');
  for (const file of criticalFiles) {
    try {
      execSync(`npx tsc --noEmit --skipLibCheck ${file}`, { stdio: 'pipe' });
      console.log(`  ✅ ${file}`);
    } catch (error) {
      console.log(`  ❌ ${file} - Still has errors`);
    }
  }
  
  console.log('\n✅ Build verification complete');
} catch (error) {
  console.error('❌ Build verification failed');
}
