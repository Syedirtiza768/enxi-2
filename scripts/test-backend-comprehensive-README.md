# Comprehensive Backend Test Suite

This test suite validates the complete workflow from quotation to payment, including all the functionality described in the quotation document.

## Test Coverage

The test suite covers the following workflows:

### 1. Service Item Creation
- Creates 8 service/product items from the quotation
- Validates item types (SERVICE vs PRODUCT)
- Sets up proper categories and units of measure

### 2. Quotation Creation
- Creates a multi-line quotation with grouped items
- Validates calculations (subtotal: 27,280 AED, VAT 5%: 1,364 AED, total: 28,644 AED)
- Tests line item grouping functionality

### 3. Quotation Revision
- Tests the revision functionality
- Applies discounts and recalculates totals
- Maintains version history

### 4. Quotation Approval
- Tests sending quotation to customer
- Records customer PO number
- Changes status to ACCEPTED

### 5. Sales Order Creation
- Converts accepted quotation to sales order
- Maintains all line items and pricing
- Sets delivery and payment terms

### 6. Expense Recording
- Records multiple expense categories against sales case
- Tracks: Labor, Transport, Equipment, Materials
- Calculates total expenses

### 7. Profitability Calculations
- Calculates expected vs actual revenue
- Computes profit margins
- Provides sales case summary

### 8. Invoice Generation
- Creates invoice from approved sales order
- Maintains item details and pricing
- Sets payment terms (40% advance, 60% final)

### 9. Payment Recording
- Records 40% advance payment
- Records 60% final payment
- Updates invoice status to PAID
- Updates customer balance

### 10. Shipment and Fulfillment
- Creates shipment for product items
- Confirms and delivers shipment
- Updates order fulfillment status

### 11. Error Handling Tests
- Tests invalid quotation data
- Tests duplicate acceptance
- Tests overpayment scenarios
- Tests invalid shipment creation

## Running the Test

1. Make sure the server is running:
   ```bash
   npm run dev
   ```

2. In another terminal, run the test:
   ```bash
   npx tsx scripts/test-backend-comprehensive.ts
   ```

## Expected Output

The test will create:
- 8 service/product items
- 1 customer (Marine Services LLC)
- 1 sales case
- 1 quotation with 8 line items in 5 groups
- 1 sales order
- 4 expense records
- 1 invoice
- 2 payment records
- 1 shipment (for product items)

## Test Data

The test uses the exact data from the quotation document:
- Customer: Marine Services LLC
- Subtotal: 27,280 AED
- VAT (5%): 1,364 AED
- Total: 28,644 AED
- Payment Terms: 40% advance, 60% on completion

## Success Criteria

All tests should pass with:
- ✅ All service items created
- ✅ Quotation totals match expected values
- ✅ Workflow transitions work correctly
- ✅ Payments recorded accurately
- ✅ Error cases handled properly