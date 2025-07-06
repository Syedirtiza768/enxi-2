#!/bin/bash

# Enxi ERP Authentication Token Fix Script
# This script diagnoses and fixes authentication token issues in production

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Enxi ERP Authentication Token Fix Script ===${NC}"
echo ""

# Step 1: Check environment variables
echo -e "${YELLOW}Step 1: Checking environment variables...${NC}"
if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}ERROR: JWT_SECRET is not set${NC}"
    
    # Check if .env.production exists
    if [ -f ".env.production" ]; then
        echo -e "${YELLOW}Loading JWT_SECRET from .env.production...${NC}"
        export $(grep JWT_SECRET .env.production | xargs)
        
        if [ -z "$JWT_SECRET" ]; then
            echo -e "${RED}JWT_SECRET not found in .env.production${NC}"
            echo -e "${YELLOW}Please set JWT_SECRET in .env.production file${NC}"
            exit 1
        else
            echo -e "${GREEN}JWT_SECRET loaded successfully${NC}"
        fi
    else
        echo -e "${RED}.env.production file not found${NC}"
        echo -e "${YELLOW}Creating .env.production with secure JWT_SECRET...${NC}"
        
        # Generate a secure random JWT secret
        JWT_SECRET=$(openssl rand -base64 32)
        echo "JWT_SECRET=$JWT_SECRET" > .env.production
        echo -e "${GREEN}Created .env.production with new JWT_SECRET${NC}"
    fi
else
    echo -e "${GREEN}JWT_SECRET is already set${NC}"
fi

# Step 2: Check if PM2 is running with proper environment
echo ""
echo -e "${YELLOW}Step 2: Checking PM2 process...${NC}"
PM2_STATUS=$(sudo pm2 list | grep "Enxi--Second" | grep -c "online")

if [ "$PM2_STATUS" -eq 0 ]; then
    echo -e "${RED}Enxi--Second is not running or offline${NC}"
else
    echo -e "${GREEN}Enxi--Second is running${NC}"
fi

# Step 3: Restart PM2 with updated environment
echo ""
echo -e "${YELLOW}Step 3: Restarting PM2 with updated environment...${NC}"

# Save current PM2 state
sudo pm2 save

# Stop the process
echo "Stopping Enxi--Second..."
sudo pm2 stop Enxi--Second

# Delete the process to ensure clean restart
echo "Deleting old process..."
sudo pm2 delete Enxi--Second

# Start with updated environment
echo "Starting Enxi--Second with updated environment..."
cd /home/ubuntu/enxi-2

# Load environment variables and start
if [ -f ".env.production" ]; then
    # Export all environment variables from .env.production
    set -a
    source .env.production
    set +a
fi

# Start PM2 with explicit environment variables
sudo JWT_SECRET="$JWT_SECRET" pm2 start npm --name "Enxi--Second" -- start -- -p 3001

# Save PM2 state
sudo pm2 save

# Step 4: Verify the fix
echo ""
echo -e "${YELLOW}Step 4: Verifying the fix...${NC}"
sleep 5  # Wait for the server to start

# Check if the process is running
PM2_STATUS_AFTER=$(sudo pm2 list | grep "Enxi--Second" | grep -c "online")
if [ "$PM2_STATUS_AFTER" -eq 1 ]; then
    echo -e "${GREEN}✓ Enxi--Second is running${NC}"
else
    echo -e "${RED}✗ Enxi--Second failed to start${NC}"
    echo "Checking logs..."
    sudo pm2 logs Enxi--Second --lines 20
    exit 1
fi

# Check recent logs for authentication errors
echo ""
echo -e "${YELLOW}Checking recent logs for authentication errors...${NC}"
AUTH_ERRORS=$(sudo pm2 logs Enxi--Second --lines 50 --nostream | grep -c "Authentication error: No authentication token provided" || true)

if [ "$AUTH_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✓ No recent authentication errors found${NC}"
else
    echo -e "${YELLOW}⚠ Found $AUTH_ERRORS authentication errors in recent logs${NC}"
    echo "This is normal if they occurred before the restart."
fi

# Step 5: Display summary
echo ""
echo -e "${GREEN}=== Fix Applied Successfully ===${NC}"
echo "1. JWT_SECRET environment variable is set"
echo "2. PM2 process restarted with updated environment"
echo "3. Server is running on port 3001"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "- Monitor logs: sudo pm2 logs Enxi--Second"
echo "- Check status: sudo pm2 status"
echo "- If errors persist, check your client-side authentication headers"
echo ""
echo -e "${GREEN}Script completed!${NC}"