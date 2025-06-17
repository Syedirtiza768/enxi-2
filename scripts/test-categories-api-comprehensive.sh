#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3002"

# Test variables
TEST_CATEGORY_ID=""
PARENT_CATEGORY_ID=""
CHILD_CATEGORY_ID=""

# Function to print test header
print_test() {
    echo -e "\n${BLUE}=================================================================================${NC}"
    echo -e "${YELLOW}TEST: $1${NC}"
    echo -e "${BLUE}=================================================================================${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to make API call and show response
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${YELLOW}$description${NC}"
    echo -e "Method: $method"
    echo -e "Endpoint: $endpoint"
    
    if [ ! -z "$data" ]; then
        echo -e "Data: $data"
    fi
    
    echo -e "\nResponse:"
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" -H "Content-Type: application/json")
    elif [ "$method" == "DELETE" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" -H "Content-Type: application/json")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" -H "Content-Type: application/json" -d "$data")
    fi
    
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    
    # Return the response for further processing
    echo "$response"
}

# Start testing
echo -e "${GREEN}Starting Comprehensive Categories API Tests${NC}"
echo -e "Testing against: $BASE_URL"
echo -e "Time: $(date)"

# Test 1: GET all categories
print_test "1. GET /api/inventory/categories - List all categories"
api_call "GET" "/api/inventory/categories" "" "Fetching all categories"

# Test 2: GET categories with filters
print_test "2. GET /api/inventory/categories with filters"
api_call "GET" "/api/inventory/categories?isActive=true&includeChildren=true&limit=10" "" "Fetching active categories with children (limit 10)"

# Test 3: Create parent category
print_test "3. POST /api/inventory/categories - Create parent category"
parent_data='{
  "code": "TEST-PARENT-001",
  "name": "Test Parent Category",
  "description": "This is a test parent category for API testing"
}'
parent_response=$(api_call "POST" "/api/inventory/categories" "$parent_data" "Creating parent category")
PARENT_CATEGORY_ID=$(echo "$parent_response" | jq -r '.id' 2>/dev/null)

if [ ! -z "$PARENT_CATEGORY_ID" ] && [ "$PARENT_CATEGORY_ID" != "null" ]; then
    print_success "Parent category created with ID: $PARENT_CATEGORY_ID"
else
    print_error "Failed to create parent category"
fi

# Test 4: Create child category
print_test "4. POST /api/inventory/categories - Create child category"
child_data="{
  \"code\": \"TEST-CHILD-001\",
  \"name\": \"Test Child Category\",
  \"description\": \"This is a test child category\",
  \"parentId\": \"$PARENT_CATEGORY_ID\"
}"
child_response=$(api_call "POST" "/api/inventory/categories" "$child_data" "Creating child category with parent")
CHILD_CATEGORY_ID=$(echo "$child_response" | jq -r '.id' 2>/dev/null)

if [ ! -z "$CHILD_CATEGORY_ID" ] && [ "$CHILD_CATEGORY_ID" != "null" ]; then
    print_success "Child category created with ID: $CHILD_CATEGORY_ID"
else
    print_error "Failed to create child category"
fi

# Test 5: GET specific category
print_test "5. GET /api/inventory/categories/[id] - Get specific category"
if [ ! -z "$PARENT_CATEGORY_ID" ] && [ "$PARENT_CATEGORY_ID" != "null" ]; then
    api_call "GET" "/api/inventory/categories/$PARENT_CATEGORY_ID" "" "Fetching parent category by ID"
else
    print_error "Skipping - No parent category ID available"
fi

# Test 6: Update category
print_test "6. PUT /api/inventory/categories/[id] - Update category"
if [ ! -z "$PARENT_CATEGORY_ID" ] && [ "$PARENT_CATEGORY_ID" != "null" ]; then
    update_data='{
      "name": "Updated Test Parent Category",
      "description": "This category has been updated via API test",
      "isActive": true
    }'
    api_call "PUT" "/api/inventory/categories/$PARENT_CATEGORY_ID" "$update_data" "Updating parent category"
else
    print_error "Skipping - No parent category ID available"
fi

# Test 7: GET category tree
print_test "7. GET /api/inventory/categories/tree - Get category tree structure"
api_call "GET" "/api/inventory/categories/tree" "" "Fetching category hierarchy tree"

# Test 8: Search categories
print_test "8. GET /api/inventory/categories with search"
api_call "GET" "/api/inventory/categories?search=Test" "" "Searching for categories containing 'Test'"

# Test 9: Get categories by parent
print_test "9. GET /api/inventory/categories filtered by parent"
if [ ! -z "$PARENT_CATEGORY_ID" ] && [ "$PARENT_CATEGORY_ID" != "null" ]; then
    api_call "GET" "/api/inventory/categories?parentId=$PARENT_CATEGORY_ID" "" "Fetching categories with specific parent"
else
    print_error "Skipping - No parent category ID available"
fi

# Test 10: Test error handling - duplicate code
print_test "10. POST /api/inventory/categories - Test duplicate code error"
duplicate_data='{
  "code": "TEST-PARENT-001",
  "name": "Duplicate Code Test",
  "description": "This should fail due to duplicate code"
}'
api_call "POST" "/api/inventory/categories" "$duplicate_data" "Testing duplicate code error handling"

# Test 11: Test error handling - missing required fields
print_test "11. POST /api/inventory/categories - Test missing required fields"
invalid_data='{
  "description": "Missing code and name"
}'
api_call "POST" "/api/inventory/categories" "$invalid_data" "Testing missing required fields error"

# Test 12: Delete child category
print_test "12. DELETE /api/inventory/categories/[id] - Delete child category"
if [ ! -z "$CHILD_CATEGORY_ID" ] && [ "$CHILD_CATEGORY_ID" != "null" ]; then
    api_call "DELETE" "/api/inventory/categories/$CHILD_CATEGORY_ID" "" "Deleting child category"
else
    print_error "Skipping - No child category ID available"
fi

# Test 13: Try to delete parent with children (should fail)
print_test "13. DELETE /api/inventory/categories/[id] - Try delete parent with children"
# First create another child
if [ ! -z "$PARENT_CATEGORY_ID" ] && [ "$PARENT_CATEGORY_ID" != "null" ]; then
    child2_data="{
      \"code\": \"TEST-CHILD-002\",
      \"name\": \"Another Child Category\",
      \"parentId\": \"$PARENT_CATEGORY_ID\"
    }"
    child2_response=$(api_call "POST" "/api/inventory/categories" "$child2_data" "Creating another child category")
    
    # Now try to delete parent
    api_call "DELETE" "/api/inventory/categories/$PARENT_CATEGORY_ID" "" "Attempting to delete parent with children (should fail)"
    
    # Clean up - delete the second child
    CHILD2_ID=$(echo "$child2_response" | jq -r '.id' 2>/dev/null)
    if [ ! -z "$CHILD2_ID" ] && [ "$CHILD2_ID" != "null" ]; then
        api_call "DELETE" "/api/inventory/categories/$CHILD2_ID" "" "Cleaning up second child category"
    fi
else
    print_error "Skipping - No parent category ID available"
fi

# Test 14: Delete parent category (after children removed)
print_test "14. DELETE /api/inventory/categories/[id] - Delete parent category"
if [ ! -z "$PARENT_CATEGORY_ID" ] && [ "$PARENT_CATEGORY_ID" != "null" ]; then
    api_call "DELETE" "/api/inventory/categories/$PARENT_CATEGORY_ID" "" "Deleting parent category"
else
    print_error "Skipping - No parent category ID available"
fi

# Test 15: Verify categories were deleted
print_test "15. GET /api/inventory/categories/[id] - Verify deletion"
if [ ! -z "$PARENT_CATEGORY_ID" ] && [ "$PARENT_CATEGORY_ID" != "null" ]; then
    api_call "GET" "/api/inventory/categories/$PARENT_CATEGORY_ID" "" "Verifying parent category was deleted (should return 404)"
else
    print_error "Skipping - No parent category ID available"
fi

# Test 16: Test pagination
print_test "16. GET /api/inventory/categories - Test pagination"
api_call "GET" "/api/inventory/categories?limit=5&offset=0" "" "Getting first 5 categories"
api_call "GET" "/api/inventory/categories?limit=5&offset=5" "" "Getting next 5 categories"

# Summary
echo -e "\n${BLUE}=================================================================================${NC}"
echo -e "${GREEN}Test execution completed at $(date)${NC}"
echo -e "${BLUE}=================================================================================${NC}"

# Make the script executable
# chmod +x test-categories-api-comprehensive.sh