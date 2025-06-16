# Quotation Module Test Checklist

## Fixed Issues
- ✅ SQLite compatibility issue with case-insensitive search
- ✅ Inventory search API response handling
- ✅ Property mapping corrections (listPrice, standardCost)
- ✅ Authentication consistency across APIs
- ✅ Quotation save validation and error handling

## Test Scenarios

### 1. Inventory Search
- [ ] Type at least 3 characters in search box (e.g., "test", "eng")
- [ ] Verify search results appear
- [ ] Verify item details show correctly (name, code, price, stock)
- [ ] Click on an item to add it to quotation

### 2. Manual Item Entry
- [ ] When no search results found, manual entry form should appear
- [ ] Fill in item details (name, price, description)
- [ ] Add custom item to quotation
- [ ] Verify item appears in the list

### 3. Item Management
- [ ] Edit item quantity and price
- [ ] Apply discount percentage
- [ ] Add tax rate
- [ ] Remove items from list
- [ ] Verify subtotal calculations

### 4. Quotation Save
- [ ] Fill in required fields (customer, sales case, expiry date)
- [ ] Add at least one item
- [ ] Save as draft
- [ ] Verify successful save and redirect
- [ ] Check quotation appears in list

### 5. Edge Cases
- [ ] Try saving without items (should show error)
- [ ] Try saving without customer (should show error)
- [ ] Search with special characters
- [ ] Add multiple items and verify totals

## Available Test Items
- TEST-001: Test Product 1 ($100.00)
- TEST-002: Test Service 1 ($150.00)
- ENG-001: Engineering Service ($200.00)

## Known Limitations
- Search is case-sensitive in SQLite (by design)
- Minimum 3 characters required for search
- Authentication required for all API calls