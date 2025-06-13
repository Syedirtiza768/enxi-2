# Frontend Testing Guide

## Overview

This guide covers the comprehensive frontend testing suite for the Enxi ERP system using Playwright.

## Test Scripts

### 1. Comprehensive Frontend Tests
**File**: `scripts/test-frontend-comprehensive.ts`
**Command**: `npm run test:frontend`

This script runs a full suite of frontend tests covering:
- Customer creation form with all fields
- Sales case creation and management
- Quotation creation with line item editor
- Quotation PDF generation
- Customer PO recording
- Sales order workflow
- Invoice creation and management
- Payment recording UI
- All list views and filters
- Navigation and permissions
- Form validation
- Data persistence
- UI responsiveness
- Error handling

### 2. Quick Frontend Tests
**File**: `scripts/test-frontend-quick.ts`
**Command**: `npm run test:frontend:quick`

A lightweight test suite for quick validation:
- Critical path testing
- Basic form interactions
- Navigation verification

## Running Tests

### Prerequisites
1. Ensure the application is running:
   ```bash
   npm run dev
   ```

2. Ensure test data is seeded:
   ```bash
   npm run seed:marine
   ```

### Running Comprehensive Tests
```bash
# Run all frontend tests (headless)
npm run test:frontend

# The test will automatically:
# - Create a test admin user
# - Login to the application
# - Run all test scenarios
# - Clean up test data
# - Display results summary
```

### Running Quick Tests
```bash
# Run quick tests (headless)
npm run test:frontend:quick

# Run with visual browser (for debugging)
npm run test:frontend:quick -- --show

# Run against different URL
npm run test:frontend:quick -- --url http://localhost:3001

# Run with custom credentials
npm run test:frontend:quick -- --email admin@company.com --password SecurePass123
```

## Test Coverage

### Forms Tested
- Customer creation form (all fields)
- Sales case form
- Quotation form with line items
- Customer PO form
- Invoice form
- Payment recording form

### Workflows Tested
1. **Sales Workflow**
   - Customer → Sales Case → Quotation → Sales Order → Invoice → Payment

2. **Document Management**
   - PDF generation
   - Email sending (simulated)
   - Document uploads

3. **List Operations**
   - Search functionality
   - Filtering
   - Pagination
   - Sorting

### Validation Tests
- Required field validation
- Email format validation
- Numeric field validation
- Date validation
- Business rule validation

### UI/UX Tests
- Responsive design (mobile, tablet, desktop)
- Error message display
- Success notifications
- Loading states
- Navigation flow

## Test Structure

Each test follows this pattern:
```typescript
async testFeatureName() {
  await this.runTest('Feature Name', async () => {
    // Navigate to page
    await this.page!.goto(`${this.baseUrl}/feature`);
    
    // Perform actions
    await this.page!.fill('input[name="field"]', 'value');
    await this.page!.click('button[type="submit"]');
    
    // Verify results
    await this.page!.waitForSelector('text="Success message"');
  });
}
```

## Debugging Failed Tests

1. **Run with visual browser**:
   ```bash
   npm run test:frontend:quick -- --show
   ```

2. **Check browser console**:
   The tests capture browser console errors automatically.

3. **Take screenshots on failure**:
   Add to test:
   ```typescript
   await this.page!.screenshot({ path: 'error-screenshot.png' });
   ```

4. **Increase timeouts**:
   Modify timeout values in waitForSelector calls.

## Best Practices

1. **Test Data Isolation**
   - Tests create their own test data
   - Cleanup runs automatically after tests
   - Use unique identifiers (timestamps) for test data

2. **Selector Strategy**
   - Use semantic selectors: `text="Button Label"`
   - Use data-testid for critical elements
   - Avoid brittle CSS selectors

3. **Wait Strategies**
   - Use `waitForSelector` instead of fixed delays
   - Wait for specific elements or text
   - Use `waitForLoadState('networkidle')` for dynamic content

4. **Error Handling**
   - Tests should handle both success and failure cases
   - Verify error messages are displayed correctly
   - Test recovery from error states

## Continuous Integration

Add to your CI pipeline:
```yaml
- name: Run Frontend Tests
  run: |
    npm run build
    npm start &
    sleep 10
    npm run test:frontend
```

## Extending Tests

To add new tests:

1. Add test method to `FrontendTestSuite` class
2. Call the method in `runAllTests()`
3. Follow existing patterns for consistency
4. Update this documentation

## Troubleshooting

### Common Issues

1. **Login fails**
   - Verify admin user exists
   - Check credentials in test config
   - Ensure auth system is working

2. **Selectors not found**
   - Check if UI has changed
   - Verify element is visible
   - Add appropriate wait conditions

3. **Timeouts**
   - Increase timeout values
   - Check network conditions
   - Verify API endpoints are responding

4. **Test data conflicts**
   - Ensure unique identifiers
   - Run cleanup between test runs
   - Check for database constraints