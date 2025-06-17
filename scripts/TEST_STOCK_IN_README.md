# Stock-In GL Integration Testing Guide

This directory contains test scripts to verify the Stock-In functionality with General Ledger (GL) integration.

## Available Test Scripts

### 1. **test-stock-in-gl.sh** (Automated Bash Script)
Complete automated test that:
- Creates stock-in transactions for LAPTOP-001 and PAPER-A4
- Verifies inventory balance updates
- Checks journal entry creation
- Validates GL account debits/credits
- Provides colored output and summary

**Usage:**
```bash
./scripts/test-stock-in-gl.sh
```

### 2. **test-stock-in-manual.sh** (Manual curl Commands)
Contains individual curl commands for manual testing. Use this to:
- Test specific scenarios
- Debug individual API calls
- Understand the API flow

**Usage:**
```bash
# View the commands
cat ./scripts/test-stock-in-manual.sh

# Or copy/paste individual commands
```

### 3. **test-stock-in-gl.js** (Node.js Script)
JavaScript test script that:
- Tests multiple items in sequence
- Provides detailed logging
- Checks GL account balances
- Validates journal entry balance

**Usage:**
```bash
node ./scripts/test-stock-in-gl.js
```

### 4. **test_stock_in_gl.py** (Python Script)
Python test script with similar functionality to the Node.js version.

**Usage:**
```bash
python3 ./scripts/test_stock_in_gl.py
```

## What the Tests Verify

1. **Stock Movement Creation**
   - Creates IN type movements
   - Validates API response
   - Captures movement ID for tracking

2. **Inventory Balance Updates**
   - Checks initial balance
   - Verifies balance increases by correct quantity
   - Tests multiple locations

3. **Journal Entry Creation**
   - Confirms journal entry is created
   - Validates reference matches movement ID
   - Checks debit/credit accounts

4. **GL Integration**
   - Verifies inventory account (1300) is debited
   - Verifies accounts payable (2100) is credited
   - Ensures journal entry is balanced
   - Validates amounts match (quantity × unit cost)

## Test Scenarios

The scripts test the following scenarios:

1. **LAPTOP-001 Stock-In**
   - Quantity: 5 units
   - Unit Cost: $1,500.00
   - Total: $7,500.00
   - Location: WAREHOUSE-A

2. **PAPER-A4 Stock-In**
   - Quantity: 100 units
   - Unit Cost: $5.00
   - Total: $500.00
   - Location: WAREHOUSE-A

## Expected Results

✅ **Successful Test:**
- Stock movement created with ID
- Inventory balance increased
- Journal entry created with:
  - Debit to Inventory (1300)
  - Credit to Accounts Payable (2100)
  - Balanced totals

❌ **Failed Test:**
- Missing journal entry
- Incorrect account codes
- Unbalanced journal entry
- Wrong amounts

## Manual Testing with curl

For quick manual tests, use these commands:

```bash
# Create a stock-in
curl -X POST http://localhost:3000/api/stock-movements \
  -H "Content-Type: application/json" \
  -d '{
    "type": "IN",
    "itemCode": "LAPTOP-001",
    "quantity": 5,
    "unitCost": 1500.00,
    "location": "WAREHOUSE-A",
    "reference": "TEST-001",
    "notes": "Test stock-in"
  }'

# Check journal entries (replace MOVEMENT_ID with actual ID)
curl "http://localhost:3000/api/journal-entries?reference=STOCK-IN-MOVEMENT_ID"
```

## Troubleshooting

1. **No Journal Entry Created**
   - Check if StockMovementService properly calls journalService
   - Verify GL account mappings exist
   - Check for errors in server logs

2. **Wrong Accounts Used**
   - Verify account codes in GL_ACCOUNTS configuration
   - Check if accounts exist in database

3. **Unbalanced Entry**
   - Ensure amounts are calculated correctly
   - Check for rounding issues
   - Verify both debit and credit lines are created

4. **API Errors**
   - Ensure server is running on port 3000
   - Check authentication if required
   - Verify database is accessible

## Prerequisites

- Enxi ERP server running on http://localhost:3000
- Test items (LAPTOP-001, PAPER-A4) exist in database
- GL accounts configured (1300, 2100)
- Node.js or Python 3 installed (for respective scripts)

## Running All Tests

To run all tests in sequence:

```bash
# Make scripts executable (first time only)
chmod +x ./scripts/test-stock-in-*.sh

# Run bash test
./scripts/test-stock-in-gl.sh

# Run Node.js test
node ./scripts/test-stock-in-gl.js

# Run Python test
python3 ./scripts/test_stock_in_gl.py
```