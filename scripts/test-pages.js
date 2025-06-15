const puppeteer = require('puppeteer');

const pages = [
  { url: '/dashboard', name: 'Dashboard' },
  { url: '/leads', name: 'Leads' },
  { url: '/sales-cases', name: 'Sales Cases' },
  { url: '/quotations', name: 'Quotations' },
  { url: '/customers', name: 'Customers' },
  { url: '/sales-orders', name: 'Sales Orders' },
  { url: '/invoices', name: 'Invoices' },
  { url: '/payments', name: 'Payments' },
  { url: '/inventory/items', name: 'Inventory Items' },
  { url: '/inventory/movements', name: 'Stock Movements' },
  { url: '/purchase-orders', name: 'Purchase Orders' },
  { url: '/suppliers', name: 'Suppliers' },
  { url: '/accounting/accounts', name: 'Accounting Accounts' },
  { url: '/accounting/journal-entries', name: 'Journal Entries' },
  { url: '/shipments', name: 'Shipments' },
];

async function testPages() {
  console.log('🧪 Testing Enxi ERP Pages with Authentication');
  console.log('============================================\n');

  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // First, login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Fill login form
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'admin123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Login successful\n');
    } else {
      console.log('❌ Login failed - still on:', currentUrl);
      await browser.close();
      return;
    }
    
    // Test each page
    console.log('2. Testing pages...\n');
    
    for (const pageInfo of pages) {
      console.log(`Testing: ${pageInfo.name}`);
      console.log(`URL: ${pageInfo.url}`);
      
      try {
        await page.goto(`http://localhost:3000${pageInfo.url}`, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Check for error messages
        const errorElement = await page.$('.error-message, [class*="error"], [class*="Error"]');
        const loadingElement = await page.$('[class*="loading"], [class*="Loading"], [class*="spinner"], [class*="Spinner"]');
        
        // Wait a bit for data to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if there's data or content
        const pageContent = await page.content();
        const hasData = pageContent.includes('table') || 
                       pageContent.includes('card') || 
                       pageContent.includes('list') ||
                       pageContent.includes('data-') ||
                       pageContent.includes('Total') ||
                       pageContent.includes('Count');
        
        if (errorElement) {
          const errorText = await page.evaluate(el => el.textContent, errorElement);
          console.log(`❌ Error found: ${errorText}`);
        } else if (loadingElement) {
          console.log('⏳ Page still loading after 2s');
        } else if (hasData) {
          console.log('✅ Page loaded with data');
        } else {
          console.log('⚠️  Page loaded but no clear data indicators found');
        }
        
      } catch (error) {
        console.log(`❌ Failed to load: ${error.message}`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
  
  console.log('✅ Page testing complete!');
}

// Run the test
testPages().catch(console.error);