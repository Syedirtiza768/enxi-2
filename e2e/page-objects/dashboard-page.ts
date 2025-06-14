import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Dashboard page object
 * Handles main dashboard functionality and navigation
 */
export class DashboardPage extends BasePage {
  readonly pageTitle: Locator;
  readonly sidebar: Locator;
  readonly mainContent: Locator;
  readonly userMenu: Locator;
  readonly notifications: Locator;
  readonly statsCards: Locator;

  // Navigation menu items
  readonly inventoryMenu: Locator;
  readonly salesMenu: Locator;
  readonly purchaseMenu: Locator;
  readonly customersMenu: Locator;
  readonly suppliersMenu: Locator;
  readonly reportsMenu: Locator;
  readonly settingsMenu: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1');
    this.sidebar = page.locator('nav, .sidebar, [data-testid="sidebar"]');
    this.mainContent = page.locator('main, .main-content, [data-testid="main-content"]');
    this.userMenu = page.locator('.user-menu, [data-testid="user-menu"]');
    this.notifications = page.locator('.notifications, [data-testid="notifications"]');
    this.statsCards = page.locator('.stats-card, [data-testid="stats-card"]');

    // Navigation menu items
    this.inventoryMenu = page.locator('text=Inventory');
    this.salesMenu = page.locator('text=Sales');
    this.purchaseMenu = page.locator('text=Purchase');
    this.customersMenu = page.locator('text=Customers');
    this.suppliersMenu = page.locator('text=Suppliers');
    this.reportsMenu = page.locator('text=Reports');
    this.settingsMenu = page.locator('text=Settings');
  }

  async navigateToDashboard(): Promise<void> {
    await this.navigate('/dashboard');
    await expect(this.pageTitle).toContainText('Dashboard');
  }

  async verifyDashboardLoaded(): Promise<void> {
    await expect(this.sidebar).toBeVisible();
    await expect(this.mainContent).toBeVisible();
    await expect(this.pageTitle).toBeVisible();
  }

  // Navigation methods
  async navigateToInventory(): Promise<void> {
    await this.inventoryMenu.click();
    await this.waitForPageLoad();
    await this.expectUrlToContain('/inventory');
  }

  async navigateToInventoryItems(): Promise<void> {
    await this.navigateToInventory();
    await this.clickLink('Items');
    await this.expectUrlToContain('/inventory/items');
  }

  async navigateToInventoryCategories(): Promise<void> {
    await this.navigateToInventory();
    await this.clickLink('Categories');
    await this.expectUrlToContain('/inventory/categories');
  }

  async navigateToStockMovements(): Promise<void> {
    await this.navigateToInventory();
    await this.clickLink('Movements');
    await this.expectUrlToContain('/inventory/movements');
  }

  async navigateToCustomers(): Promise<void> {
    await this.customersMenu.click();
    await this.waitForPageLoad();
    await this.expectUrlToContain('/customers');
  }

  async navigateToLeads(): Promise<void> {
    await this.clickLink('Leads');
    await this.waitForPageLoad();
    await this.expectUrlToContain('/leads');
  }

  async navigateToQuotations(): Promise<void> {
    await this.clickLink('Quotations');
    await this.waitForPageLoad();
    await this.expectUrlToContain('/quotations');
  }

  async navigateToSalesOrders(): Promise<void> {
    await this.clickLink('Sales Orders');
    await this.waitForPageLoad();
    await this.expectUrlToContain('/sales-orders');
  }

  async navigateToInvoices(): Promise<void> {
    await this.clickLink('Invoices');
    await this.waitForPageLoad();
    await this.expectUrlToContain('/invoices');
  }

  async navigateToSuppliers(): Promise<void> {
    await this.suppliersMenu.click();
    await this.waitForPageLoad();
    await this.expectUrlToContain('/suppliers');
  }

  async navigateToPurchaseOrders(): Promise<boolean> {
    await this.clickLink('Purchase Orders');
    await this.waitForPageLoad();
    await this.expectUrlToContain('/purchase-orders');
  }

  async navigateToGoodsReceipts(): Promise<void> {
    await this.clickLink('Goods Receipts');
    await this.waitForPageLoad();
    await this.expectUrlToContain('/goods-receipts');
  }

  async navigateToSupplierInvoices(): Promise<void> {
    await this.clickLink('Supplier Invoices');
    await this.waitForPageLoad();
    await this.expectUrlToContain('/supplier-invoices');
  }

  async navigateToThreeWayMatching(): Promise<void> {
    await this.clickLink('Three-Way Matching');
    await this.waitForPageLoad();
    await this.expectUrlToContain('/three-way-matching');
  }

  async navigateToShipments(): Promise<void> {
    await this.clickLink('Shipments');
    await this.waitForPageLoad();
    await this.expectUrlToContain('/shipments');
  }

  // Dashboard stats verification
  async verifyStatsCards(): Promise<void> {
    await expect(this.statsCards).toHaveCountGreaterThan(0);
  }

  async getStatValue(statName: string): Promise<string> {
    const statCard = this.page.locator(`.stats-card:has-text("${statName}")`);
    const value = await statCard.locator('.stat-value').textContent();
    return value || '';
  }

  async verifyExpectedStats(): Promise<void> {
    // Verify common dashboard stats exist
    const expectedStats = [
      'Total Sales',
      'Pending Orders',
      'Low Stock Items',
      'Outstanding Invoices'
    ];

    for (const stat of expectedStats) {
      const exists = await this.isElementVisible(`.stats-card:has-text("${stat}")`);
      if (exists) {
        console.log(`✅ Found stat: ${stat}`);
      }
    }
  }

  // Quick actions
  async createNewCustomer(): Promise<void> {
    await this.clickButton('New Customer');
    await this.expectUrlToContain('/customers/new');
  }

  async createNewLead(): Promise<void> {
    await this.clickButton('New Lead');
    await this.expectUrlToContain('/leads/new');
  }

  async createNewQuotation(): Promise<void> {
    await this.clickButton('New Quotation');
    await this.expectUrlToContain('/quotations/new');
  }

  async createNewPurchaseOrder(): Promise<void> {
    await this.clickButton('New Purchase Order');
    await this.expectUrlToContain('/purchase-orders/new');
  }

  // Search functionality
  async performGlobalSearch(query: string) {
    const globalSearch = this.page.locator('input[placeholder*="Search"], .global-search');
    if (await globalSearch.isVisible()) {
      await globalSearch.fill(query);
      await globalSearch.press('Enter');
      await this.waitForLoadingToFinish();
    }
  }

  // Notifications
  async checkNotifications(): Promise<boolean> {
    if (await this.notifications.isVisible()) {
      const notificationCount = await this.notifications.count();
      console.log(`Found ${notificationCount} notifications`);
      return notificationCount;
    }
    return 0;
  }

  async clickNotification(index: number = 0) {
    const notification = this.notifications.nth(index);
    if (await notification.isVisible()) {
      await notification.click();
    }
  }

  // Responsive design checks
  async testMobileView(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.reload();
    
    // Mobile menu should be collapsed
    const mobileMenuToggle = this.page.locator('.mobile-menu-toggle, [aria-label="Toggle menu"]');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await expect(this.sidebar).toBeVisible();
    }
  }

  async testTabletView(): Promise<void> {
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.reload();
    await this.verifyDashboardLoaded();
  }

  async testDesktopView(): Promise<void> {
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.reload();
    await this.verifyDashboardLoaded();
  }

  // Performance checks
  async measureDashboardLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.navigateToDashboard();
    await this.verifyDashboardLoaded();
    return Date.now() - startTime;
  }

  // User profile actions
  async accessUserProfile(): Promise<void> {
    await this.userMenu.click();
    await this.clickLink('Profile');
    await this.expectUrlToContain('/profile');
  }

  async changeUserSettings(): Promise<void> {
    await this.userMenu.click();
    await this.clickLink('Settings');
    await this.expectUrlToContain('/settings');
  }
}