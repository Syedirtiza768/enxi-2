#!/bin/bash

echo "🚀 Running startup checks for Enxi ERP..."

# Change to the app directory
cd /home/ubuntu/enxi-erp || exit 1

# Check if database file exists
if [ ! -f "prisma/dev.db" ]; then
    echo "⚠️  Database file not found. Creating..."
    npx prisma db push
    npx tsx scripts/seed.ts
fi

# Check database permissions
if [ ! -w "prisma/dev.db" ]; then
    echo "❌ Database file is not writable. Fixing permissions..."
    chmod 644 prisma/dev.db
fi

# Run database health check
echo "🔍 Checking database health..."
npx tsx scripts/check-database-health.ts

if [ $? -ne 0 ]; then
    echo "❌ Database health check failed. Attempting to fix..."
    
    # Try to run migrations
    npx prisma migrate deploy
    
    # Try to generate Prisma client
    npx prisma generate
    
    # Run health check again
    npx tsx scripts/check-database-health.ts
    
    if [ $? -ne 0 ]; then
        echo "❌ Database is still unhealthy. Please check the logs."
        exit 1
    fi
fi

echo "✅ All startup checks passed!"