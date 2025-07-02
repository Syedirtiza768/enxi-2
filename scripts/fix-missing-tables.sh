#!/bin/bash
# Quick fix for missing database tables

echo "🚨 Emergency Fix: Missing Database Tables"
echo "========================================"

# Stop the application
echo "Stopping application..."
sudo pm2 stop Enxi-AlSahab

# Apply schema
echo "Applying database schema..."
sudo npm run db:push

# Generate client
echo "Generating Prisma client..."
sudo npm run db:generate

# Run core seeds in correct order
echo ""
echo "Setting up essential data..."
echo "1. Creating Chart of Accounts..."
sudo npm run seed:production-coa || echo "COA seeding failed, continuing..."

echo ""
echo "2. Creating core system data..."
sudo npm run seed:production-core || echo "Core seeding failed, continuing..."

# Restart application
echo ""
echo "Restarting application..."
sudo pm2 start ecosystem.config.js --only Enxi-AlSahab

# Check status
echo ""
echo "Application status:"
sudo pm2 status

echo ""
echo "✅ Fix applied. Check if login works now."
echo "If login still fails, check logs: sudo pm2 logs Enxi-AlSahab"