#!/bin/bash

# Create necessary directories with proper permissions
mkdir -p .next logs

# Stop any existing PM2 processes
pm2 stop all
pm2 delete all

# Start PM2 with development server
pm2 start ecosystem.config.js

# Monitor logs
echo "PM2 started. Monitoring logs..."
pm2 logs enxi-erp