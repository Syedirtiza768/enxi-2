import { Page, expect } from '@playwright/test';

/**
 * Test utility functions and helpers
 */

export class TestHelpers {
  static async generateRandomString(length: number = 8): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static async generateRandomEmail(): Promise<string> {
    const randomString = await this.generateRandomString(8);
    return `test${randomString}@enxi-test.com`;
  }

  static async generateRandomPhone(): Promise<string> {
    const number = Math.floor(Math.random() * 900000000) + 100000000;
    return `+971-50-${number.toString().slice(0, 3)}-${number.toString().slice(3, 7)}`;
  }

  static async formatCurrency(amount: number, currency: string = 'AED'): Promise<string> {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  static async formatDate(date: Date | string, format: string = 'DD/MM/YYYY'): Promise<string> {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      default:
        return `${day}/${month}/${year}`;
    }
  }

  static async waitForResponse(page: Page, urlPattern: string | RegExp, timeout: number = 30000): Promise<any> {
    const response = await page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );
    return response.json();
  }

  static async mockApiResponse(page: Page, urlPattern: string, responseData: any, statusCode: number = 200) {
    await page.route(`**/${urlPattern}`, async route => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }

  static async mockApiError(page: Page, urlPattern: string, statusCode: number = 500, errorMessage: string = 'Internal Server Error') {
    await page.route(`**/${urlPattern}`, async route => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({ error: errorMessage })
      });
    });
  }

  static async interceptApiCall(page: Page, urlPattern: string): Promise<any[]> {
    const requests: any[] = [];
    
    await page.route(`**/${urlPattern}`, async route => {
      const request = route.request();
      requests.push({
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        postData: request.postData()
      });
      
      await route.continue();
    });
    
    return requests;
  }

  static async takePageScreenshot(page: Page, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    await page.screenshot({ 
      path: `e2e-test-results/screenshots/${filename}`,
      fullPage: true
    });
    return filename;
  }

  static async takeElementScreenshot(page: Page, selector: string, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-element-${timestamp}.png`;
    const element = page.locator(selector);
    await element.screenshot({ 
      path: `e2e-test-results/screenshots/${filename}`
    });
    return filename;
  }

  static async measureElementLoadTime(page: Page, selector: string): Promise<number> {
    const startTime = Date.now();
    await page.waitForSelector(selector, { state: 'visible' });
    return Date.now() - startTime;
  }

  static async scrollToElement(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.scrollIntoViewIfNeeded();
  }

  static async dragAndDrop(page: Page, sourceSelector: string, targetSelector: string) {
    const source = page.locator(sourceSelector);
    const target = page.locator(targetSelector);
    
    await source.dragTo(target);
  }

  static async hoverOverElement(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.hover();
  }

  static async doubleClickElement(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.dblclick();
  }

  static async rightClickElement(page: Page, selector: string) {
    const element = page.locator(selector);
    await element.click({ button: 'right' });
  }

  static async selectAllText(page: Page, selector: string) {
    await page.locator(selector).click();
    await page.keyboard.press('Control+A');
  }

  static async copyText(page: Page, selector: string): Promise<string> {
    await this.selectAllText(page, selector);
    await page.keyboard.press('Control+C');
    
    // Get clipboard content (note: this may not work in all test environments)
    return await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  }

  static async pasteText(page: Page, selector: string, text?: string) {
    if (text) {
      await page.evaluate((text) => navigator.clipboard.writeText(text), text);
    }
    
    await page.locator(selector).click();
    await page.keyboard.press('Control+V');
  }

  static async generateTestData() {
    return {
      customer: {
        name: `Test Customer ${await this.generateRandomString(6)}`,
        email: await this.generateRandomEmail(),
        phone: await this.generateRandomPhone(),
        address: '123 Test Street, Dubai, UAE',
        city: 'Dubai',
        country: 'UAE',
        industry: 'Testing',
        creditLimit: '50000.00',
        paymentTerms: 'NET_30'
      },
      supplier: {
        name: `Test Supplier ${await this.generateRandomString(6)}`,
        email: await this.generateRandomEmail(),
        phone: await this.generateRandomPhone(),
        address: '456 Supplier Avenue, Dubai, UAE',
        city: 'Dubai',
        country: 'UAE',
        category: 'Test Supplies',
        paymentTerms: 'NET_30'
      },
      lead: {
        companyName: `Test Lead Company ${await this.generateRandomString(6)}`,
        contactName: `Contact ${await this.generateRandomString(4)}`,
        email: await this.generateRandomEmail(),
        phone: await this.generateRandomPhone(),
        source: 'WEBSITE',
        industry: 'Testing',
        estimatedValue: '25000.00',
        expectedCloseDate: await this.formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'YYYY-MM-DD'),
        notes: 'Test lead for E2E testing',
        priority: 'MEDIUM'
      },
      inventoryItem: {
        name: `Test Item ${await this.generateRandomString(6)}`,
        description: 'Test inventory item for E2E testing',
        sku: `TEST-${await this.generateRandomString(6)}`,
        unitPrice: '100.00',
        costPrice: '75.00',
        quantityOnHand: '10',
        reorderLevel: '5',
        unitOfMeasure: 'EACH'
      }
    };
  }

  static async validateFormField(
    page: Page, 
    fieldSelector: string, 
    validValue: string, 
    invalidValue: string, 
    expectedErrorMessage: string
  ) {
    // Test with invalid value
    await page.fill(fieldSelector, invalidValue);
    await page.keyboard.press('Tab'); // Trigger validation
    
    const errorElement = page.locator(`text=${expectedErrorMessage}`);
    await expect(errorElement).toBeVisible({ timeout: 5000 });
    
    // Test with valid value
    await page.fill(fieldSelector, validValue);
    await page.keyboard.press('Tab');
    
    await expect(errorElement).not.toBeVisible({ timeout: 5000 });
  }

  static async testResponsiveDesign(page: Page, testUrl: string) {
    const viewports = [
      { name: 'Mobile Portrait', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');
      
      // Take screenshot for visual verification
      await this.takePageScreenshot(page, `responsive-${viewport.name.toLowerCase().replace(' ', '-')}`);
      
      console.log(`✅ Tested ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
  }

  static async checkAccessibility(page: Page) {
    // Basic accessibility checks
    const results = {
      missingAltText: 0,
      missingLabels: 0,
      lowContrast: 0,
      keyboardNavigable: true
    };

    // Check for images without alt text
    results.missingAltText = await page.locator('img:not([alt])').count();

    // Check for form inputs without labels
    results.missingLabels = await page.locator('input:not([aria-label]):not([aria-labelledby]):not([id])').count();

    // Basic keyboard navigation test
    try {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
    } catch (error) {
      results.keyboardNavigable = false;
    }

    return results;
  }

  static async simulateSlowNetwork(page: Page) {
    await page.route('**/*', async route => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });
  }

  static async simulateOfflineMode(page: Page) {
    await page.setOffline(true);
  }

  static async restoreOnlineMode(page: Page) {
    await page.setOffline(false);
  }

  static async clearBrowserData(page: Page) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Clear cookies
    const context = page.context();
    await context.clearCookies();
  }
}