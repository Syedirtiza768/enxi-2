import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Leads page object
 * Handles lead management functionality
 */
export class LeadsPage extends BasePage {
  readonly pageTitle: Locator;
  readonly newLeadButton: Locator;
  readonly leadsTable: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly sourceFilter: Locator;
  readonly priorityFilter: Locator;

  // Lead form elements
  readonly companyNameInput: Locator;
  readonly contactNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly sourceSelect: Locator;
  readonly statusSelect: Locator;
  readonly industryInput: Locator;
  readonly estimatedValueInput: Locator;
  readonly expectedCloseDateInput: Locator;
  readonly notesTextarea: Locator;
  readonly prioritySelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Lead actions
  readonly convertButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1');
    this.newLeadButton = page.locator('button:has-text("New Lead"), a:has-text("New Lead")');
    this.leadsTable = page.locator('table, .leads-table');
    this.searchInput = page.locator('input[placeholder*="Search leads"], input[type="search"]');
    this.statusFilter = page.locator('select[name="status"], .status-filter');
    this.sourceFilter = page.locator('select[name="source"], .source-filter');
    this.priorityFilter = page.locator('select[name="priority"], .priority-filter');

    // Form elements
    this.companyNameInput = page.locator('input[name="companyName"]');
    this.contactNameInput = page.locator('input[name="contactName"]');
    this.emailInput = page.locator('input[name="email"]');
    this.phoneInput = page.locator('input[name="phone"]');
    this.sourceSelect = page.locator('select[name="source"]');
    this.statusSelect = page.locator('select[name="status"]');
    this.industryInput = page.locator('input[name="industry"]');
    this.estimatedValueInput = page.locator('input[name="estimatedValue"]');
    this.expectedCloseDateInput = page.locator('input[name="expectedCloseDate"]');
    this.notesTextarea = page.locator('textarea[name="notes"]');
    this.prioritySelect = page.locator('select[name="priority"]');
    this.saveButton = page.locator('button[type="submit"], button:has-text("Save")');
    this.cancelButton = page.locator('button:has-text("Cancel")');

    // Actions
    this.convertButton = page.locator('button:has-text("Convert"), a:has-text("Convert")');
    this.editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
    this.deleteButton = page.locator('button:has-text("Delete")');
  }

  async navigateToLeads(): Promise<void> {
    await this.navigate('/leads');
    await expect(this.pageTitle).toContainText('Leads');
  }

  async navigateToNewLead(): Promise<void> {
    await this.newLeadButton.click();
    await this.waitForPageLoad();
    await this.expectUrlToContain('/leads/new');
  }

  async createLead(leadData: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    source: string;
    industry: string;
    estimatedValue: string;
    expectedCloseDate: string;
    notes: string;
    priority: string;
  }) {
    await this.navigateToNewLead();
    
    await this.companyNameInput.fill(leadData.companyName);
    await this.contactNameInput.fill(leadData.contactName);
    await this.emailInput.fill(leadData.email);
    await this.phoneInput.fill(leadData.phone);
    await this.sourceSelect.selectOption(leadData.source);
    await this.industryInput.fill(leadData.industry);
    await this.estimatedValueInput.fill(leadData.estimatedValue);
    await this.expectedCloseDateInput.fill(leadData.expectedCloseDate);
    await this.notesTextarea.fill(leadData.notes);
    await this.prioritySelect.selectOption(leadData.priority);
    
    await this.saveButton.click();
    await this.waitForPageLoad();
    
    // Should redirect to leads list
    await this.expectUrlToContain('/leads');
    await this.expectSuccessMessage('Lead created successfully');
  }

  async createSampleLead(): Promise<T> {
    const sampleLead = {
      companyName: 'Test Marine Solutions',
      contactName: 'John Test',
      email: 'john@testmarine.com',
      phone: '+971-50-123-9999',
      source: 'WEBSITE',
      industry: 'Marine Services',
      estimatedValue: '75000',
      expectedCloseDate: '2024-08-15',
      notes: 'Interested in marine engine services and maintenance contracts',
      priority: 'HIGH'
    };
    
    await this.createLead(sampleLead);
    return sampleLead;
  }

  async searchLeads(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.waitForLoadingToFinish();
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.waitForLoadingToFinish();
  }

  async filterBySource(source: string) {
    await this.sourceFilter.selectOption(source);
    await this.waitForLoadingToFinish();
  }

  async filterByPriority(priority: string) {
    await this.priorityFilter.selectOption(priority);
    await this.waitForLoadingToFinish();
  }

  async getLeadsCount(): Promise<number> {
    return await this.getTableRowCount('.leads-table');
  }

  async clickLeadByCompany(companyName: string) {
    const leadRow = this.page.locator(`tr:has-text("${companyName}")`);
    await leadRow.click();
    await this.waitForPageLoad();
  }

  async editLead(companyName: string, newData: Partial<{
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    industry: string;
    estimatedValue: string;
    notes: string;
  }>) {
    await this.clickLeadByCompany(companyName);
    await this.editButton.click();
    await this.waitForPageLoad();
    
    // Update fields if provided
    if (newData.companyName) {
      await this.companyNameInput.fill(newData.companyName);
    }
    if (newData.contactName) {
      await this.contactNameInput.fill(newData.contactName);
    }
    if (newData.email) {
      await this.emailInput.fill(newData.email);
    }
    if (newData.phone) {
      await this.phoneInput.fill(newData.phone);
    }
    if (newData.industry) {
      await this.industryInput.fill(newData.industry);
    }
    if (newData.estimatedValue) {
      await this.estimatedValueInput.fill(newData.estimatedValue);
    }
    if (newData.notes) {
      await this.notesTextarea.fill(newData.notes);
    }
    
    await this.saveButton.click();
    await this.waitForPageLoad();
    await this.expectSuccessMessage('Lead updated successfully');
  }

  async convertLeadToCustomer(companyName: string) {
    await this.clickLeadByCompany(companyName);
    await this.convertButton.click();
    
    // Handle conversion dialog/form
    await this.confirmDialog();
    await this.waitForPageLoad();
    
    await this.expectSuccessMessage('Lead converted to customer successfully');
  }

  async deleteLead(companyName: string) {
    await this.clickLeadByCompany(companyName);
    await this.deleteButton.click();
    
    // Confirm deletion
    await this.confirmDialog();
    await this.waitForPageLoad();
    
    await this.expectSuccessMessage('Lead deleted successfully');
  }

  async updateLeadStatus(companyName: string, newStatus: string) {
    await this.clickLeadByCompany(companyName);
    await this.editButton.click();
    await this.statusSelect.selectOption(newStatus);
    await this.saveButton.click();
    await this.waitForPageLoad();
    await this.expectSuccessMessage('Lead status updated');
  }

  async verifyLeadInTable(companyName: string, expectedData?: {
    contactName?: string;
    email?: string;
    status?: string;
    source?: string;
    priority?: string;
  }) {
    const leadRow = this.page.locator(`tr:has-text("${companyName}")`);
    await expect(leadRow).toBeVisible();
    
    if (expectedData) {
      if (expectedData.contactName) {
        await expect(leadRow).toContainText(expectedData.contactName);
      }
      if (expectedData.email) {
        await expect(leadRow).toContainText(expectedData.email);
      }
      if (expectedData.status) {
        await expect(leadRow).toContainText(expectedData.status);
      }
      if (expectedData.source) {
        await expect(leadRow).toContainText(expectedData.source);
      }
      if (expectedData.priority) {
        await expect(leadRow).toContainText(expectedData.priority);
      }
    }
  }

  async verifyLeadNotInTable(companyName: string) {
    const leadRow = this.page.locator(`tr:has-text("${companyName}")`);
    await expect(leadRow).not.toBeVisible();
  }

  async sortBy(column: string) {
    const columnHeader = this.page.locator(`th:has-text("${column}")`);
    await columnHeader.click();
    await this.waitForLoadingToFinish();
  }

  async verifyFormValidation(): Promise<void> {
    await this.navigateToNewLead();
    
    // Try to submit empty form
    await this.saveButton.click();
    
    // Should show validation errors
    await this.expectErrorMessage('Company name is required');
    await this.expectErrorMessage('Contact name is required');
    await this.expectErrorMessage('Email is required');
  }

  async verifyEmailValidation(): Promise<void> {
    await this.navigateToNewLead();
    
    await this.companyNameInput.fill('Test Company');
    await this.contactNameInput.fill('Test Contact');
    await this.emailInput.fill('invalid-email');
    await this.saveButton.click();
    
    await this.expectErrorMessage('Please enter a valid email address');
  }

  async verifyPhoneValidation(): Promise<void> {
    await this.navigateToNewLead();
    
    await this.companyNameInput.fill('Test Company');
    await this.contactNameInput.fill('Test Contact');
    await this.emailInput.fill('test@example.com');
    await this.phoneInput.fill('invalid-phone');
    await this.saveButton.click();
    
    await this.expectErrorMessage('Please enter a valid phone number');
  }

  async testLeadsPagination(): Promise<void> {
    const pagination = this.page.locator('.pagination, [aria-label="Pagination"]');
    
    if (await pagination.isVisible()) {
      const nextButton = pagination.locator('button:has-text("Next"), .next');
      const prevButton = pagination.locator('button:has-text("Previous"), .prev');
      
      // Test next page
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await this.waitForLoadingToFinish();
      }
      
      // Test previous page
      if (await prevButton.isEnabled()) {
        await prevButton.click();
        await this.waitForLoadingToFinish();
      }
    }
  }

  async exportLeads(): Promise<void> {
    const exportButton = this.page.locator('button:has-text("Export"), .export-button');
    
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await this.waitForLoadingToFinish();
      // Note: File download verification would need additional setup
    }
  }
}