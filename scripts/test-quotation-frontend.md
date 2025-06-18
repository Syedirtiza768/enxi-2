# Frontend Testing Guide for Multiline Quotations

## Test URL
http://localhost:3000/quotations/new?salesCaseId=cmc1d2rxm0003v2ogxh67lc1a

## Test Scenarios

### 1. Basic Multiline Creation
1. Navigate to the quotation creation page with the sales case ID
2. Verify customer is pre-populated from the sales case
3. Add multiple line items with different types

### 2. Line Item Types to Test

#### A. Product Lines from Inventory
- Search and select existing inventory items
- Verify item details auto-populate (code, description, price)
- Adjust quantity and verify calculations

#### B. New Product Lines
- Add custom products not in inventory
- Enter custom item codes and descriptions
- Set custom prices

#### C. Service Lines
- Add service items (consulting, support, etc.)
- Verify tax handling for services
- Add internal notes for services

#### D. Line Headers
- Add section headers to organize the quote
- Verify headers don't affect totals
- Test proper sorting and display

### 3. Complex Calculations to Verify

1. **Discount Application**
   - Line-level discounts (percentage)
   - Different discount rates per line
   - Verify discount amounts calculate correctly

2. **Tax Calculations**
   - Different tax rates per line
   - Tax-exempt items (0% tax)
   - Tax on discounted amounts

3. **Totals**
   - Subtotal (sum of all line amounts before discount/tax)
   - Total discount amount
   - Total tax amount
   - Grand total

### 4. Edge Cases to Test

1. **Empty Lines**
   - Try submitting with empty item rows
   - Verify validation prevents submission

2. **Zero Quantities**
   - Enter 0 quantity and verify validation

3. **Negative Values**
   - Try negative quantities/prices
   - Verify validation prevents negative values

4. **Large Numbers**
   - Test with very large quantities
   - Test with high precision decimals

5. **Special Characters**
   - Use special characters in descriptions
   - Test Unicode characters
   - Test very long descriptions

### 5. Form Interactions

1. **Line Management**
   - Add new lines
   - Delete lines
   - Reorder lines (if supported)
   - Duplicate lines

2. **Auto-save/Draft**
   - Check if form saves draft automatically
   - Test browser refresh without losing data

3. **Validation Messages**
   - Submit without required fields
   - Verify helpful error messages

### 6. Performance Testing

1. **Many Lines**
   - Add 50+ line items
   - Verify form remains responsive
   - Check calculation speed

2. **Copy/Paste**
   - Test bulk data entry
   - Paste from Excel/spreadsheet

## Manual Test Execution Steps

1. **Setup**
   ```bash
   # Start the development server
   npm run dev
   ```

2. **Create Test Data**
   ```bash
   # Run the backend test script
   node scripts/test-quotation-multiline.js
   ```

3. **Frontend Testing**
   - Open browser to test URL
   - Follow test scenarios above
   - Document any issues found

## Expected Results

### Successful Creation
- Quotation saves without errors
- All line items preserved correctly
- Calculations match expected values
- Can view/edit created quotation

### Data Integrity
- Line numbers sequential
- Sort order maintained
- All fields saved to database
- Relations properly established

## Test Data Examples

### Product Line
```javascript
{
  itemCode: "LAPTOP-001",
  description: "Dell XPS 15 Laptop",
  quantity: 2,
  unitPrice: 1899.99,
  discount: 10,
  taxRate: 7.5
}
```

### Service Line
```javascript
{
  itemCode: "SVC-SETUP",
  description: "Professional Setup Service",
  quantity: 1,
  unitPrice: 500.00,
  discount: 0,
  taxRate: 0
}
```

### Header Line
```javascript
{
  isLineHeader: true,
  description: "Hardware Section",
  quantity: 1,
  unitPrice: 0
}
```