import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Quotations page object
 * Handles quotation management and line item editing
 */
export class QuotationsPage extends BasePage {
  readonly pageTitle: Locator;
  readonly newQuotationButton: Locator;
  readonly quotationsTable: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;

  // Quotation form elements
  readonly customerSelect: Locator;
  readonly quotationNumberInput: Locator;
  readonly validUntilInput: Locator;
  readonly notesTextarea: Locator;
  readonly termsTextarea: Locator;
  readonly currencySelect: Locator;

  // Line items
  readonly addLineItemButton: Locator;
  readonly lineItemsTable: Locator;
  readonly itemSelector: Locator;
  readonly quantityInput: Locator;
  readonly unitPriceInput: Locator;
  readonly descriptionInput: Locator;
  readonly removeLineItemButton: Locator;

  // Totals
  readonly subtotalDisplay: Locator;
  readonly taxAmountDisplay: Locator;
  readonly totalAmountDisplay: Locator;

  // Actions
  readonly saveButton: Locator;
  readonly sendButton: Locator;
  readonly convertButton: Locator;
  readonly printButton: Locator;
  readonly duplicateButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1');
    this.newQuotationButton = page.locator('button:has-text("New Quotation"), a:has-text("New Quotation")');
    this.quotationsTable = page.locator('table, .quotations-table');
    this.searchInput = page.locator('input[placeholder*="Search quotations"], input[type="search"]');
    this.statusFilter = page.locator('select[name="status"], .status-filter');

    // Form elements
    this.customerSelect = page.locator('select[name="customerId"], .customer-selector');
    this.quotationNumberInput = page.locator('input[name="quotationNumber"]');
    this.validUntilInput = page.locator('input[name="validUntil"]');
    this.notesTextarea = page.locator('textarea[name="notes"]');
    this.termsTextarea = page.locator('textarea[name="terms"]');
    this.currencySelect = page.locator('select[name="currency"]');

    // Line items
    this.addLineItemButton = page.locator('button:has-text("Add Item"), .add-line-item');
    this.lineItemsTable = page.locator('.line-items-table, .items-table');
    this.itemSelector = page.locator('select[name*="itemId"], .item-selector');
    this.quantityInput = page.locator('input[name*="quantity"]');
    this.unitPriceInput = page.locator('input[name*="unitPrice"]');
    this.descriptionInput = page.locator('input[name*="description"], textarea[name*="description"]');
    this.removeLineItemButton = page.locator('button:has-text("Remove"), .remove-item');

    // Totals
    this.subtotalDisplay = page.locator('.subtotal, [data-testid="subtotal"]');
    this.taxAmountDisplay = page.locator('.tax-amount, [data-testid="tax-amount"]');
    this.totalAmountDisplay = page.locator('.total-amount, [data-testid="total-amount"]');

    // Actions
    this.saveButton = page.locator('button:has-text("Save")');
    this.sendButton = page.locator('button:has-text("Send")');
    this.convertButton = page.locator('button:has-text("Convert to Order")');
    this.printButton = page.locator('button:has-text("Print"), button:has-text("PDF")');
    this.duplicateButton = page.locator('button:has-text("Duplicate")');
  }

  async navigateToQuotations(): Promise<void> {
    await this.navigate('/quotations');
    await expect(this.pageTitle).toContainText('Quotations');
  }

  async navigateToNewQuotation(): Promise<void> {
    await this.newQuotationButton.click();
    await this.waitForPageLoad();
    await this.expectUrlToContain('/quotations/new');
  }

  async createQuotation(quotationData: {
    customerId: string;
    validUntil: string;
    notes: string;
    terms: string;
    items: Array<{
      itemId: string;
      quantity: string;
      unitPrice: string;
      description: string;
    }>;
  }) {
    await this.navigateToNewQuotation();
    
    // Fill basic details
    await this.customerSelect.selectOption(quotationData.customerId);
    await this.validUntilInput.fill(quotationData.validUntil);
    await this.notesTextarea.fill(quotationData.notes);
    await this.termsTextarea.fill(quotationData.terms);
    
    // Add line items
    for (const item of quotationData.items) {
      await this.addLineItem(item);
    }
    
    // Save quotation
    await this.saveButton.click();
    await this.waitForPageLoad();
    
    await this.expectSuccessMessage('Quotation created successfully');
    await this.expectUrlToContain('/quotations');
  }

  async addLineItem(item: {
    itemId: string;
    quantity: string;
    unitPrice: string;
    description: string;
  }) {
    await this.addLineItemButton.click();
    
    // Wait for new line item row to appear
    await this.waitForLoadingToFinish();
    
    // Fill the last row (newly added)
    const lastRow = this.lineItemsTable.locator('tr').last();
    
    await lastRow.locator('.item-selector').selectOption(item.itemId);
    await lastRow.locator('input[name*="quantity"]').fill(item.quantity);
    await lastRow.locator('input[name*="unitPrice"]').fill(item.unitPrice);
    await lastRow.locator('input[name*="description"], textarea[name*="description"]').fill(item.description);
    
    // Wait for calculations to update
    await this.waitForLoadingToFinish();
  }

  async removeLineItem(index: number = 0) {
    const row = this.lineItemsTable.locator('tr').nth(index);
    await row.locator('.remove-item').click();
    await this.waitForLoadingToFinish();
  }

  async updateLineItemQuantity(index: number, quantity: string) {
    const row = this.lineItemsTable.locator('tr').nth(index);
    await row.locator('input[name*="quantity"]').fill(quantity);
    await this.waitForLoadingToFinish();
  }

  async updateLineItemPrice(index: number, price: string) {
    const row = this.lineItemsTable.locator('tr').nth(index);
    await row.locator('input[name*="unitPrice"]').fill(price);
    await this.waitForLoadingToFinish();
  }

  async verifyTotalCalculations(expectedSubtotal: string, expectedTax: string, expectedTotal: string) {
    await expect(this.subtotalDisplay).toContainText(expectedSubtotal);
    await expect(this.taxAmountDisplay).toContainText(expectedTax);
    await expect(this.totalAmountDisplay).toContainText(expectedTotal);
  }

  async createSampleQuotation(): Promise<T> {
    const sampleQuotation = {
      customerId: 'dubai-marina-services', // Use test data ID
      validUntil: '2024-08-31',
      notes: 'Marine engine quotation for Dubai Marina Services',
      terms: 'Standard terms and conditions apply. Payment net 30 days.',
      items: [
        {
          itemId: 'marine-diesel-150hp',
          quantity: '1',
          unitPrice: '25000.00',
          description: 'Marine Diesel Engine 150HP with installation'
        },
        {
          itemId: 'engine-oil-filter',
          quantity: '2',
          unitPrice: '45.00',
          description: 'Premium engine oil filters'
        }
      ]
    };
    
    await this.createQuotation(sampleQuotation);
    return sampleQuotation;
  }

  async searchQuotations(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.waitForLoadingToFinish();
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.waitForLoadingToFinish();
  }

  async clickQuotationByNumber(quotationNumber: string) {
    const quotationRow = this.page.locator(`tr:has-text("${quotationNumber}")`);
    await quotationRow.click();
    await this.waitForPageLoad();
  }

  async sendQuotation(quotationNumber: string) {
    await this.clickQuotationByNumber(quotationNumber);
    await this.sendButton.click();
    
    // Handle send confirmation dialog
    await this.confirmDialog();
    await this.waitForPageLoad();
    
    await this.expectSuccessMessage('Quotation sent successfully');
  }

  async convertQuotationToSalesOrder(quotationNumber: string) {
    await this.clickQuotationByNumber(quotationNumber);
    await this.convertButton.click();
    
    // Handle conversion dialog
    await this.confirmDialog();
    await this.waitForPageLoad();
    
    await this.expectSuccessMessage('Quotation converted to sales order');
    await this.expectUrlToContain('/sales-orders');
  }

  async duplicateQuotation(quotationNumber: string) {
    await this.clickQuotationByNumber(quotationNumber);
    await this.duplicateButton.click();
    await this.waitForPageLoad();
    
    // Should navigate to new quotation form with pre-filled data
    await this.expectUrlToContain('/quotations/new');
  }

  async printQuotation(quotationNumber: string) {
    await this.clickQuotationByNumber(quotationNumber);
    await this.printButton.click();
    
    // Note: PDF download verification would need additional setup
    await this.waitForLoadingToFinish();
  }

  async verifyQuotationInTable(quotationNumber: string, expectedData?: {
    customer?: string;
    status?: string;
    total?: string;
    validUntil?: string;
  }) {
    const quotationRow = this.page.locator(`tr:has-text("${quotationNumber}")`);
    await expect(quotationRow).toBeVisible();
    
    if (expectedData) {
      if (expectedData.customer) {
        await expect(quotationRow).toContainText(expectedData.customer);
      }
      if (expectedData.status) {
        await expect(quotationRow).toContainText(expectedData.status);
      }
      if (expectedData.total) {
        await expect(quotationRow).toContainText(expectedData.total);
      }
      if (expectedData.validUntil) {
        await expect(quotationRow).toContainText(expectedData.validUntil);
      }
    }
  }

  async verifyFormValidation(): Promise<void> {
    await this.navigateToNewQuotation();
    
    // Try to submit empty form
    await this.saveButton.click();
    
    // Should show validation errors
    await this.expectErrorMessage('Customer is required');
    await this.expectErrorMessage('Valid until date is required');
  }

  async verifyLineItemValidation(): Promise<void> {
    await this.navigateToNewQuotation();
    
    // Fill required fields
    await this.customerSelect.selectOption({ index: 1 });
    await this.validUntilInput.fill('2024-12-31');
    
    // Try to add empty line item
    await this.addLineItemButton.click();
    await this.saveButton.click();
    
    await this.expectErrorMessage('Item is required');
    await this.expectErrorMessage('Quantity must be greater than 0');
  }

  async testItemSelector(): Promise<void> {
    await this.navigateToNewQuotation();
    await this.addLineItemButton.click();
    
    // Test item selector functionality
    const itemSelect = this.lineItemsTable.locator('.item-selector').first();
    
    // Should have options
    const optionCount = await itemSelect.locator('option').count();
    expect(optionCount).toBeGreaterThan(1);
    
    // Select an item
    await itemSelect.selectOption({ index: 1 });
    
    // Price should auto-populate (if implemented)
    await this.waitForLoadingToFinish();
  }

  async testCalculations(): Promise<void> {
    await this.navigateToNewQuotation();
    
    // Add a line item with known values
    await this.addLineItemButton.click();
    const row = this.lineItemsTable.locator('tr').first();
    
    await row.locator('input[name*="quantity"]').fill('2');
    await row.locator('input[name*="unitPrice"]').fill('100.00');
    
    await this.waitForLoadingToFinish();
    
    // Verify line total calculation (if displayed)
    const lineTotal = row.locator('.line-total');
    if (await lineTotal.isVisible()) {
      await expect(lineTotal).toContainText('200.00');
    }
  }

  async testCurrencyFormatting(): Promise<void> {
    await this.navigateToNewQuotation();
    
    // Check if currency formatting is working
    await this.addLineItemButton.click();
    const priceInput = this.lineItemsTable.locator('input[name*="unitPrice"]').first();
    
    await priceInput.fill('1000');
    await priceInput.blur();
    
    // Should format as currency (implementation dependent)
    const value = await priceInput.inputValue();
    console.log('Currency formatting result:', value);
  }

  async exportQuotations(): Promise<void> {
    const exportButton = this.page.locator('button:has-text("Export"), .export-button');
    
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await this.waitForLoadingToFinish();
    }
  }
}