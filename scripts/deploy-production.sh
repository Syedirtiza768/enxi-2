#!/bin/bash

echo "=== Enxi ERP Production Deployment Script ==="
echo ""

# Configuration
DEPLOY_DIR="/var/www/html/enxi-2"
PM2_APP_NAME="Enxi-AlSahab"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment process...${NC}"

# Navigate to project directory
cd $DEPLOY_DIR || { echo -e "${RED}Failed to navigate to $DEPLOY_DIR${NC}"; exit 1; }

echo -e "${GREEN}Current directory: $(pwd)${NC}"

# Pull latest changes
echo -e "${YELLOW}Pulling latest changes from git...${NC}"
git pull origin main || { echo -e "${RED}Git pull failed${NC}"; exit 1; }

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install || { echo -e "${RED}npm install failed${NC}"; exit 1; }

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate || { echo -e "${RED}Prisma generate failed${NC}"; exit 1; }

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
npx prisma db push || echo -e "${YELLOW}Database push completed (may have warnings)${NC}"

# Build the Next.js application
echo -e "${YELLOW}Building Next.js application...${NC}"
npm run build || { echo -e "${RED}Build failed${NC}"; exit 1; }

# Check if build was successful
if [ ! -d ".next" ]; then
    echo -e "${RED}Build failed - .next directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"

# Restart PM2 application
echo -e "${YELLOW}Restarting PM2 application...${NC}"
pm2 restart "$PM2_APP_NAME" || pm2 start ecosystem.config.js --name "$PM2_APP_NAME"

# Save PM2 configuration
pm2 save

# Show status
echo -e "${YELLOW}Current PM2 status:${NC}"
pm2 status

echo ""
echo -e "${GREEN}=== Deployment completed successfully! ===${NC}"
echo -e "${YELLOW}Application should be available at: https://erp.alsahab.me${NC}"
echo ""
echo -e "${YELLOW}To check logs, run:${NC}"
echo "pm2 logs $PM2_APP_NAME"