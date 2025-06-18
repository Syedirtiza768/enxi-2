# Puppeteer Testing Guide for Quotations

## Overview
This guide explains how to use Puppeteer to automate testing of the multiline quotation functionality.

## Prerequisites
- Node.js installed
- Development server running (`npm run dev`)
- Puppeteer installed (already in package.json)

## Available Tests

### 1. Full Puppeteer Test (`puppeteer-quotation-multiline.test.js`)
- Comprehensive test with detailed logging
- Takes screenshots at each step
- Handles form interactions with multiple selectors
- Verifies calculations
- **Best for**: Debugging and visual verification

### 2. React-Aware Test (`puppeteer-quotation-react.test.js`)
- Uses page evaluation to interact with React components
- Handles React synthetic events properly
- More reliable for complex React forms
- **Best for**: Quick automated testing

## Running Tests

### Method 1: Using the Shell Script
```bash
# Make executable (first time only)
chmod +x scripts/run-puppeteer-test.sh

# Run the test
./scripts/run-puppeteer-test.sh
```

### Method 2: Direct Node Execution
```bash
# Run full test
node tests/e2e/puppeteer-quotation-multiline.test.js

# Run React-aware test
node tests/e2e/puppeteer-quotation-react.test.js
```

### Method 3: Add to package.json
```json
"scripts": {
  "test:puppeteer": "node tests/e2e/puppeteer-quotation-react.test.js",
  "test:puppeteer:full": "node tests/e2e/puppeteer-quotation-multiline.test.js"
}
```

Then run: `npm run test:puppeteer`

## Test Configuration

### Sales Case ID
The tests use a specific sales case ID. Update this in the test files if needed:
```javascript
const SALES_CASE_ID = 'cmc1d2rxm0003v2ogxh67lc1a';
```

### Browser Options
```javascript
const browser = await puppeteer.launch({
  headless: false,  // Set to true for CI/CD
  slowMo: 100,      // Milliseconds to slow down actions
  defaultViewport: { width: 1920, height: 1080 }
});
```

### Test Data
The tests create a quotation with:
- 10 line items
- Mix of products and services
- Section headers
- Various discounts and tax rates
- Internal notes

## Understanding the Tests

### Form Selectors
The tests try multiple selectors for each field:
```javascript
// Payment terms selectors
['input[name="paymentTerms"]', '#paymentTerms', 'input[placeholder*="payment"]']
```

### React Event Handling
For React forms, the tests use a special method to trigger events:
```javascript
const setNativeValue = (element, value) => {
  // Sets value and triggers React events
};
```

### Screenshot Locations
Screenshots are saved to:
- `tests/e2e/screenshots/`

## Troubleshooting

### Test Fails to Find Elements
1. Check if form structure has changed
2. Update selectors in test files
3. Use browser DevTools to find correct selectors

### Server Not Running
```bash
# Start the development server
npm run dev
```

### Calculations Don't Match
1. Verify the calculation logic in test matches app logic
2. Check for rounding differences
3. Ensure tax is calculated on discounted amounts

### Browser Doesn't Open
1. Check if Chrome/Chromium is installed
2. Try running in headless mode
3. Check system resources

## Customizing Tests

### Add More Line Items
```javascript
const quotationData = {
  items: [
    // Add more items here
    {
      code: 'NEW-ITEM',
      description: 'New Product',
      quantity: 1,
      unitPrice: 100,
      discount: 0,
      taxRate: 7.5
    }
  ]
};
```

### Change Wait Times
```javascript
// Increase timeout for slow systems
await page.waitForSelector('form', { timeout: 30000 });

// Add delays between actions
await page.waitForTimeout(1000); // 1 second
```

### Add Assertions
```javascript
// Verify specific values
const total = await page.$eval('.total-amount', el => el.textContent);
expect(total).toBe('$28,511.06');
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Puppeteer Tests
  run: |
    npm ci
    npm run build
    npm start &
    sleep 5
    npm run test:puppeteer -- --headless
```

### Environment Variables
```javascript
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const HEADLESS = process.env.CI === 'true';
```

## Best Practices

1. **Keep Tests Maintainable**
   - Use descriptive variable names
   - Comment complex selectors
   - Extract common functions

2. **Handle Timing Issues**
   - Use `waitForSelector` instead of fixed delays
   - Wait for network idle when appropriate
   - Add retries for flaky operations

3. **Debug Effectively**
   - Take screenshots on failure
   - Log important steps
   - Keep browser open in development

4. **Test Data Management**
   - Use consistent test data
   - Clean up after tests if needed
   - Consider using test databases

## Example Output

```
🚀 Starting Puppeteer Quotation Test

📍 Navigating to: http://localhost:3000/quotations/new?salesCaseId=...
✅ Form loaded

📝 Basic information filled

📦 Adding 10 line items...
✅ Item 1 filled
✅ Item 2 filled
...

📊 Expected Totals:
  Subtotal: $31,446.88
  Discount: $4,404.69
  Tax: $1,468.87
  Total: $28,511.06

🚀 Attempting to save quotation...
✅ Submit button clicked
🎉 Quotation created successfully!
📋 Quotation ID: abc123

✅ Test completed!
```