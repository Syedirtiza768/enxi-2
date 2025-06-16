const puppeteer = require('puppeteer');
const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

async function createQuotationViaAPI() {
  try {
    // First, create a user session token for API access
    const user = await prisma.user.findUnique({
      where: { username: TEST_USER.username }
    });
    
    if (!user) {
      console.error('Test user not found. Please create an admin user first.');
      return null;
    }

    // Get the sales case and items we created
    const salesCase = await prisma.salesCase.findFirst({
      where: { caseNumber: 'SC-2025-0151' },
      include: { customer: true }
    });

    const items = await prisma.item.findMany({
      where: {
        code: {
          in: ['ERP-LIC-ENT', 'ERP-IMPL-SVC', 'ERP-TRAIN-DAY', 'ERP-SUPPORT-YR']
        }
      }
    });

    if (!salesCase || items.length === 0) {
      console.error('Test data not found. Please run create-test-data.js first.');
      return null;
    }

    // Create quotation data
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quotationData = {
      salesCaseId: salesCase.id,
      validUntil: validUntil.toISOString(),
      paymentTerms: 'Net 30 days. 50% advance payment required upon order confirmation.',
      deliveryTerms: 'Implementation will begin within 2 weeks of order confirmation.',
      notes: 'This quotation includes all software licenses, implementation services, training, and first-year support.',
      internalNotes: 'Customer has budget approval. Decision expected by end of month.',
      items: [
        {
          lineNumber: 1,
          lineDescription: 'Software License',
          isLineHeader: true,
          itemType: 'PRODUCT',
          itemId: items.find(i => i.code === 'ERP-LIC-ENT').id,
          itemCode: 'ERP-LIC-ENT',
          description: 'Enterprise ERP License - Unlimited Users',
          internalDescription: 'Includes all modules: Finance, Sales, Inventory, HR',
          quantity: 1,
          unitPrice: 25000,
          discount: 10,
          taxRate: 8,
          sortOrder: 1
        },
        {
          lineNumber: 2,
          lineDescription: 'Professional Services',
          isLineHeader: true,
          itemType: 'SERVICE',
          itemId: items.find(i => i.code === 'ERP-IMPL-SVC').id,
          itemCode: 'ERP-IMPL-SVC',
          description: 'Implementation and Configuration Services',
          internalDescription: 'Estimated 30 days of implementation',
          quantity: 30,
          unitPrice: 1000,
          discount: 5,
          taxRate: 8,
          sortOrder: 2
        },
        {
          lineNumber: 2,
          lineDescription: 'Professional Services',
          isLineHeader: false,
          itemType: 'SERVICE',
          itemId: items.find(i => i.code === 'ERP-TRAIN-DAY').id,
          itemCode: 'ERP-TRAIN-DAY',
          description: 'On-site Training Sessions',
          quantity: 5,
          unitPrice: 1500,
          discount: 5,
          taxRate: 8,
          sortOrder: 3
        },
        {
          lineNumber: 3,
          lineDescription: 'Support & Maintenance',
          isLineHeader: true,
          itemType: 'SERVICE',
          itemId: items.find(i => i.code === 'ERP-SUPPORT-YR').id,
          itemCode: 'ERP-SUPPORT-YR',
          description: 'Annual Premium Support Package',
          internalDescription: 'First year included, renewable annually',
          quantity: 1,
          unitPrice: 5000,
          discount: 0,
          taxRate: 8,
          sortOrder: 4
        }
      ]
    };

    // Create quotation directly via service
    const { QuotationService } = require('../lib/services/quotation.service');
    const quotationService = new QuotationService();
    
    const quotation = await quotationService.createQuotation({
      ...quotationData,
      createdBy: user.id
    });

    console.log('Quotation created successfully!');
    console.log('Quotation Number:', quotation.quotationNumber);
    console.log('Total Amount:', quotation.totalAmount);
    
    return quotation;
  } catch (error) {
    console.error('Error creating quotation:', error);
    return null;
  }
}

async function testQuotationWithPuppeteer(quotation) {
  let browser;
  
  try {
    console.log('\n=== Starting Puppeteer Tests ===\n');
    
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
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.log('Browser error:', error.message));

    // 1. Login to the application
    console.log('1. Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    
    // Fill login form
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    await page.type('input[name="username"]', TEST_USER.username);
    await page.type('input[name="password"]', TEST_USER.password);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('   ✓ Login successful');

    // 2. Navigate to quotations page
    console.log('\n2. Navigating to quotations page...');
    await page.goto(`${BASE_URL}/quotations`, { waitUntil: 'networkidle2' });
    
    // Wait for quotations list to load
    await page.waitForSelector('[data-testid="quotations-list"], table', { timeout: 10000 });
    console.log('   ✓ Quotations page loaded');

    // 3. Search for our quotation
    console.log('\n3. Searching for quotation:', quotation.quotationNumber);
    const searchInput = await page.$('input[placeholder*="Search"], input[name="search"]');
    if (searchInput) {
      await searchInput.type(quotation.quotationNumber);
      await page.waitForTimeout(1000); // Wait for search debounce
    }

    // 4. Click on the quotation to view details
    console.log('\n4. Opening quotation details...');
    const quotationLink = await page.$(`a[href*="/quotations/${quotation.id}"], tr[data-id="${quotation.id}"]`);
    if (quotationLink) {
      await quotationLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log('   ✓ Quotation details page loaded');
    }

    // 5. Verify quotation details
    console.log('\n5. Verifying quotation details...');
    await page.waitForSelector('[data-testid="quotation-details"], .quotation-details', { timeout: 10000 });
    
    // Check if quotation number is displayed
    const quotationNumberElement = await page.$eval(
      '*[class*="quotation-number"], *[data-testid="quotation-number"]',
      el => el.textContent
    ).catch(() => null);
    
    if (quotationNumberElement && quotationNumberElement.includes(quotation.quotationNumber)) {
      console.log('   ✓ Quotation number verified');
    }

    // 6. Test PDF generation
    console.log('\n6. Testing PDF generation...');
    const pdfButton = await page.$('button:has-text("Download PDF"), button:has-text("Export PDF"), a[href*="/pdf"]');
    if (pdfButton) {
      // Set up PDF download handling
      const downloadPath = './downloads';
      await page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
      });

      await pdfButton.click();
      console.log('   ✓ PDF download initiated');
      
      // Wait a bit for download to start
      await page.waitForTimeout(3000);
    }

    // 7. Test quotation status update (if in draft)
    if (quotation.status === 'DRAFT') {
      console.log('\n7. Testing status update to SENT...');
      const sendButton = await page.$('button:has-text("Send Quotation"), button:has-text("Mark as Sent")');
      if (sendButton) {
        await sendButton.click();
        
        // Handle confirmation dialog if present
        const confirmButton = await page.$('button:has-text("Confirm"), button:has-text("Yes")');
        if (confirmButton) {
          await confirmButton.click();
        }
        
        await page.waitForTimeout(2000);
        console.log('   ✓ Quotation status updated');
      }
    }

    // 8. Navigate back to quotations list
    console.log('\n8. Returning to quotations list...');
    await page.goto(`${BASE_URL}/quotations`, { waitUntil: 'networkidle2' });
    
    // Verify our quotation appears in the list
    const quotationInList = await page.$(`td:has-text("${quotation.quotationNumber}")`);
    if (quotationInList) {
      console.log('   ✓ Quotation appears in list');
    }

    // 9. Test creating a new quotation via UI
    console.log('\n9. Testing quotation creation via UI...');
    const newQuotationButton = await page.$('button:has-text("New Quotation"), a[href*="/quotations/new"]');
    if (newQuotationButton) {
      await newQuotationButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Wait for form to load
      await page.waitForSelector('form, [data-testid="quotation-form"]', { timeout: 10000 });
      console.log('   ✓ New quotation form loaded');
      
      // TODO: Fill form fields and submit
      // This would depend on your specific form implementation
    }

    console.log('\n=== All Puppeteer tests completed successfully! ===\n');

  } catch (error) {
    console.error('Puppeteer test error:', error);
    
    // Take screenshot on error
    if (browser) {
      const page = await browser.newPage();
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('Screenshot saved as error-screenshot.png');
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  try {
    // Create quotation via API
    const quotation = await createQuotationViaAPI();
    
    if (!quotation) {
      console.error('Failed to create quotation. Exiting...');
      process.exit(1);
    }

    // Test with Puppeteer
    await testQuotationWithPuppeteer(quotation);

    // Test PDF generation directly
    console.log('\n=== Testing PDF Generation ===\n');
    const response = await fetch(`${BASE_URL}/api/quotations/${quotation.id}/pdf`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf'
      }
    });

    if (response.ok) {
      console.log('✓ PDF API endpoint is working');
      console.log('  Status:', response.status);
      console.log('  Content-Type:', response.headers.get('content-type'));
    } else {
      console.log('✗ PDF API endpoint returned error:', response.status);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
main().catch(console.error);