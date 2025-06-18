#!/bin/bash

echo "Testing production login endpoint..."
echo "URL: https://erp.alsahab.me/api/auth/login"
echo ""

# Test with admin credentials
echo "Testing with admin credentials..."
curl -X POST https://erp.alsahab.me/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  -v

echo ""
echo ""

# Test with invalid credentials
echo "Testing with invalid credentials..."
curl -X POST https://erp.alsahab.me/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "invalid", "password": "invalid"}' \
  -v