#!/bin/bash

echo "🧪 Running Basic Test Suite"
echo "=========================="

# Set test environment
export NODE_ENV=test
export DATABASE_URL=file:./test.db

# Run specific tests that we've fixed
echo -e "\n1️⃣ Testing Auth Service..."
npm test -- tests/unit/services/auth.service.test.ts --silent

echo -e "\n2️⃣ Testing Financial Statements Date Validation..."
npm test -- tests/unit/accounting/financial-statements.test.ts --testNamePattern="should validate that fromDate is before toDate" --silent

echo -e "\n3️⃣ Testing Quotation Service (basic)..."
npm test -- tests/unit/quotation.service.test.ts --testNamePattern="should create a new quotation with items" --silent

echo -e "\n✅ Basic tests completed!"