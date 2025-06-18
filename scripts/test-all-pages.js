const puppeteer = require('puppeteer');

const allPages = [
  // Dashboard
  { url: '/dashboard', name: 'Dashboard', module: 'Core' },
  
  // Sales Module
  { url: '/leads', name: 'Leads', module: 'Sales' },
  { url: '/sales-cases', name: 'Sales Cases', module: 'Sales' },
  { url: '/quotations', name: 'Quotations', module: 'Sales' },
  { url: '/customers', name: 'Customers', module: 'Sales' },
  { url: '/sales-orders', name: 'Sales Orders', module: 'Sales' },
  { url: '/customer-pos', name: 'Customer POs', module: 'Sales' },
  
  // Finance Module
  { url: '/invoices', name: 'Invoices', module: 'Finance' },
  { url: '/payments', name: 'Payments', module: 'Finance' },
  { url: '/supplier-invoices', name: 'Supplier Invoices', module: 'Finance' },
  { url: '/supplier-payments', name: 'Supplier Payments', module: 'Finance' },
  
  // Inventory Module
  { url: '/inventory', name: 'Inventory Dashboard', module: 'Inventory' },
  { url: '/inventory/items', name: 'Inventory Items', module: 'Inventory' },
  { url: '/inventory/movements', name: 'Stock Movements', module: 'Inventory' },
  { url: '/inventory/categories', name: 'Categories', module: 'Inventory' },
  { url: '/inventory/stock-in', name: 'Stock In', module: 'Inventory' },
  { url: '/inventory/stock-out', name: 'Stock Out', module: 'Inventory' },
  
  // Procurement Module
  { url: '/purchase-orders', name: 'Purchase Orders', module: 'Procurement' },
  { url: '/suppliers', name: 'Suppliers', module: 'Procurement' },
  { url: '/goods-receipts', name: 'Goods Receipts', module: 'Procurement' },
  
  // Accounting Module
  { url: '/accounting', name: 'Accounting Dashboard', module: 'Accounting' },
  { url: '/accounting/accounts', name: 'Chart of Accounts', module: 'Accounting' },
  { url: '/accounting/journal-entries', name: 'Journal Entries', module: 'Accounting' },
  { url: '/accounting/reports/trial-balance', name: 'Trial Balance', module: 'Accounting' },
  { url: '/accounting/reports/balance-sheet', name: 'Balance Sheet', module: 'Accounting' },
  { url: '/accounting/reports/income-statement', name: 'Income Statement', module: 'Accounting' },
  
  // Logistics Module
  { url: '/shipments', name: 'Shipments', module: 'Logistics' },
  
  // Admin Module
  { url: '/users', name: 'Users', module: 'Admin' },
  { url: '/roles', name: 'Roles', module: 'Admin' },
  { url: '/audit', name: 'Audit Log', module: 'Admin' },
  { url: '/settings/company', name: 'Company Settings', module: 'Admin' },
  { url: '/system/health', name: 'System Health', module: 'Admin' },
];

async function testAllPages() {
  console.log('🧪 Comprehensive Page Testing for Enxi ERP');
  console.log('==========================================\n');
  console.log(`Total pages to test: ${allPages.length}`);
  console.log('==========================================\n');

  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = {
    total: allPages.length,
    success: 0,
    failed: 0,
    warnings: 0,
    byModule: {}
  };
  
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginPage = await browser.newPage();
    await loginPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    await loginPage.type('input[type="text"]', 'admin');
    await loginPage.type('input[type="password"]', 'admin123');
    
    await Promise.all([
      loginPage.click('button[type="submit"]'),
      loginPage.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    
    if (loginPage.url().includes('/dashboard')) {
      console.log('✅ Login successful\n');
      await loginPage.close();
    } else {
      console.log('❌ Login failed');
      await browser.close();
      return;
    }
    
    // Test each page
    for (const [index, pageInfo] of allPages.entries()) {
      const page = await browser.newPage();
      
      // Suppress console errors for cleaner output
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Failed to load resource')) {
          // Ignore resource loading errors
        }
      });
      
      try {
        console.log(`[${index + 1}/${allPages.length}] Testing: ${pageInfo.name} (${pageInfo.module})`);
        
        const response = await page.goto(`http://localhost:3000${pageInfo.url}`, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Wait for content
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for errors
        const hasErrors = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('.error-message, [class*="error"]:not([class*="ErrorBoundary"])');
          for (const el of errorElements) {
            const text = el.textContent.trim();
            if (text && text.length > 0 && !text.includes('No data') && !text.includes('No records')) {
              return true;
            }
          }
          return false;
        });
        
        // Check for data
        const pageStats = await page.evaluate(() => {
          return {
            tables: document.querySelectorAll('table').length,
            forms: document.querySelectorAll('form').length,
            buttons: document.querySelectorAll('button').length,
            links: document.querySelectorAll('a').length
          };
        });
        
        // Initialize module results
        if (!results.byModule[pageInfo.module]) {
          results.byModule[pageInfo.module] = { success: 0, failed: 0, warnings: 0 };
        }
        
        if (response.status() !== 200) {
          console.log(`  ❌ HTTP ${response.status()}`);
          results.failed++;
          results.byModule[pageInfo.module].failed++;
        } else if (hasErrors) {
          console.log(`  ⚠️  Page has errors`);
          results.warnings++;
          results.byModule[pageInfo.module].warnings++;
        } else {
          console.log(`  ✅ Success (Tables: ${pageStats.tables}, Forms: ${pageStats.forms})`);
          results.success++;
          results.byModule[pageInfo.module].success++;
        }
        
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        results.failed++;
        if (!results.byModule[pageInfo.module]) {
          results.byModule[pageInfo.module] = { success: 0, failed: 0, warnings: 0 };
        }
        results.byModule[pageInfo.module].failed++;
      } finally {
        await page.close();
      }
    }
    
  } catch (error) {
    console.error('Test suite failed:', error);
  } finally {
    await browser.close();
  }
  
  // Print summary
  console.log('\n==========================================');
  console.log('📊 TEST SUMMARY');
  console.log('==========================================');
  console.log(`Total Pages Tested: ${results.total}`);
  console.log(`✅ Successful: ${results.success} (${((results.success/results.total)*100).toFixed(1)}%)`);
  console.log(`⚠️  Warnings: ${results.warnings} (${((results.warnings/results.total)*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${results.failed} (${((results.failed/results.total)*100).toFixed(1)}%)`);
  
  console.log('\n📦 Results by Module:');
  for (const [module, stats] of Object.entries(results.byModule)) {
    const total = stats.success + stats.warnings + stats.failed;
    console.log(`\n${module}:`);
    console.log(`  ✅ Success: ${stats.success}/${total}`);
    if (stats.warnings > 0) console.log(`  ⚠️  Warnings: ${stats.warnings}/${total}`);
    if (stats.failed > 0) console.log(`  ❌ Failed: ${stats.failed}/${total}`);
  }
  
  console.log('\n✅ Testing complete!');
  
  // Overall status
  if (results.failed === 0 && results.warnings === 0) {
    console.log('\n🎉 All pages are working perfectly!');
  } else if (results.failed === 0) {
    console.log('\n✅ All pages are accessible, some have minor warnings.');
  } else {
    console.log('\n⚠️  Some pages need attention.');
  }
}

// Run the test
testAllPages().catch(console.error);