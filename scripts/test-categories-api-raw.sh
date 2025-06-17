#!/bin/bash

# Test categories API without jq dependency

BASE_URL="http://localhost:3000"

echo "Testing Categories API (Raw Output)"
echo "==================================="

# Test 1: GET all categories
echo -e "\n1. GET /api/inventory/categories:"
echo "Response:"
curl -s "$BASE_URL/api/inventory/categories"
echo ""

# Test 2: Try to create a category
echo -e "\n2. POST /api/inventory/categories - Create test category:"
echo "Request body: {\"code\": \"TEST-001\", \"name\": \"Test Category\"}"
echo "Response:"
curl -s -X POST "$BASE_URL/api/inventory/categories" \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST-001", "name": "Test Category"}'
echo ""

# Test 3: GET categories tree
echo -e "\n3. GET /api/inventory/categories/tree:"
echo "Response:"
curl -s "$BASE_URL/api/inventory/categories/tree"
echo ""

# Test 4: Check server health
echo -e "\n4. Server Health Check:"
echo "Response:"
curl -s "$BASE_URL/api/health"
echo ""

# Test 5: Try with explicit development headers
echo -e "\n5. GET categories with development header:"
echo "Response:"
curl -s "$BASE_URL/api/inventory/categories" \
  -H "X-Development-Mode: true"
echo ""

echo -e "\nDone!"