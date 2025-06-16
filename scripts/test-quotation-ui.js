const puppeteer = require('puppeteer');
const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

// Configuration
const BASE_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testQuotationUI() {
  let browser;
  
  try {
    console.log('=== Starting Puppeteer UI Test ===\n');
    
    // Get test data
    const quotation = await prisma.quotation.findFirst({
      where: { quotationNumber: 'QUOT-2025-0088' },
      include: {
        salesCase: {
          include: { customer: true }
        },
        items: true
      }
    });

    if (!quotation) {
      console.error('Test quotation not found. Please run create-test-quotation.js first.');
      return;
    }

    console.log('Found test quotation:', quotation.quotationNumber);
    console.log('Customer:', quotation.salesCase.customer.name);

    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: {
        width: 1280,
        height: 800
      }
    });

    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    page.on('pageerror', error => console.log('Browser error:', error.message));

    // 1. Navigate to quotations page directly (assume we're already logged in via cookies)
    console.log('1. Navigating to quotations page...');
    await page.goto(`${BASE_URL}/quotations`, { waitUntil: 'networkidle2' });
    
    // Check if we need to login
    if (page.url().includes('/login')) {
      console.log('   Need to login first...');
      
      // Create a test user session directly in the database
      const user = await prisma.user.findFirst({
        where: { username: 'admin' }
      });
      
      if (!user) {
        console.log('   Creating admin user...');
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await prisma.user.create({
          data: {
            username: 'admin',
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      
      // Try to login
      await page.type('input[name="username"], input[type="text"]', 'admin');
      await page.type('input[name="password"], input[type="password"]', 'admin123');
      
      // Submit form
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
      ]);
      
      console.log('   ✓ Login successful');
      
      // Navigate to quotations again
      await page.goto(`${BASE_URL}/quotations`, { waitUntil: 'networkidle2' });
    }
    
    // 2. Take screenshot of quotations list
    console.log('\n2. Taking screenshot of quotations list...');
    await page.screenshot({ 
      path: 'screenshots/quotations-list.png',
      fullPage: true 
    });
    console.log('   ✓ Screenshot saved: screenshots/quotations-list.png');

    // 3. Search for our quotation
    console.log('\n3. Looking for quotation in the list...');
    
    // Try different selectors for the quotation
    const quotationSelectors = [
      `text/${quotation.quotationNumber}`,
      `[data-testid="quotation-${quotation.id}"]`,
      `tr:has-text("${quotation.quotationNumber}")`,
      `a[href*="${quotation.id}"]`
    ];
    
    let quotationElement = null;
    for (const selector of quotationSelectors) {
      try {
        quotationElement = await page.$(selector);
        if (quotationElement) {
          console.log(`   ✓ Found quotation using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (quotationElement) {
      // 4. Click on the quotation
      console.log('\n4. Opening quotation details...');
      await quotationElement.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Take screenshot of details page
      await delay(2000); // Wait for any animations
      await page.screenshot({ 
        path: 'screenshots/quotation-details.png',
        fullPage: true 
      });
      console.log('   ✓ Screenshot saved: screenshots/quotation-details.png');
      
      // 5. Look for PDF download button
      console.log('\n5. Looking for PDF download option...');
      const pdfSelectors = [
        'button:has-text("PDF")',
        'button:has-text("Download")',
        'button:has-text("Export")',
        'a[href*="/pdf"]',
        '[data-testid="download-pdf"]'
      ];
      
      let pdfButton = null;
      for (const selector of pdfSelectors) {
        try {
          pdfButton = await page.$(selector);
          if (pdfButton) {
            console.log(`   ✓ Found PDF button using selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (pdfButton) {
        console.log('   ✓ PDF download option available');
      } else {
        console.log('   ! PDF download option not found');
      }
      
      // 6. Check status update options
      console.log('\n6. Checking available actions...');
      const actions = [];
      
      if (await page.$('button:has-text("Send")')) actions.push('Send');
      if (await page.$('button:has-text("Accept")')) actions.push('Accept');
      if (await page.$('button:has-text("Reject")')) actions.push('Reject');
      if (await page.$('button:has-text("Cancel")')) actions.push('Cancel');
      if (await page.$('button:has-text("Edit")')) actions.push('Edit');
      
      console.log('   Available actions:', actions.join(', ') || 'None');
      
    } else {
      console.log('   ! Could not find quotation in the list');
      
      // Take a screenshot to debug
      await page.screenshot({ 
        path: 'screenshots/quotations-list-debug.png',
        fullPage: true 
      });
      console.log('   Debug screenshot saved: screenshots/quotations-list-debug.png');
    }

    // 7. Test PDF generation via direct API call
    console.log('\n7. Testing PDF generation API...');
    const pdfUrl = `${BASE_URL}/api/quotations/${quotation.id}/pdf`;
    console.log('   PDF URL:', pdfUrl);
    
    // Navigate directly to PDF URL
    const pdfResponse = await page.goto(pdfUrl, { waitUntil: 'networkidle2' });
    
    if (pdfResponse && pdfResponse.ok()) {
      const contentType = pdfResponse.headers()['content-type'];
      console.log('   ✓ PDF endpoint responded');
      console.log('   Content-Type:', contentType);
      
      if (contentType && contentType.includes('application/pdf')) {
        console.log('   ✓ Valid PDF response');
      } else {
        console.log('   ! Response is not a PDF');
        // Take screenshot of the response
        await page.screenshot({ 
          path: 'screenshots/pdf-response.png',
          fullPage: true 
        });
      }
    } else {
      console.log('   ! PDF endpoint error:', pdfResponse?.status());
    }

    console.log('\n=== UI Test Completed ===\n');

  } catch (error) {
    console.error('Test error:', error);
    
    // Take error screenshot
    if (browser) {
      const pages = await browser.pages();
      if (pages.length > 0) {
        await pages[0].screenshot({ 
          path: 'screenshots/error.png', 
          fullPage: true 
        });
        console.log('Error screenshot saved: screenshots/error.png');
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    await prisma.$disconnect();
  }
}

// Create screenshots directory
const fs = require('fs');
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

// Run the test
testQuotationUI().catch(console.error);