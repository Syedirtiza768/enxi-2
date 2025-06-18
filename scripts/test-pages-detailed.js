const puppeteer = require('puppeteer');

async function testPageDetailed(browser, url, name) {
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`  Console Error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`  Page Error: ${error.message}`);
  });
  
  try {
    console.log(`\n📄 Testing: ${name}`);
    console.log(`URL: ${url}`);
    
    // Navigate to page
    const response = await page.goto(`http://localhost:3000${url}`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log(`HTTP Status: ${response.status()}`);
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot
    await page.screenshot({ 
      path: `screenshots/${name.toLowerCase().replace(/\s+/g, '-')}.png`,
      fullPage: true 
    });
    
    // Check for specific error indicators
    const errors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('.error-message, [class*="error"], [class*="Error"]');
      const errors = [];
      errorElements.forEach(el => {
        const text = el.textContent.trim();
        if (text && !text.includes('ErrorBoundary')) {
          errors.push(text);
        }
      });
      return errors;
    });
    
    // Check for data indicators
    const dataInfo = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
      const lists = document.querySelectorAll('[class*="list"], [class*="List"]');
      const grids = document.querySelectorAll('[class*="grid"], [class*="Grid"]');
      
      return {
        tables: tables.length,
        cards: cards.length,
        lists: lists.length,
        grids: grids.length,
        hasData: tables.length > 0 || cards.length > 5 || lists.length > 0
      };
    });
    
    // Check page title
    const title = await page.title();
    console.log(`Page Title: ${title}`);
    
    if (errors.length > 0) {
      console.log(`❌ Errors found:`);
      errors.forEach(err => console.log(`   - ${err}`));
    } else if (dataInfo.hasData) {
      console.log(`✅ Page loaded successfully`);
      console.log(`   Tables: ${dataInfo.tables}, Cards: ${dataInfo.cards}, Lists: ${dataInfo.lists}, Grids: ${dataInfo.grids}`);
    } else {
      console.log(`⚠️  Page loaded but no clear data indicators`);
    }
    
    // Check for specific content
    const pageContent = await page.content();
    if (pageContent.includes('Loading') || pageContent.includes('loading')) {
      console.log(`⏳ Loading indicators still present`);
    }
    
  } catch (error) {
    console.log(`❌ Failed to test: ${error.message}`);
  } finally {
    await page.close();
  }
}

async function runDetailedTests() {
  console.log('🧪 Detailed Page Testing for Enxi ERP');
  console.log('=====================================\n');

  // Create screenshots directory
  const fs = require('fs');
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
  }

  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // First, login
    console.log('🔐 Logging in...');
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Fill login form
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'admin123');
    
    // Click login button and wait for navigation
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Login successful\n');
      
      // Get auth token from localStorage
      const token = await page.evaluate(() => {
        return localStorage.getItem('auth-token');
      });
      console.log(`Auth Token: ${token ? token.substring(0, 50) + '...' : 'Not found'}`);
      
      await page.close();
    } else {
      console.log('❌ Login failed');
      await browser.close();
      return;
    }
    
    // Test problem pages in detail
    const problemPages = [
      { url: '/leads', name: 'Leads' },
      { url: '/suppliers', name: 'Suppliers' },
      // Also test a working page for comparison
      { url: '/customers', name: 'Customers' },
    ];
    
    for (const pageInfo of problemPages) {
      await testPageDetailed(browser, pageInfo.url, pageInfo.name);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\n✅ Detailed testing complete!');
  console.log('📸 Screenshots saved in ./screenshots/');
}

// Run the test
runDetailedTests().catch(console.error);