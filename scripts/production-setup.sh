#!/bin/bash

echo "=== Production Setup Script ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Not in project directory${NC}"
    exit 1
fi

echo -e "${GREEN}✓ In project directory: $(pwd)${NC}"

# 2. Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env file..."
    ./scripts/production-env-setup.sh
fi

# 3. Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --production=false

# 4. Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

# 5. Check if database exists
if [ ! -f "prisma/prod.db" ]; then
    echo -e "${YELLOW}Production database not found. Creating...${NC}"
    
    # Create fresh database
    npx prisma db push
    
    echo -e "${GREEN}✓ Database created${NC}"
    
    # Seed with admin user only
    echo -e "${YELLOW}Creating admin user...${NC}"
    npx tsx scripts/seed-admin.ts || npm run seed:admin
    
    echo -e "${GREEN}✓ Admin user created${NC}"
    echo -e "${YELLOW}Default credentials: admin / admin123${NC}"
    echo -e "${RED}IMPORTANT: Change the admin password immediately!${NC}"
else
    echo -e "${GREEN}✓ Database exists${NC}"
fi

# 6. Build the application
echo -e "${YELLOW}Building application...${NC}"
npm run build

# 7. Check if build succeeded
if [ ! -d ".next" ]; then
    echo -e "${RED}Build failed - .next directory not created${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

# 8. Set up PM2
echo -e "${YELLOW}Setting up PM2...${NC}"
pm2 delete Enxi-AlSahab 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Visit https://erp.alsahab.me/login"
echo "2. Login with admin / admin123"
echo "3. Change the admin password"
echo "4. Create additional users as needed"
echo ""
echo -e "${YELLOW}To check logs:${NC} pm2 logs Enxi-AlSahab"
echo -e "${YELLOW}To check status:${NC} pm2 status"