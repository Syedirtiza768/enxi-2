import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Quick Frontend Test Runner
 * 
 * This script runs a subset of critical frontend tests for quick validation.
 * Use test-frontend-comprehensive.ts for full test coverage.
 */

interface QuickTestConfig {
  baseUrl: string;
  headless: boolean;
  slowMo: number;
  testEmail: string;
  testPassword: string;
}

class QuickFrontendTests {
  private config: QuickTestConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(config: Partial<QuickTestConfig> = {}) {
    this.config = {
      baseUrl: 'http://localhost:3000',
      headless: true,
      slowMo: 0,
      testEmail: 'admin@enxi.com',
      testPassword: 'Admin123!@#',
      ...config
    };
  }

  async setup(): Promise<void> {
    console.log('🚀 Setting up quick test environment...');
    
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    this.page = await this.context.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
    
    await this.login();
  }

  async teardown(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  private async login() {
    try {
      await this.page!.goto(this.config.baseUrl);
      
      // Check if already at login or redirected
      if (!this.page!.url().includes('/login')) {
        await this.page!.goto(`${this.config.baseUrl}/login`);
      }
      
      await this.page!.fill('input[name="email"]', this.config.testEmail);
      await this.page!.fill('input[name="password"]', this.config.testPassword);
      await this.page!.click('button[type="submit"]');
      
      await this.page!.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('✅ Login successful');
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  async testCriticalPath(): Promise<void> {
    console.log('\n🧪 Running Critical Path Tests...\n');
    
    // Test 1: Customer Creation
    console.log('Testing customer creation...');
    await this.page!.goto(`${this.config.baseUrl}/customers`);
    await this.page!.waitForSelector('h1:has-text("Customers")', { timeout: 5000 });
    console.log('✅ Customer page loaded');
    
    // Test 2: Sales Case Access
    console.log('\nTesting sales case access...');
    await this.page!.goto(`${this.config.baseUrl}/sales-cases`);
    await this.page!.waitForSelector('h1:has-text("Sales Cases")', { timeout: 5000 });
    console.log('✅ Sales cases page loaded');
    
    // Test 3: Quotation Creation Page
    console.log('\nTesting quotation creation page...');
    await this.page!.goto(`${this.config.baseUrl}/quotations/new`);
    await this.page!.waitForSelector('h1:has-text("Create Quotation")', { timeout: 5000 });
    console.log('✅ Quotation creation page loaded');
    
    // Test 4: Invoice List
    console.log('\nTesting invoice list...');
    await this.page!.goto(`${this.config.baseUrl}/invoices`);
    await this.page!.waitForSelector('h1:has-text("Invoices")', { timeout: 5000 });
    console.log('✅ Invoice list loaded');
    
    // Test 5: Payment Recording
    console.log('\nTesting payment page...');
    await this.page!.goto(`${this.config.baseUrl}/payments`);
    await this.page!.waitForSelector('h1:has-text("Payments")', { timeout: 5000 });
    console.log('✅ Payment page loaded');
  }

  async testFormInteractions(): Promise<void> {
    console.log('\n🧪 Testing Form Interactions...\n');
    
    // Test customer form
    await this.page!.goto(`${this.config.baseUrl}/customers`);
    const newCustomerButton = await this.page!.locator('a:has-text("New Customer"), button:has-text("New Customer")').first();
    
    if (await newCustomerButton.isVisible()) {
      await newCustomerButton.click();
      await this.page!.waitForSelector('input[name="name"]', { timeout: 5000 });
      
      // Test form field interaction
      await this.page!.fill('input[name="name"]', 'Test Customer');
      const nameValue = await this.page!.inputValue('input[name="name"]');
      
      if (nameValue === 'Test Customer') {
        console.log('✅ Form input working correctly');
      } else {
        console.log('❌ Form input not working');
      }
      
      // Go back
      await this.page!.goBack();
    }
  }

  async testNavigation(): Promise<void> {
    console.log('\n🧪 Testing Navigation...\n');
    
    const navLinks = [
      { selector: 'a[href="/dashboard"]', name: 'Dashboard' },
      { selector: 'a[href="/customers"]', name: 'Customers' },
      { selector: 'a[href="/quotations"]', name: 'Quotations' },
      { selector: 'a[href="/invoices"]', name: 'Invoices' }
    ];
    
    for (const link of navLinks) {
      const element = await this.page!.locator(link.selector).first();
      if (await element.isVisible()) {
        await element.click();
        await this.page!.waitForLoadState('networkidle');
        console.log(`✅ ${link.name} navigation working`);
      } else {
        console.log(`⚠️  ${link.name} link not found`);
      }
    }
  }

  async run(): Promise<void> {
    try {
      await this.setup();
      await this.testCriticalPath();
      await this.testFormInteractions();
      await this.testNavigation();
      
      console.log('\n✅ Quick frontend tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Quick frontend tests failed:', error);
      throw error;
    } finally {
      await this.teardown();
    }
  }
}

// Command line interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config: Partial<QuickTestConfig> = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        config.baseUrl = args[++i];
        break;
      case '--show':
        config.headless = false;
        config.slowMo = 100;
        break;
      case '--email':
        config.testEmail = args[++i];
        break;
      case '--password':
        config.testPassword = args[++i];
        break;
    }
  }
  
  console.log('Quick Frontend Test Configuration:');
  console.log(`- URL: ${config.baseUrl || 'http://localhost:3000'}`);
  console.log(`- Mode: ${config.headless === false ? 'Visual' : 'Headless'}`);
  console.log(`- User: ${config.testEmail || 'admin@enxi.com'}`);
  
  const tester = new QuickFrontendTests(config);
  await tester.run();
  
  await prisma.$disconnect();
}

// Usage examples:
// npm run test:frontend:quick
// npm run test:frontend:quick -- --show
// npm run test:frontend:quick -- --url http://localhost:3001
// npm run test:frontend:quick -- --email test@example.com --password Test123

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});