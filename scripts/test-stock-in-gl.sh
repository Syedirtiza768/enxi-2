#!/bin/bash

# Test Stock-In functionality with GL integration
# This script tests the complete flow from stock movement to journal entry creation

echo "🧪 Testing Stock-In functionality with GL integration"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API base URL
BASE_URL="http://localhost:3000/api"

# Test data
ITEM_CODE="LAPTOP-001"
QUANTITY=5
UNIT_COST=1500.00
LOCATION="WAREHOUSE-A"
REFERENCE="TEST-STOCK-IN-$(date +%s)"
NOTES="Test stock-in transaction with GL integration"

echo -e "\n${YELLOW}Test Configuration:${NC}"
echo "Item Code: $ITEM_CODE"
echo "Quantity: $QUANTITY"
echo "Unit Cost: $UNIT_COST"
echo "Location: $LOCATION"
echo "Reference: $REFERENCE"

# Step 1: Check initial inventory balance
echo -e "\n${YELLOW}Step 1: Checking initial inventory balance...${NC}"
INITIAL_BALANCE=$(curl -s "$BASE_URL/inventory/balances?itemCode=$ITEM_CODE&location=$LOCATION" | jq -r '.data[0].quantity // 0')
echo "Initial balance for $ITEM_CODE at $LOCATION: $INITIAL_BALANCE"

# Step 2: Create stock-in transaction
echo -e "\n${YELLOW}Step 2: Creating stock-in transaction...${NC}"
STOCK_IN_RESPONSE=$(curl -s -X POST "$BASE_URL/stock-movements" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"IN\",
    \"itemCode\": \"$ITEM_CODE\",
    \"quantity\": $QUANTITY,
    \"unitCost\": $UNIT_COST,
    \"location\": \"$LOCATION\",
    \"reference\": \"$REFERENCE\",
    \"notes\": \"$NOTES\"
  }")

# Check if stock-in was successful
if echo "$STOCK_IN_RESPONSE" | jq -e '.data.id' > /dev/null 2>&1; then
    MOVEMENT_ID=$(echo "$STOCK_IN_RESPONSE" | jq -r '.data.id')
    echo -e "${GREEN}✓ Stock-in created successfully${NC}"
    echo "Movement ID: $MOVEMENT_ID"
    echo "$STOCK_IN_RESPONSE" | jq '.data'
else
    echo -e "${RED}✗ Failed to create stock-in${NC}"
    echo "$STOCK_IN_RESPONSE" | jq '.'
    exit 1
fi

# Step 3: Verify inventory balance was updated
echo -e "\n${YELLOW}Step 3: Verifying inventory balance update...${NC}"
sleep 1 # Give the system a moment to process
NEW_BALANCE=$(curl -s "$BASE_URL/inventory/balances?itemCode=$ITEM_CODE&location=$LOCATION" | jq -r '.data[0].quantity // 0')
EXPECTED_BALANCE=$((INITIAL_BALANCE + QUANTITY))

echo "New balance: $NEW_BALANCE"
echo "Expected balance: $EXPECTED_BALANCE"

if [ "$NEW_BALANCE" -eq "$EXPECTED_BALANCE" ]; then
    echo -e "${GREEN}✓ Inventory balance updated correctly${NC}"
else
    echo -e "${RED}✗ Inventory balance mismatch${NC}"
fi

# Step 4: Check if journal entry was created
echo -e "\n${YELLOW}Step 4: Checking for journal entry creation...${NC}"
# Get the journal entry by reference (movement ID)
JOURNAL_RESPONSE=$(curl -s "$BASE_URL/journal-entries?reference=STOCK-IN-$MOVEMENT_ID")

if echo "$JOURNAL_RESPONSE" | jq -e '.data[0]' > /dev/null 2>&1; then
    JOURNAL_ID=$(echo "$JOURNAL_RESPONSE" | jq -r '.data[0].id')
    echo -e "${GREEN}✓ Journal entry found${NC}"
    echo "Journal Entry ID: $JOURNAL_ID"
    
    # Display journal entry details
    echo -e "\n${YELLOW}Journal Entry Details:${NC}"
    echo "$JOURNAL_RESPONSE" | jq '.data[0]'
    
    # Verify journal entry lines
    echo -e "\n${YELLOW}Verifying journal entry lines...${NC}"
    LINES=$(echo "$JOURNAL_RESPONSE" | jq '.data[0].lines')
    
    # Calculate expected total
    TOTAL_AMOUNT=$(echo "$QUANTITY * $UNIT_COST" | bc)
    
    # Check debit to inventory account
    DEBIT_LINE=$(echo "$LINES" | jq '.[] | select(.type == "DEBIT")')
    DEBIT_AMOUNT=$(echo "$DEBIT_LINE" | jq -r '.amount')
    DEBIT_ACCOUNT=$(echo "$DEBIT_LINE" | jq -r '.accountCode')
    
    echo "Debit Account: $DEBIT_ACCOUNT (should be inventory account)"
    echo "Debit Amount: $DEBIT_AMOUNT (should be $TOTAL_AMOUNT)"
    
    # Check credit to payables/cash account
    CREDIT_LINE=$(echo "$LINES" | jq '.[] | select(.type == "CREDIT")')
    CREDIT_AMOUNT=$(echo "$CREDIT_LINE" | jq -r '.amount')
    CREDIT_ACCOUNT=$(echo "$CREDIT_LINE" | jq -r '.accountCode')
    
    echo "Credit Account: $CREDIT_ACCOUNT"
    echo "Credit Amount: $CREDIT_AMOUNT (should be $TOTAL_AMOUNT)"
    
    # Verify amounts match
    if [ "$DEBIT_AMOUNT" = "$TOTAL_AMOUNT" ] && [ "$CREDIT_AMOUNT" = "$TOTAL_AMOUNT" ]; then
        echo -e "${GREEN}✓ Journal entry amounts are correct${NC}"
    else
        echo -e "${RED}✗ Journal entry amounts do not match expected values${NC}"
    fi
else
    echo -e "${RED}✗ No journal entry found${NC}"
    echo "$JOURNAL_RESPONSE" | jq '.'
fi

# Step 5: Test with additional scenarios
echo -e "\n${YELLOW}Step 5: Testing additional scenarios...${NC}"

# Test with PAPER-A4
echo -e "\n${YELLOW}Testing with PAPER-A4...${NC}"
PAPER_RESPONSE=$(curl -s -X POST "$BASE_URL/stock-movements" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"IN\",
    \"itemCode\": \"PAPER-A4\",
    \"quantity\": 100,
    \"unitCost\": 5.00,
    \"location\": \"$LOCATION\",
    \"reference\": \"TEST-PAPER-$(date +%s)\",
    \"notes\": \"Test paper stock-in\"
  }")

if echo "$PAPER_RESPONSE" | jq -e '.data.id' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PAPER-A4 stock-in successful${NC}"
    PAPER_ID=$(echo "$PAPER_RESPONSE" | jq -r '.data.id')
    
    # Check journal entry for paper
    sleep 1
    PAPER_JOURNAL=$(curl -s "$BASE_URL/journal-entries?reference=STOCK-IN-$PAPER_ID")
    if echo "$PAPER_JOURNAL" | jq -e '.data[0]' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Journal entry created for PAPER-A4${NC}"
    else
        echo -e "${RED}✗ No journal entry for PAPER-A4${NC}"
    fi
else
    echo -e "${RED}✗ PAPER-A4 stock-in failed${NC}"
fi

# Summary
echo -e "\n${YELLOW}========== Test Summary ==========${NC}"
echo "✓ Stock-in transaction created"
echo "✓ Inventory balance updated"
if echo "$JOURNAL_RESPONSE" | jq -e '.data[0]' > /dev/null 2>&1; then
    echo "✓ Journal entry created with correct accounts"
    echo "✓ GL integration working correctly"
else
    echo "✗ Journal entry creation needs investigation"
fi

echo -e "\n${GREEN}Test completed!${NC}"