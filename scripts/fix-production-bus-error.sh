#!/bin/bash
# Fix bus error on production server

echo "🔧 Fixing Bus Error on Production Server"
echo "========================================"

# 1. Stop PM2 processes
echo "1. Stopping PM2 processes..."
pm2 stop all
pm2 kill

# 2. Clear all caches and build artifacts
echo "2. Clearing caches and build artifacts..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .cache
rm -rf dist
rm -rf build

# 3. Clear npm cache
echo "3. Clearing npm cache..."
npm cache clean --force

# 4. Remove and reinstall node_modules
echo "4. Reinstalling dependencies..."
rm -rf node_modules
rm -f package-lock.json
npm install

# 5. Generate Prisma client
echo "5. Generating Prisma client..."
npm run db:generate

# 6. Build the application
echo "6. Building application..."
NODE_OPTIONS="--max-old-space-size=2048" npm run build

# 7. Check system resources
echo "7. System resources check:"
echo "Memory usage:"
free -h
echo ""
echo "Disk space:"
df -h
echo ""

# 8. Start with PM2 in cluster mode with limited instances
echo "8. Starting application..."
pm2 start ecosystem.config.js --only Enxi-AlSahab

echo ""
echo "✅ Fix applied. Monitoring logs..."
pm2 logs Enxi-AlSahab --lines 50