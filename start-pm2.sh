#!/bin/bash

echo "🚀 Starting Enxi ERP with PM2..."

# Kill any existing Node.js processes on port 3000
echo "Checking for processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Stop and delete all PM2 processes
echo "Cleaning up PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Check if build exists
if [ ! -d ".next" ]; then
    echo "❌ Build not found. Running build first..."
    npm run build
fi

# Start the application with PM2
echo "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Show status
echo ""
echo "✅ Application started successfully!"
echo ""
pm2 status

# Show logs
echo ""
echo "📋 Showing logs (press Ctrl+C to exit):"
pm2 logs --lines 20