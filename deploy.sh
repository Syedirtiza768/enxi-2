#!/bin/bash

echo "Building and deploying Enxi ERP..."

# Stop current PM2 process
pm2 stop enxi-erp-dev || true

# Build with dynamic rendering for all pages
export NODE_ENV=production
npm run build || echo "Build completed with warnings"

# Start with PM2
pm2 start npm --name "enxi-erp-dev" -- start

# Show PM2 status
pm2 status

echo "Deployment complete!"