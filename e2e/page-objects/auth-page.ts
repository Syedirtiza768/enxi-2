import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Authentication page object
 * Handles login, logout, and session management
 */
export class AuthPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly logoutButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly forgotPasswordLink: Locator;
  readonly loginForm: Locator;
  readonly userProfile: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.logoutButton = page.locator('button[aria-label="Logout"], button:has-text("Logout")');
    this.rememberMeCheckbox = page.locator('input[name="rememberMe"]');
    this.forgotPasswordLink = page.locator('a:has-text("Forgot Password")');
    this.loginForm = page.locator('form');
    this.userProfile = page.locator('[data-testid="user-profile"], .user-profile');
  }

  async navigateToLogin(): Promise<{ user: any, session?: any }> {
    await this.navigate('/login');
    await expect(this.loginForm).toBeVisible();
  }

  async login(username: string, password: string, rememberMe: boolean = false) {
    await this.navigateToLogin();
    
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    
    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }
    
    await this.loginButton.click();
    await this.waitForPageLoad();
  }

  async loginAsAdmin(): Promise<{ user: any, session?: any }> {
    await this.login('admin', 'admin123');
    await this.expectUrl('/dashboard');
  }

  async loginAsManager(): Promise<{ user: any, session?: any }> {
    await this.login('manager', 'manager123');
    await this.expectUrl('/dashboard');
  }

  async loginAsSales(): Promise<{ user: any, session?: any }> {
    await this.login('sales', 'sales123');
    await this.expectUrl('/dashboard');
  }

  async loginAsInventory(): Promise<{ user: any, session?: any }> {
    await this.login('inventory', 'inventory123');
    await this.expectUrl('/dashboard');
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.waitForPageLoad();
    await this.expectUrl('/login');
  }

  async expectLoginSuccess(username: string) {
    await expect(this.page).toHaveURL('/dashboard');
    await expect(this.page.getByText(username)).toBeVisible();
  }

  async expectLoginFailure(): Promise<{ user: any, session?: any }> {
    await expect(this.page).toHaveURL('/login');
    await this.expectErrorMessage('Invalid credentials');
  }

  async expectRequiredFieldErrors(): Promise<void> {
    await expect(this.page.getByText('Username must be at least 3 characters')).toBeVisible();
    await expect(this.page.getByText('Password must be at least 6 characters')).toBeVisible();
  }

  async expectUsernameError(): Promise<void> {
    await expect(this.page.getByText('Username must be at least 3 characters')).toBeVisible();
  }

  async expectPasswordError(): Promise<void> {
    await expect(this.page.getByText('Password must be at least 6 characters')).toBeVisible();
  }

  async tryLoginWithInvalidCredentials(): Promise<{ user: any, session?: any }> {
    await this.login('wronguser', 'wrongpassword');
    await this.expectLoginFailure();
  }

  async trySubmitEmptyForm(): Promise<void> {
    await this.navigateToLogin();
    await this.loginButton.click();
    await this.expectRequiredFieldErrors();
  }

  async tryLoginWithShortUsername(): Promise<{ user: any, session?: any }> {
    await this.navigateToLogin();
    await this.usernameInput.fill('ab');
    await this.passwordInput.fill('validpassword');
    await this.loginButton.click();
    await this.expectUsernameError();
  }

  async tryLoginWithShortPassword(): Promise<{ user: any, session?: any }> {
    await this.navigateToLogin();
    await this.usernameInput.fill('validuser');
    await this.passwordInput.fill('123');
    await this.loginButton.click();
    await this.expectPasswordError();
  }

  async verifySessionPersistence(): Promise<void> {
    await this.loginAsAdmin();
    await this.reload();
    await this.expectUrl('/dashboard');
    await expect(this.page.getByText('admin')).toBeVisible();
  }

  async verifySessionExpiry(): Promise<void> {
    await this.loginAsAdmin();
    
    // Navigate to a protected route after logout
    await this.logout();
    await this.navigate('/dashboard');
    
    // Should redirect to login
    await this.expectUrl('/login');
  }

  async accessProtectedRouteWithoutAuth(route: string) {
    await this.navigate(route);
    await this.expectUrl('/login');
  }

  async verifyRememberMeFunctionality(): Promise<void> {
    await this.navigateToLogin();
    await this.login('admin', 'admin123', true);
    
    // Simulate browser restart by clearing session storage but keeping local storage
    await this.page.evaluate(() => {
      sessionStorage.clear();
    });
    
    await this.reload();
    // Should still be logged in due to remember me
    await this.expectUrl('/dashboard');
  }

  async checkPasswordVisibilityToggle(): Promise<boolean> {
    await this.navigateToLogin();
    
    // Check if password visibility toggle exists
    const toggleButton = this.page.locator('button[aria-label="Toggle password visibility"]');
    
    if (await toggleButton.isVisible()) {
      // Password should be hidden initially
      await expect(this.passwordInput).toHaveAttribute('type', 'password');
      
      // Click toggle to show password
      await toggleButton.click();
      await expect(this.passwordInput).toHaveAttribute('type', 'text');
      
      // Click toggle to hide password again
      await toggleButton.click();
      await expect(this.passwordInput).toHaveAttribute('type', 'password');
    }
  }

  async testKeyboardNavigation(): Promise<void> {
    await this.navigateToLogin();
    
    // Tab through form elements
    await this.page.keyboard.press('Tab');
    await expect(this.usernameInput).toBeFocused();
    
    await this.page.keyboard.press('Tab');
    await expect(this.passwordInput).toBeFocused();
    
    await this.page.keyboard.press('Tab');
    await expect(this.loginButton).toBeFocused();
  }

  async testFormSubmissionWithEnterKey(): Promise<void> {
    await this.navigateToLogin();
    
    await this.usernameInput.fill('admin');
    await this.passwordInput.fill('admin123');
    
    // Press Enter to submit form
    await this.passwordInput.press('Enter');
    
    await this.waitForPageLoad();
    await this.expectUrl('/dashboard');
  }
}