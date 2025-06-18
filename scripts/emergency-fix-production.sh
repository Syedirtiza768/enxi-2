#!/bin/bash

echo "=== Emergency Production Fix ==="
echo "This script will attempt to fix the missing .next directory"
echo ""

# Stop PM2 first
echo "1. Stopping PM2 process..."
pm2 stop Enxi-AlSahab || pm2 stop enxi-erp || echo "Could not stop PM2 process"

# Navigate to correct directory
echo "2. Navigating to project directory..."
cd /var/www/html/enxi-2 || { echo "ERROR: Cannot find /var/www/html/enxi-2"; exit 1; }

echo "Current directory: $(pwd)"

# Clean any existing partial builds
echo "3. Cleaning old build artifacts..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "4. Installing dependencies..."
npm install --production=false || { echo "ERROR: npm install failed"; exit 1; }

# Generate Prisma client
echo "5. Generating Prisma client..."
npx prisma generate || echo "Warning: Prisma generate had issues"

# Build Next.js
echo "6. Building Next.js application..."
NODE_ENV=production npm run build || { echo "ERROR: Build failed"; exit 1; }

# Verify build
echo "7. Verifying build..."
if [ -d ".next" ]; then
    echo "SUCCESS: .next directory created"
    ls -la .next/
else
    echo "ERROR: Build verification failed - .next not found"
    exit 1
fi

# Start PM2 with the correct configuration
echo "8. Starting PM2..."
pm2 delete Enxi-AlSahab 2>/dev/null || true
pm2 start npm --name "Enxi-AlSahab" -- start || pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup

# Check status
echo "9. Checking status..."
pm2 status
pm2 logs Enxi-AlSahab --lines 10

echo ""
echo "=== Fix complete ==="
echo "Check https://erp.alsahab.me"