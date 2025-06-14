import { Page, Locator, expect } from '@playwright/test';

/**
 * Base page object with common functionality
 * All page objects should extend this class
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Common locators
  get loadingSpinner(): Locator {
    return this.page.locator('[data-testid="loading-spinner"], .loading, .spinner');
  }

  get toast(): Locator {
    return this.page.locator('[data-testid="toast"], .toast, [role="alert"]');
  }

  get errorMessage(): Locator {
    return this.page.locator('[data-testid="error-message"], .error-message, .text-red-500');
  }

  get successMessage(): Locator {
    return this.page.locator('[data-testid="success-message"], .success-message, .text-green-500');
  }

  // Navigation
  async navigate(path: string) {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  // Wait for page to load
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.waitForLoadingToFinish();
  }

  // Wait for loading indicators to disappear
  async waitForLoadingToFinish(): Promise<void> {
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // Loading spinner might not exist, that's okay
    }
  }

  // Form helpers
  async fillInput(selector: string, value: string) {
    await this.page.fill(selector, value);
  }

  async selectOption(selector: string, value: string) {
    await this.page.selectOption(selector, value);
  }

  async clickButton(text: string) {
    await this.page.click(`button:has-text("${text}")`);
  }

  async clickLink(text: string) {
    await this.page.click(`a:has-text("${text}")`);
  }

  // Validation helpers
  async expectToastMessage(message: string) {
    await expect(this.toast).toContainText(message);
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectSuccessMessage(message: string) {
    await expect(this.successMessage).toContainText(message);
  }

  // Wait for specific elements
  async waitForElement(selector: string, options?: { timeout?: number }) {
    await this.page.waitForSelector(selector, options);
  }

  async waitForText(text: string, options?: { timeout?: number }) {
    await this.page.waitForSelector(`text=${text}`, options);
  }

  // Screenshot helpers
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `e2e-test-results/screenshots/${name}.png` });
  }

  // Table helpers
  async getTableRowCount(tableSelector: string = 'table'): Promise<number> {
    const rows = await this.page.locator(`${tableSelector} tbody tr`).count();
    return rows;
  }

  async getTableCellText(row: number, column: number, tableSelector: string = 'table'): Promise<string> {
    const cell = this.page.locator(`${tableSelector} tbody tr:nth-child(${row + 1}) td:nth-child(${column + 1})`);
    return await cell.textContent() || '';
  }

  async clickTableRow(row: number, tableSelector: string = 'table') {
    await this.page.click(`${tableSelector} tbody tr:nth-child(${row + 1})`);
  }

  // Search helpers
  async search(query: string, searchSelector: string = 'input[placeholder*="Search"], input[type="search"]') {
    await this.page.fill(searchSelector, query);
    await this.page.keyboard.press('Enter');
    await this.waitForLoadingToFinish();
  }

  // Dialog helpers
  async confirmDialog(): Promise<void> {
    this.page.on('dialog', dialog => dialog.accept());
  }

  async dismissDialog(): Promise<void> {
    this.page.on('dialog', dialog => dialog.dismiss());
  }

  // URL validation
  async expectUrl(expectedUrl: string) {
    await expect(this.page).toHaveURL(expectedUrl);
  }

  async expectUrlToContain(urlPart: string) {
    await expect(this.page).toHaveURL(new RegExp(urlPart));
  }

  // Accessibility helpers
  async checkAccessibility(): Promise<boolean> {
    // Basic accessibility checks
    const missingAltImages = await this.page.locator('img:not([alt])').count();
    const missingLabels = await this.page.locator('input:not([aria-label]):not([aria-labelledby]):not([id])').count();
    
    if (missingAltImages > 0) {
      console.warn(`Found ${missingAltImages} images without alt text`);
    }
    
    if (missingLabels > 0) {
      console.warn(`Found ${missingLabels} inputs without proper labels`);
    }
  }

  // Performance helpers
  async measurePageLoad(): Promise<number> {
    const startTime = Date.now();
    await this.waitForPageLoad();
    return Date.now() - startTime;
  }

  // Element visibility helpers
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async isElementHidden(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { state: 'hidden', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }
}