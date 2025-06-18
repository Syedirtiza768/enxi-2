#!/bin/bash

echo "=== Production Diagnostic Script ==="
echo "Run this on your production server to diagnose the issue"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1. Checking current directory and user...${NC}"
pwd
whoami
echo ""

echo -e "${YELLOW}2. Checking project directory...${NC}"
cd /var/www/html/enxi-2 2>/dev/null || echo -e "${RED}Cannot access /var/www/html/enxi-2${NC}"
pwd
echo ""

echo -e "${YELLOW}3. Checking directory permissions...${NC}"
ls -la /var/www/html/ | grep enxi-2
echo ""

echo -e "${YELLOW}4. Checking if .next directory exists...${NC}"
if [ -d ".next" ]; then
    echo -e "${GREEN}.next directory exists${NC}"
    echo "Contents:"
    ls -la .next/
    echo ""
    echo "Checking for prerender-manifest.json:"
    find .next -name "prerender-manifest.json" 2>/dev/null || echo "Not found"
else
    echo -e "${RED}.next directory NOT FOUND${NC}"
fi
echo ""

echo -e "${YELLOW}5. Checking Node.js and npm versions...${NC}"
node --version || echo -e "${RED}Node.js not found${NC}"
npm --version || echo -e "${RED}npm not found${NC}"
echo ""

echo -e "${YELLOW}6. Checking if package.json exists...${NC}"
if [ -f "package.json" ]; then
    echo -e "${GREEN}package.json found${NC}"
    echo "Build script:"
    grep '"build"' package.json
else
    echo -e "${RED}package.json NOT FOUND${NC}"
fi
echo ""

echo -e "${YELLOW}7. Checking PM2 process...${NC}"
pm2 list | grep -E "Enxi|enxi" || echo "No Enxi process found"
echo ""

echo -e "${YELLOW}8. Checking disk space...${NC}"
df -h | grep -E "/$|/var"
echo ""

echo -e "${YELLOW}9. Checking recent PM2 logs...${NC}"
pm2 logs --nostream --lines 5
echo ""

echo -e "${YELLOW}10. Attempting to build if .next missing...${NC}"
if [ ! -d ".next" ]; then
    echo "Attempting build..."
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies first..."
        npm install || echo -e "${RED}npm install failed${NC}"
    fi
    
    # Try to build
    npm run build || echo -e "${RED}Build failed${NC}"
    
    # Check result
    if [ -d ".next" ]; then
        echo -e "${GREEN}Build successful!${NC}"
    else
        echo -e "${RED}Build failed - .next still missing${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}=== Diagnostic Summary ===${NC}"
[ -d ".next" ] && echo -e "${GREEN}✓ .next directory exists${NC}" || echo -e "${RED}✗ .next directory missing${NC}"
[ -f "package.json" ] && echo -e "${GREEN}✓ package.json exists${NC}" || echo -e "${RED}✗ package.json missing${NC}"
[ -d "node_modules" ] && echo -e "${GREEN}✓ node_modules exists${NC}" || echo -e "${RED}✗ node_modules missing${NC}"
command -v node >/dev/null && echo -e "${GREEN}✓ Node.js installed${NC}" || echo -e "${RED}✗ Node.js missing${NC}"