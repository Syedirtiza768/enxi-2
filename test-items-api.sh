#!/bin/bash

# Test Items API Endpoints

BASE_URL="http://localhost:3002"
API_PATH="/api/inventory/items"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Items API Tests...${NC}\n"

# Test 1: GET all items
echo -e "${YELLOW}1. Testing GET /api/inventory/items - List all items${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${API_PATH}" -H "Content-Type: application/json")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ GET all items successful (HTTP $http_code)${NC}"
    echo "Response: $body"
else
    echo -e "${RED}✗ GET all items failed (HTTP $http_code)${NC}"
    echo "Response: $body"
fi
echo ""

# Test 2: POST - Create a new test item
echo -e "${YELLOW}2. Testing POST /api/inventory/items - Create a new test item${NC}"
item_data="{
  \"code\": \"TEST-ITEM-$(date +%s)\",
  \"name\": \"Test Item 001\",
  \"description\": \"This is a test item created via API\",
  \"categoryId\": \"test-inv-cat-001\",
  \"type\": \"PRODUCT\",
  \"unitOfMeasureId\": \"test-uom-001\",
  \"trackInventory\": true,
  \"minStockLevel\": 10,
  \"maxStockLevel\": 100,
  \"reorderPoint\": 20,
  \"standardCost\": 25.50,
  \"listPrice\": 39.99,
  \"isSaleable\": true,
  \"isPurchaseable\": true
}"

response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${API_PATH}" \
  -H "Content-Type: application/json" \
  -d "$item_data")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✓ POST create item successful (HTTP $http_code)${NC}"
    echo "Response: $body"
    # Extract item ID for subsequent tests
    ITEM_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "Created item ID: $ITEM_ID"
else
    echo -e "${RED}✗ POST create item failed (HTTP $http_code)${NC}"
    echo "Response: $body"
fi
echo ""

# Test 3: GET specific item (if we have an ID)
if [ ! -z "$ITEM_ID" ]; then
    echo -e "${YELLOW}3. Testing GET /api/inventory/items/[id] - Get specific item${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${API_PATH}/${ITEM_ID}" -H "Content-Type: application/json")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ GET specific item successful (HTTP $http_code)${NC}"
        echo "Response: $body"
    else
        echo -e "${RED}✗ GET specific item failed (HTTP $http_code)${NC}"
        echo "Response: $body"
    fi
    echo ""
fi

# Test 4: PUT - Update item (if we have an ID)
if [ ! -z "$ITEM_ID" ]; then
    echo -e "${YELLOW}4. Testing PUT /api/inventory/items/[id] - Update item${NC}"
    update_data='{
      "name": "Test Item 001 - Updated",
      "description": "This is an updated test item",
      "listPrice": 49.99,
      "minStockLevel": 15
    }'

    response=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}${API_PATH}/${ITEM_ID}" \
      -H "Content-Type: application/json" \
      -d "$update_data")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ PUT update item successful (HTTP $http_code)${NC}"
        echo "Response: $body"
    else
        echo -e "${RED}✗ PUT update item failed (HTTP $http_code)${NC}"
        echo "Response: $body"
    fi
    echo ""
fi

# Test 5: DELETE item (if we have an ID)
if [ ! -z "$ITEM_ID" ]; then
    echo -e "${YELLOW}5. Testing DELETE /api/inventory/items/[id] - Delete test item${NC}"
    response=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}${API_PATH}/${ITEM_ID}" -H "Content-Type: application/json")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ DELETE item successful (HTTP $http_code)${NC}"
        echo "Response: $body"
    else
        echo -e "${RED}✗ DELETE item failed (HTTP $http_code)${NC}"
        echo "Response: $body"
    fi
    echo ""
fi

# Additional Tests

# Test 6: Test filters
echo -e "${YELLOW}6. Testing GET with filters${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${API_PATH}?type=PRODUCT&isActive=true&limit=5" -H "Content-Type: application/json")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ GET with filters successful (HTTP $http_code)${NC}"
    echo "Response (truncated): ${body:0:200}..."
else
    echo -e "${RED}✗ GET with filters failed (HTTP $http_code)${NC}"
    echo "Response: $body"
fi
echo ""

# Test 7: Test validation errors
echo -e "${YELLOW}7. Testing POST with invalid data (validation test)${NC}"
invalid_data='{
  "name": "Missing Required Fields"
}'

response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${API_PATH}" \
  -H "Content-Type: application/json" \
  -d "$invalid_data")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "400" ]; then
    echo -e "${GREEN}✓ Validation error correctly returned (HTTP $http_code)${NC}"
    echo "Response: $body"
else
    echo -e "${RED}✗ Expected 400 error, got HTTP $http_code${NC}"
    echo "Response: $body"
fi

echo -e "\n${YELLOW}API Testing Complete!${NC}"