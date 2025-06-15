#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Enxi ERP API Endpoints with Authentication"
echo "=============================================="

# Login first
echo -e "\n${YELLOW}1. Testing Login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✅ Login successful${NC}"
  echo "Token: ${TOKEN:0:50}..."
else
  echo -e "${RED}❌ Login failed${NC}"
  echo $LOGIN_RESPONSE
  exit 1
fi

# Function to test API endpoint
test_api() {
  local endpoint=$1
  local description=$2
  
  echo -e "\n${YELLOW}Testing: $description${NC}"
  echo "Endpoint: $endpoint"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:3000$endpoint")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success (HTTP $HTTP_CODE)${NC}"
    echo "Response preview: $(echo $BODY | head -c 100)..."
  else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
  fi
}

# Test critical endpoints
echo -e "\n${YELLOW}2. Testing API Endpoints...${NC}"

test_api "/api/users" "Users API"
test_api "/api/customers" "Customers API"
test_api "/api/leads" "Leads API"
test_api "/api/sales-cases" "Sales Cases API"
test_api "/api/quotations" "Quotations API"
test_api "/api/sales-orders" "Sales Orders API"
test_api "/api/invoices" "Invoices API"
test_api "/api/payments" "Payments API"
test_api "/api/inventory/items" "Inventory Items API"
test_api "/api/inventory/stock-movements" "Stock Movements API"
test_api "/api/purchase-orders" "Purchase Orders API"
test_api "/api/suppliers" "Suppliers API"
test_api "/api/accounting/accounts" "Accounting Accounts API"
test_api "/api/accounting/journal-entries" "Journal Entries API"
test_api "/api/reporting/dashboard?includeInventory=true&includeSales=true" "Dashboard API"

echo -e "\n${YELLOW}3. Testing Health Check...${NC}"
test_api "/api/system/health" "System Health API"

echo -e "\n${GREEN}✅ API testing complete!${NC}"