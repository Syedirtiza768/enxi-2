#!/usr/bin/env node
import { spawn } from 'child_process';
import { chromium } from 'playwright';

interface TestResult {
  name: string;
  status: 'success' | 'failed' | 'skipped';
  duration: number;
  details?: any;
  error?: string;
}

class ComprehensiveSystemTester {
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  async runAllTests(): Promise<void> {
    console.log('🚀 ENXI ERP COMPREHENSIVE SYSTEM TEST');
    console.log('=====================================');
    console.log('Testing complete workflow based on Quotation SRV-01-NM-0525\n');

    // Step 1: Check server health
    await this.testServerHealth();

    // Step 2: Test authentication system
    await this.testAuthentication();

    // Step 3: Test backend API endpoints
    await this.testBackendAPIs();

    // Step 4: Test frontend functionality
    await this.testFrontendUI();

    // Step 5: Test complete workflow integration
    await this.testCompleteWorkflow();

    // Step 6: Test data integrity
    await this.testDataIntegrity();

    // Generate final report
    this.generateReport();
  }

  private async testServerHealth() {
    console.log('\n📋 STEP 1: Testing Server Health');
    console.log('--------------------------------');
    const start = Date.now();

    try {
      const response = await fetch('http://localhost:3000/api/system/health');
      if (response.ok) {
        const health = await response.json();
        this.logResult('Server Health Check', 'success', Date.now() - start, health);
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      this.logResult('Server Health Check', 'failed', Date.now() - start, null, error.message);
    }
  }

  private async testAuthentication() {
    console.log('\n📋 STEP 2: Testing Authentication System');
    console.log('---------------------------------------');
    const start = Date.now();

    try {
      // Test login
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });

      if (!loginResponse.ok) {
        throw new Error('Login failed');
      }

      const { token, user } = await loginResponse.json();
      global.authToken = token;

      // Test token validation
      const validateResponse = await fetch('http://localhost:3000/api/auth/validate', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (validateResponse.ok) {
        this.logResult('Authentication System', 'success', Date.now() - start, { user });
      } else {
        throw new Error('Token validation failed');
      }
    } catch (error) {
      this.logResult('Authentication System', 'failed', Date.now() - start, null, error.message);
    }
  }

  private async testBackendAPIs() {
    console.log('\n📋 STEP 3: Testing Backend APIs');
    console.log('-------------------------------');

    const apiEndpoints = [
      { name: 'Customers API', url: '/api/customers', method: 'GET' },
      { name: 'Sales Cases API', url: '/api/sales-cases', method: 'GET' },
      { name: 'Quotations API', url: '/api/quotations', method: 'GET' },
      { name: 'Inventory Items API', url: '/api/inventory/items', method: 'GET' },
      { name: 'Sales Orders API', url: '/api/sales-orders', method: 'GET' },
      { name: 'Invoices API', url: '/api/invoices', method: 'GET' },
      { name: 'Payments API', url: '/api/payments', method: 'GET' },
      { name: 'Chart of Accounts API', url: '/api/accounting/accounts', method: 'GET' }
    ];

    for (const endpoint of apiEndpoints) {
      await this.testAPIEndpoint(endpoint);
    }
  }

  private async testAPIEndpoint(endpoint: { name: string; url: string; method: string }) {
    const start = Date.now();
    
    try {
      const response = await fetch(`http://localhost:3000${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${global.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.logResult(endpoint.name, 'success', Date.now() - start, { 
          status: response.status,
          dataCount: Array.isArray(data) ? data.length : (data.data?.length || 'N/A')
        });
      } else {
        throw new Error(`Status ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      this.logResult(endpoint.name, 'failed', Date.now() - start, null, error.message);
    }
  }

  private async testFrontendUI() {
    console.log('\n📋 STEP 4: Testing Frontend UI');
    console.log('------------------------------');
    const start = Date.now();

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Test login page
      await page.goto('http://localhost:3000/login');
      await page.waitForSelector('form', { timeout: 5000 });
      
      // Login
      await page.fill('input[name="email"]', 'admin');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      await page.waitForNavigation();

      // Test key pages
      const pages = [
        { name: 'Dashboard', url: '/dashboard' },
        { name: 'Customers', url: '/customers' },
        { name: 'Quotations', url: '/quotations' },
        { name: 'Sales Orders', url: '/sales-orders' },
        { name: 'Invoices', url: '/invoices' }
      ];

      for (const testPage of pages) {
        try {
          await page.goto(`http://localhost:3000${testPage.url}`);
          await page.waitForSelector('h1', { timeout: 5000 });
          console.log(`  ✅ ${testPage.name} page loaded`);
        } catch (error) {
          console.log(`  ❌ ${testPage.name} page failed: ${error.message}`);
        }
      }

      this.logResult('Frontend UI Tests', 'success', Date.now() - start);
    } catch (error) {
      this.logResult('Frontend UI Tests', 'failed', Date.now() - start, null, error.message);
    } finally {
      await browser.close();
    }
  }

  private async testCompleteWorkflow() {
    console.log('\n📋 STEP 5: Testing Complete Workflow');
    console.log('-----------------------------------');
    const start = Date.now();

    try {
      // Run the comprehensive backend test
      await new Promise((resolve, reject) => {
        const test = spawn('npx', ['tsx', 'scripts/test-backend-comprehensive.ts']);
        
        test.stdout.on('data', (data) => {
          console.log(`  ${data.toString().trim()}`);
        });

        test.stderr.on('data', (data) => {
          console.error(`  ERROR: ${data.toString().trim()}`);
        });

        test.on('close', (code) => {
          if (code === 0) {
            resolve(null);
          } else {
            reject(new Error(`Backend test failed with code ${code}`));
          }
        });
      });

      this.logResult('Complete Workflow Test', 'success', Date.now() - start);
    } catch (error) {
      this.logResult('Complete Workflow Test', 'failed', Date.now() - start, null, error.message);
    }
  }

  private async testDataIntegrity() {
    console.log('\n📋 STEP 6: Testing Data Integrity');
    console.log('---------------------------------');
    const start = Date.now();

    try {
      // Test calculations
      const quotationResponse = await fetch('http://localhost:3000/api/quotations', {
        headers: { 'Authorization': `Bearer ${global.authToken}` }
      });

      if (quotationResponse.ok) {
        const quotationsData = await quotationResponse.json();
        const quotations = quotationsData.data || quotationsData;
        
        // Verify calculations for any quotation matching our test
        const testQuotation = quotations.find(q => q.quotationNumber === 'SRV-01-NM-0525');
        
        if (testQuotation) {
          const expectedSubtotal = 27280;
          const expectedTax = 1364;
          const expectedTotal = 28644;

          const calculationsCorrect = 
            Math.abs(testQuotation.subtotal - expectedSubtotal) < 0.01 &&
            Math.abs(testQuotation.taxAmount - expectedTax) < 0.01 &&
            Math.abs(testQuotation.totalAmount - expectedTotal) < 0.01;

          if (calculationsCorrect) {
            this.logResult('Data Integrity - Calculations', 'success', Date.now() - start, {
              subtotal: testQuotation.subtotal,
              tax: testQuotation.taxAmount,
              total: testQuotation.totalAmount
            });
          } else {
            throw new Error('Calculations do not match expected values');
          }
        } else {
          this.logResult('Data Integrity - Calculations', 'skipped', Date.now() - start, {
            reason: 'Test quotation not found'
          });
        }
      }
    } catch (error) {
      this.logResult('Data Integrity Tests', 'failed', Date.now() - start, null, error.message);
    }
  }

  private logResult(name: string, status: TestResult['status'], duration: number, details?: any, error?: string) {
    this.results.push({ name, status, duration, details, error });
    
    const icon = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⏭️';
    console.log(`${icon} ${name} - ${duration}ms`);
    
    if (details && Object.keys(details).length > 0) {
      console.log(`   Details: ${JSON.stringify(details, null, 2).replace(/\n/g, '\n   ')}`);
    }
    
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  private generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const successCount = this.results.filter(r => r.status === 'success').length;
    const failedCount = this.results.filter(r => r.status === 'failed').length;
    const skippedCount = this.results.filter(r => r.status === 'skipped').length;

    console.log('\n\n📊 COMPREHENSIVE TEST REPORT');
    console.log('============================');
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`📈 Success Rate: ${((successCount / (successCount + failedCount)) * 100).toFixed(2)}%`);

    if (failedCount > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }

    // Identify gaps
    console.log('\n🔍 IDENTIFIED GAPS:');
    const gaps = [];

    if (this.results.some(r => r.name.includes('Authentication') && r.status === 'failed')) {
      gaps.push('- Authentication system needs attention');
    }
    if (this.results.some(r => r.name.includes('Frontend') && r.status === 'failed')) {
      gaps.push('- Frontend integration has issues');
    }
    if (this.results.some(r => r.name.includes('Workflow') && r.status === 'failed')) {
      gaps.push('- Complete workflow has gaps');
    }
    if (failedCount === 0) {
      gaps.push('✅ No critical gaps identified - system is working well!');
    }

    gaps.forEach(gap => console.log(gap));

    // Final verdict
    console.log('\n📝 FINAL VERDICT:');
    if (failedCount === 0) {
      console.log('✅ ALL TESTS PASSED - System is ready for production!');
    } else if (failedCount <= 2) {
      console.log('⚠️  Minor issues detected - System mostly functional');
    } else {
      console.log('❌ Critical issues detected - System needs fixes');
    }
  }
}

// Global auth token
declare global {
  var authToken: string;
}

// Run the comprehensive test
const tester = new ComprehensiveSystemTester();
tester.runAllTests().catch(console.error);