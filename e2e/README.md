# Enxi ERP End-to-End Testing Framework

This comprehensive E2E testing framework is built with Playwright and provides thorough coverage of all critical business workflows in the Enxi ERP system.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- The ERP application running locally

### Installation
```bash
# Install dependencies (if not already done)
npm install

# Install Playwright browsers
npx playwright install

# Setup test database and seed data
npm run test:e2e:setup
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific browser tests
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile

# Debug mode (step through tests)
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

## 📁 Framework Structure

```
e2e/
├── fixtures/           # Test data and seed files
│   └── seed-e2e-data.ts
├── page-objects/       # Page Object Model classes
│   ├── base-page.ts
│   ├── auth-page.ts
│   ├── dashboard-page.ts
│   ├── leads-page.ts
│   ├── quotations-page.ts
│   └── inventory-page.ts
├── setup/             # Test setup and teardown
│   ├── auth.setup.ts
│   └── cleanup.teardown.ts
├── tests/             # Test specifications
│   ├── auth-workflow.spec.ts
│   ├── lead-to-sale-workflow.spec.ts
│   ├── inventory-management-workflow.spec.ts
│   └── purchase-to-payment-workflow.spec.ts
├── utils/             # Utility functions
│   ├── test-helpers.ts
│   └── database-helpers.ts
├── global-setup.ts    # Global test setup
├── global-teardown.ts # Global test cleanup
└── README.md
```

## 🎯 Test Coverage

### Critical Workflows Covered

1. **Authentication & Authorization**
   - Login/logout flows
   - Session management
   - Role-based access control
   - Security validations

2. **Lead to Sale Conversion**
   - Lead creation and management
   - Lead qualification process
   - Customer conversion
   - Quotation creation and sending
   - Sales order generation
   - Invoice creation

3. **Inventory Management**
   - Category and item management
   - Stock movements and adjustments
   - Search and filtering
   - Low stock alerts
   - Inventory reporting

4. **Purchase to Payment**
   - Supplier management
   - Purchase order creation and approval
   - Goods receipt processing
   - Supplier invoice handling
   - Three-way matching
   - Payment processing

5. **Customer Management**
   - Customer creation and editing
   - Payment history tracking
   - Credit management
   - Business analytics

6. **Approval Workflows**
   - Sales order approvals
   - Purchase order approvals
   - Payment authorizations

## 🔧 Configuration

### Playwright Configuration
The framework is configured in `playwright.config.ts` with:
- Multi-browser support (Chromium, Firefox, WebKit)
- Mobile device testing
- Parallel test execution
- Screenshots and video on failure
- HTML reporting
- CI/CD integration

### Environment Variables
```bash
E2E_BASE_URL=http://localhost:3000  # Application URL
DATABASE_URL=file:./e2e-test.db     # Test database
NODE_ENV=test                       # Environment
```

## 📊 Page Object Model

The framework uses the Page Object Model pattern for maintainable and reusable test code:

### BasePage
Common functionality shared across all pages:
- Navigation helpers
- Wait utilities
- Form helpers
- Screenshot capture
- Accessibility checks

### Specific Page Objects
- **AuthPage**: Login/logout functionality
- **DashboardPage**: Main navigation and dashboard
- **LeadsPage**: Lead management workflows
- **QuotationsPage**: Quotation creation and management
- **InventoryPage**: Inventory and stock management

Example usage:
```typescript
const authPage = new AuthPage(page);
const dashboardPage = new DashboardPage(page);

await authPage.loginAsAdmin();
await dashboardPage.navigateToCustomers();
```

## 🛠 Utilities

### TestHelpers
Utility functions for common testing tasks:
- Random data generation
- Currency and date formatting
- API mocking and interception
- Performance measurement
- Accessibility testing
- Responsive design testing

### DatabaseHelpers
Database management utilities:
- Test data creation
- Cleanup operations
- Entity management
- Transaction helpers

## 🔄 Test Data Management

### Seed Data
The framework includes comprehensive seed data covering:
- Users with different roles
- Company settings
- Chart of accounts
- Tax configuration
- Inventory categories and items
- Customers and suppliers
- Sample transactions

### Test Data Generation
Dynamic test data generation for:
- Unique identifiers
- Realistic business data
- Edge case scenarios
- Performance testing data

## 📈 Reporting and Analytics

### HTML Reports
Comprehensive HTML reports include:
- Test execution summary
- Pass/fail status for each test
- Screenshots and videos on failure
- Performance metrics
- Error details and stack traces

### CI/CD Integration
GitHub Actions workflow provides:
- Multi-browser testing
- Performance benchmarking
- Mobile device testing
- Accessibility validation
- Automatic report generation
- Slack notifications on failure

## 🎨 Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Include setup and teardown
- Clean up test data after each test

### Page Objects
- Keep page objects focused on single responsibility
- Use meaningful locator strategies
- Include validation methods
- Handle loading states

### Data Management
- Use test-specific data prefixes
- Clean up after each test
- Use factories for test data
- Avoid hardcoded values

### Assertions
- Use meaningful assertion messages
- Check both positive and negative cases
- Validate business logic, not just UI
- Include performance assertions

## 🐛 Debugging

### Debug Mode
```bash
# Run tests in debug mode
npm run test:e2e:debug

# Run specific test in debug mode
npx playwright test --debug auth-workflow.spec.ts
```

### Screenshot and Video
Tests automatically capture:
- Screenshots on failure
- Video recordings on failure
- Full page screenshots for key steps

### Logging
Comprehensive logging includes:
- Test step descriptions
- Performance metrics
- Error details
- Business workflow progress

## 🚀 Performance Testing

The framework includes performance monitoring for:
- Page load times
- Form submission speed
- Search and filtering operations
- Large data set handling
- Memory usage patterns

Performance thresholds are enforced to catch regressions early.

## ♿ Accessibility Testing

Automated accessibility checks include:
- Missing alt text detection
- Form label validation
- Keyboard navigation testing
- Color contrast verification
- WCAG compliance basics

## 📱 Mobile Testing

Mobile testing covers:
- Responsive design validation
- Touch interactions
- Mobile-specific workflows
- Performance on mobile devices

## 🔒 Security Testing

Security validations include:
- Authentication bypass attempts
- Authorization checks
- Session management
- Input validation
- CSRF protection

## 🤝 Contributing

### Adding New Tests
1. Create test specification in `e2e/tests/`
2. Follow naming convention: `feature-workflow.spec.ts`
3. Use existing page objects or create new ones
4. Include comprehensive test coverage
5. Add appropriate cleanup

### Adding Page Objects
1. Extend `BasePage` class
2. Define meaningful locators
3. Create workflow methods
4. Include validation helpers
5. Document public methods

### Test Data
1. Use `TestHelpers.generateTestData()`
2. Clean up in `afterEach` hooks
3. Use realistic business data
4. Avoid hardcoded values

## 📞 Support

For questions or issues with the E2E testing framework:
1. Check existing test examples
2. Review page object documentation
3. Consult Playwright documentation
4. Create an issue with detailed reproduction steps

## 🔄 Continuous Improvement

The testing framework is continuously improved with:
- New workflow coverage
- Enhanced reporting
- Performance optimizations
- Better error handling
- Updated dependencies

Regular reviews ensure the framework meets evolving business needs and maintains high reliability standards.