#!/bin/bash

# Production Chart of Accounts Deployment Script
# Supports multiple deployment environments

echo "🚀 Production Chart of Accounts Setup"
echo "===================================="

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Allow environment variable overrides
COMPANY_NAME="${COMPANY_NAME:-Production Company}"
COMPANY_CODE="${COMPANY_CODE:-PROD}"
DEFAULT_CURRENCY="${DEFAULT_CURRENCY:-USD}"
DEFAULT_TAX_RATE="${DEFAULT_TAX_RATE:-10}"
FORCE_RESEED="${FORCE_RESEED:-false}"

echo ""
echo "Configuration:"
echo "  Company Name: $COMPANY_NAME"
echo "  Company Code: $COMPANY_CODE"
echo "  Default Currency: $DEFAULT_CURRENCY"
echo "  Default Tax Rate: $DEFAULT_TAX_RATE%"
echo "  Force Reseed: $FORCE_RESEED"
echo ""

# Check if database is accessible
echo "Checking database connection..."
npx prisma db push --skip-generate > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Database connection failed!"
    echo "Please ensure DATABASE_URL is correctly set."
    exit 1
fi
echo "✅ Database connection successful"

# Generate Prisma client if needed
echo "Ensuring Prisma client is up to date..."
npx prisma generate > /dev/null 2>&1
echo "✅ Prisma client ready"

# Run the seed script
echo ""
echo "Running Chart of Accounts seed..."
NODE_ENV=production \
COMPANY_NAME="$COMPANY_NAME" \
COMPANY_CODE="$COMPANY_CODE" \
DEFAULT_CURRENCY="$DEFAULT_CURRENCY" \
DEFAULT_TAX_RATE="$DEFAULT_TAX_RATE" \
FORCE_RESEED="$FORCE_RESEED" \
npx tsx prisma/seed-production-coa-final.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Chart of Accounts deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Review the created accounts in your admin panel"
    echo "2. Configure any industry-specific accounts"
    echo "3. Set up GL mappings for your business processes"
    echo "4. Train users on the accounting structure"
else
    echo ""
    echo "❌ Chart of Accounts deployment failed!"
    echo "Please check the error messages above."
    exit 1
fi