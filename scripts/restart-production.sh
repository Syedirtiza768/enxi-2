#!/bin/bash
# Simple production restart script

echo "🔄 Restarting Enxi Production Server"
echo "===================================="

# Stop the application
echo "Stopping application..."
sudo pm2 stop Enxi-AlSahab

# Clear Next.js cache only
echo "Clearing Next.js cache..."
sudo rm -rf .next

# Build with memory limit
echo "Building application..."
sudo NODE_OPTIONS="--max-old-space-size=1536" npm run build

# Start the application
echo "Starting application..."
sudo pm2 start ecosystem.config.js --only Enxi-AlSahab

# Show status
echo ""
echo "Application status:"
sudo pm2 status

# Show recent logs
echo ""
echo "Recent logs:"
sudo pm2 logs Enxi-AlSahab --lines 20