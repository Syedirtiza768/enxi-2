#!/bin/bash

# Test script for inventory categories API

echo "Testing inventory categories API..."

# Test GET request
echo -e "\n1. Testing GET /api/inventory/categories:"
curl -s http://localhost:3000/api/inventory/categories | jq '.'

# Test with authentication header (if needed)
echo -e "\n2. Testing GET /api/inventory/categories with auth header:"
curl -s -H "Authorization: Bearer test-token" http://localhost:3000/api/inventory/categories | jq '.'

echo -e "\nDone!"