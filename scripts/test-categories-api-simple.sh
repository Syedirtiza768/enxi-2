#!/bin/bash

# Test authentication and basic categories API

BASE_URL="http://localhost:3000"

echo "Testing Categories API (Simple)"
echo "=============================="

# First, let's check if we can access the API without auth
echo -e "\n1. Testing without authentication:"
curl -s -X GET "$BASE_URL/api/inventory/categories" | jq '.'

# Try to get an auth token (assuming login endpoint exists)
echo -e "\n2. Attempting to login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@enxi.com",
    "password": "admin123"
  }')

echo "Login response:"
echo "$LOGIN_RESPONSE" | jq '.'

# Extract token if login successful
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .access_token // empty')

if [ ! -z "$TOKEN" ]; then
  echo -e "\n3. Testing with authentication token:"
  curl -s -X GET "$BASE_URL/api/inventory/categories" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
else
  echo -e "\n3. No token received, trying alternative authentication..."
  
  # Try session-based auth
  echo -e "\nAttempting session-based authentication..."
  COOKIE_JAR=$(mktemp)
  
  # Login and save cookies
  curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@enxi.com",
      "password": "admin123"
    }' | jq '.'
  
  # Try API with cookies
  echo -e "\nTesting with session cookies:"
  curl -s -b "$COOKIE_JAR" -X GET "$BASE_URL/api/inventory/categories" | jq '.'
  
  rm -f "$COOKIE_JAR"
fi

# Test direct in development mode
echo -e "\n4. Testing in development mode (NODE_ENV should allow access):"
NODE_ENV=$(curl -s "$BASE_URL/api/health" | jq -r '.env // "unknown"')
echo "Current NODE_ENV: $NODE_ENV"

# Try creating a simple category
echo -e "\n5. Testing category creation:"
curl -s -X POST "$BASE_URL/api/inventory/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST-001",
    "name": "Test Category"
  }' | jq '.'

echo -e "\nDone!"