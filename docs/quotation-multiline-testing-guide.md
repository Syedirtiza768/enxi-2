# Quotation Multiline Testing Guide

## Overview
This guide provides comprehensive instructions for testing the multiline quotation functionality in the Enxi ERP system.

## Test URL
```
http://localhost:3000/quotations/new?salesCaseId=cmc1d2rxm0003v2ogxh67lc1a
```

## Testing Approach

### 1. Backend API Testing
Run the Node.js test scripts to verify API functionality:

```bash
# Simple test (2 items)
node scripts/test-quotation-simple.js

# Complex test (10 items with headers)
node scripts/test-quotation-multiline.js
```

### 2. Frontend Browser Testing

#### A. Automated Helper
1. Open the quotation form at the test URL
2. Open browser DevTools (F12)
3. Copy the contents of `scripts/browser-test-quotation.js`
4. Paste into the console and press Enter
5. Run `fillQuotationForm()` to auto-fill basic fields and see test data

#### B. Manual Testing Steps

1. **Navigate to Form**
   - Go to the test URL
   - Verify customer is pre-populated from sales case

2. **Fill Basic Information**
   - Payment Terms: "Net 30 days"
   - Delivery Terms: "FOB Destination"
   - Special Instructions: Add any customer-visible notes
   - Internal Notes: Add internal-only notes

3. **Add Line Items** (in order):

   **Line 1 - Header**
   - Click "Add Line"
   - Select type: Header
   - Description: "Computer Equipment"

   **Line 2 - Product**
   - Click "Add Line"
   - Type: Product
   - Code: LAPTOP-PRO-001
   - Description: MacBook Pro 16" M3 Max
   - Quantity: 3
   - Unit Price: 4999.99
   - Discount: 10%
   - Tax: 7.5%

   **Line 3 - Product**
   - Type: Product
   - Code: MON-4K-DELL
   - Description: Dell UltraSharp 32" 4K Monitor
   - Quantity: 6
   - Unit Price: 899.00
   - Discount: 15%
   - Tax: 7.5%

   **Line 4 - Header**
   - Type: Header
   - Description: "Professional Services"

   **Line 5 - Service**
   - Type: Service
   - Code: SVC-SETUP-PRO
   - Description: Professional Workstation Setup
   - Quantity: 3
   - Unit Price: 500.00
   - Discount: 0%
   - Tax: 0%

   **Line 6 - Service**
   - Type: Service
   - Code: SVC-TRAINING
   - Description: On-site Training (2 days)
   - Quantity: 1
   - Unit Price: 2400.00
   - Discount: 20%
   - Tax: 0%

   **Line 7 - Header**
   - Type: Header
   - Description: "Accessories"

   **Line 8 - Product**
   - Type: Product
   - Code: ACC-DOCK-TB4
   - Description: Thunderbolt 4 Docking Station
   - Quantity: 3
   - Unit Price: 299.99
   - Discount: 5%
   - Tax: 7.5%

   **Line 9 - Product**
   - Type: Product
   - Code: ACC-HEADSET-PRO
   - Description: Professional Wireless Headset
   - Quantity: 6
   - Unit Price: 249.99
   - Discount: 10%
   - Tax: 7.5%

   **Line 10 - Service**
   - Type: Service
   - Code: SVC-WARRANTY-EXT
   - Description: 3-Year Extended Warranty
   - Quantity: 1
   - Unit Price: 3500.00
   - Discount: 0%
   - Tax: 0%

4. **Verify Calculations**
   Expected totals:
   - Subtotal: $31,446.88
   - Total Discount: $4,404.69
   - Total Tax: $1,468.87
   - Grand Total: $28,511.06

5. **Save and Test**
   - Click "Save as Draft" first
   - Verify quotation is created
   - Check quotation details page
   - Try "Send to Customer" functionality

## Test Scenarios

### Positive Tests
1. ✅ Create quotation with all line types
2. ✅ Mix products and services
3. ✅ Use section headers
4. ✅ Apply different discount rates
5. ✅ Apply different tax rates
6. ✅ Add internal notes
7. ✅ Save as draft
8. ✅ Send to customer

### Negative Tests
1. ❌ Submit without items
2. ❌ Enter negative quantities
3. ❌ Enter invalid prices
4. ❌ Leave required fields empty

### Edge Cases
1. 🔄 Very long descriptions
2. 🔄 Special characters in text
3. 🔄 High precision decimals
4. 🔄 50+ line items
5. 🔄 Zero price items
6. 🔄 100% discount

## Verification Checklist

### Frontend
- [ ] Form loads correctly
- [ ] Customer pre-populates
- [ ] Line items can be added
- [ ] Headers don't affect totals
- [ ] Calculations are accurate
- [ ] Validation works properly
- [ ] Save functionality works
- [ ] No console errors

### Backend
- [ ] API accepts multiline data
- [ ] All fields are saved
- [ ] Calculations match frontend
- [ ] Database stores correctly
- [ ] Relations are established
- [ ] Status tracking works

### Integration
- [ ] PDF generation includes all lines
- [ ] Email includes all items
- [ ] View page shows all data
- [ ] Edit preserves all items
- [ ] Clone functionality works

## Common Issues

1. **API Returns 500 Error**
   - Check server logs
   - Verify database connection
   - Check for validation errors

2. **Calculations Don't Match**
   - Verify discount calculation order
   - Check tax on discounted amounts
   - Ensure headers excluded from totals

3. **Items Not Saving**
   - Check browser console for errors
   - Verify all required fields filled
   - Check network tab for API calls

## Success Criteria

A successful test means:
1. Quotation created with 10+ line items
2. Mix of products, services, and headers
3. Calculations are accurate
4. All data saved to database
5. Can view and edit quotation
6. PDF generation works
7. Email sending works

## Test Results Documentation

After testing, document:
- Date/time of test
- Any errors encountered
- Screenshots of issues
- Performance observations
- Suggestions for improvement