#!/bin/bash
# Fix bus error on production server

echo "🔧 Fixing Bus Error on Production Server"
echo "========================================"

# 1. Stop PM2 processes
echo "1. Stopping PM2 processes..."
sudo pm2 stop all
sudo pm2 kill

# 2. Clear all caches and build artifacts
echo "2. Clearing caches and build artifacts..."
sudo rm -rf .next
sudo rm -rf node_modules/.cache
sudo rm -rf .cache
sudo rm -rf dist
sudo rm -rf build

# 3. Clear npm cache
echo "3. Clearing npm cache..."
sudo npm cache clean --force

# 4. Remove and reinstall node_modules
echo "4. Reinstalling dependencies..."
sudo rm -rf node_modules
sudo rm -f package-lock.json
sudo npm install

# 5. Generate Prisma client
echo "5. Generating Prisma client..."
sudo npm run db:generate

# 6. Build the application
echo "6. Building application..."
sudo NODE_OPTIONS="--max-old-space-size=2048" npm run build

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
sudo pm2 start ecosystem.config.js --only Enxi-AlSahab

echo ""
echo "✅ Fix applied. Monitoring logs..."
sudo pm2 logs Enxi-AlSahab --lines 50