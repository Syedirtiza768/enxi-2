#!/bin/bash

echo "=== Production Build Fix Script ==="
echo "Run this on your production server"
echo ""

# Navigate to the project directory
cd /var/www/html/enxi-2

echo "1. Checking current directory..."
pwd
ls -la

echo ""
echo "2. Checking if .next directory exists..."
if [ -d ".next" ]; then
    echo ".next directory exists"
    ls -la .next/
else
    echo ".next directory NOT FOUND - Need to build!"
fi

echo ""
echo "3. Installing dependencies..."
npm install

echo ""
echo "4. Building the application..."
npm run build

echo ""
echo "5. Checking build output..."
if [ -d ".next" ]; then
    echo "Build successful! .next directory created"
    ls -la .next/
else
    echo "Build FAILED - .next directory not created"
    exit 1
fi

echo ""
echo "6. Restarting PM2..."
pm2 restart "Enxi-AlSahab"

echo ""
echo "7. Checking PM2 status..."
pm2 status

echo ""
echo "8. Checking logs..."
pm2 logs "Enxi-AlSahab" --lines 10

echo ""
echo "=== Fix completed ==="