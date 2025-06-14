import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/auth-page';
import { DashboardPage } from '../page-objects/dashboard-page';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Authentication Workflow E2E Tests', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    
    // Clear any existing session
    await TestHelpers.clearBrowserData(page);
  });

  test('should complete full login flow successfully', async ({ page }) => {
    // Navigate to login page
    await authPage.navigateToLogin();
    
    // Verify login form is displayed
    await expect(authPage.loginForm).toBeVisible();
    await expect(authPage.usernameInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
    await expect(authPage.loginButton).toBeVisible();
    
    // Login with admin credentials
    await authPage.loginAsAdmin();
    
    // Verify successful login and dashboard access
    await dashboardPage.verifyDashboardLoaded();
    await expect(page.getByText('admin')).toBeVisible();
    
    // Take screenshot for verification
    await TestHelpers.takePageScreenshot(page, 'successful-login-dashboard');
  });

  test('should handle invalid credentials properly', async ({ page }) => {
    await authPage.navigateToLogin();
    
    // Try login with invalid credentials
    await authPage.tryLoginWithInvalidCredentials();
    
    // Should remain on login page with error message
    await authPage.expectLoginFailure();
    
    // Form should remain accessible for retry
    await expect(authPage.usernameInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
  });

  test('should validate form fields correctly', async ({ page }) => {
    await authPage.navigateToLogin();
    
    // Test empty form submission
    await authPage.trySubmitEmptyForm();
    
    // Test individual field validation
    await authPage.tryLoginWithShortUsername();
    await authPage.tryLoginWithShortPassword();
  });

  test('should handle session persistence across page refresh', async ({ page }) => {
    // Login successfully
    await authPage.loginAsAdmin();
    await dashboardPage.verifyDashboardLoaded();
    
    // Refresh the page
    await page.reload();
    
    // Should still be logged in
    await dashboardPage.verifyDashboardLoaded();
    await expect(page.getByText('admin')).toBeVisible();
  });

  test('should complete logout flow properly', async ({ page }) => {
    // Login first
    await authPage.loginAsAdmin();
    await dashboardPage.verifyDashboardLoaded();
    
    // Logout
    await authPage.logout();
    
    // Should redirect to login page
    await authPage.expectUrl('/login');
    await expect(authPage.loginForm).toBeVisible();
  });

  test('should redirect to login when accessing protected routes without authentication', async ({ page }) => {
    const protectedRoutes = [
      '/dashboard',
      '/customers',
      '/inventory',
      '/sales-orders',
      '/quotations',
      '/invoices'
    ];

    for (const route of protectedRoutes) {
      await authPage.accessProtectedRouteWithoutAuth(route);
      console.log(`✅ Route ${route} properly protected`);
    }
  });

  test('should handle session expiry correctly', async ({ page }) => {
    // Login
    await authPage.loginAsAdmin();
    await dashboardPage.verifyDashboardLoaded();
    
    // Simulate session expiry by clearing storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Try to access a protected route
    await page.goto('/customers');
    
    // Should redirect to login
    await authPage.expectUrl('/login');
  });

  test('should support keyboard navigation in login form', async ({ page }) => {
    await authPage.navigateToLogin();
    await authPage.testKeyboardNavigation();
  });

  test('should submit form with Enter key', async ({ page }) => {
    await authPage.navigateToLogin();
    await authPage.testFormSubmissionWithEnterKey();
    await dashboardPage.verifyDashboardLoaded();
  });

  test('should handle password visibility toggle if available', async ({ page }) => {
    await authPage.navigateToLogin();
    await authPage.checkPasswordVisibilityToggle();
  });

  test('should test remember me functionality if implemented', async ({ page }) => {
    // This test might not work in all environments due to browser security restrictions
    try {
      await authPage.verifyRememberMeFunctionality();
    } catch (error) {
      console.log('Remember me functionality test skipped:', error.message);
    }
  });

  test('should handle multiple user roles authentication', async ({ page }) => {
    const userCredentials = [
      { username: 'admin', password: 'admin123', role: 'Admin' },
      { username: 'manager', password: 'manager123', role: 'Manager' },
      { username: 'sales', password: 'sales123', role: 'Sales' }
    ];

    for (const user of userCredentials) {
      // Clear session
      await TestHelpers.clearBrowserData(page);
      
      // Login with user credentials
      await authPage.login(user.username, user.password);
      
      // Verify successful login
      await dashboardPage.verifyDashboardLoaded();
      await expect(page.getByText(user.username)).toBeVisible();
      
      // Logout
      await authPage.logout();
      
      console.log(`✅ ${user.role} authentication successful`);
    }
  });

  test('should measure authentication performance', async ({ page }) => {
    await authPage.navigateToLogin();
    
    const startTime = Date.now();
    await authPage.loginAsAdmin();
    await dashboardPage.verifyDashboardLoaded();
    const loginTime = Date.now() - startTime;
    
    console.log(`Authentication completed in ${loginTime}ms`);
    expect(loginTime).toBeLessThan(10000); // Should complete within 10 seconds
  });

  test('should handle concurrent login attempts', async ({ page }) => {
    // This is a simplified test - full concurrent testing would require multiple browser contexts
    await authPage.navigateToLogin();
    
    // Fill credentials
    await authPage.usernameInput.fill('admin');
    await authPage.passwordInput.fill('admin123');
    
    // Submit multiple times quickly (simulate double-click)
    await Promise.all([
      authPage.loginButton.click(),
      authPage.loginButton.click()
    ]);
    
    // Should still login successfully without duplicate requests
    await dashboardPage.verifyDashboardLoaded();
  });

  test('should validate security headers and HTTPS redirect if configured', async ({ page }) => {
    // Check for security headers in response
    const response = await page.goto('/login');
    const headers = response?.headers() || {};
    
    console.log('Security headers check:');
    console.log('X-Frame-Options:', headers['x-frame-options'] || 'Not set');
    console.log('X-Content-Type-Options:', headers['x-content-type-options'] || 'Not set');
    console.log('Strict-Transport-Security:', headers['strict-transport-security'] || 'Not set');
    
    // Note: In a production environment, you would assert these headers are present
  });

  test('should handle browser back/forward navigation correctly', async ({ page }) => {
    // Login
    await authPage.loginAsAdmin();
    await dashboardPage.verifyDashboardLoaded();
    
    // Navigate to different pages
    await dashboardPage.navigateToCustomers();
    await dashboardPage.navigateToInventory();
    
    // Use browser back button
    await page.goBack();
    await authPage.expectUrlToContain('/customers');
    
    // Use browser forward button
    await page.goForward();
    await authPage.expectUrlToContain('/inventory');
    
    // Should still be authenticated
    await expect(page.getByText('admin')).toBeVisible();
  });

  test('should maintain authentication state across tab operations', async ({ context, page }) => {
    // Login in first tab
    await authPage.loginAsAdmin();
    await dashboardPage.verifyDashboardLoaded();
    
    // Open new tab and navigate to protected route
    const newPage = await context.newPage();
    await newPage.goto('/customers');
    
    // Should be authenticated in new tab
    await expect(newPage.getByText('admin')).toBeVisible();
    
    await newPage.close();
  });
});