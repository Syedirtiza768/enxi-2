#!/bin/bash

echo "=== Production Database Reset Script ==="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}WARNING: This will DELETE ALL DATA in the production database!${NC}"
echo -e "${RED}This action cannot be undone!${NC}"
echo ""
echo "Type 'DELETE ALL DATA' to confirm:"
read -r confirmation

if [ "$confirmation" != "DELETE ALL DATA" ]; then
    echo "Reset cancelled."
    exit 0
fi

# Backup current database
if [ -f "prisma/prod.db" ]; then
    backup_name="prisma/prod.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp prisma/prod.db "$backup_name"
    echo -e "${GREEN}✓ Backup created: $backup_name${NC}"
fi

# Stop PM2
echo -e "${YELLOW}Stopping application...${NC}"
pm2 stop Enxi-AlSahab || true

# Remove old database
echo -e "${YELLOW}Removing old database...${NC}"
rm -f prisma/prod.db
rm -f prisma/prod.db-journal
rm -f prisma/prod.db-shm
rm -f prisma/prod.db-wal

# Create new database
echo -e "${YELLOW}Creating new database...${NC}"
npx prisma db push --force-reset

# Create admin user
echo -e "${YELLOW}Creating admin user...${NC}"
npx tsx scripts/seed-admin.ts

# Start PM2
echo -e "${YELLOW}Starting application...${NC}"
pm2 start Enxi-AlSahab || pm2 start ecosystem.config.js

echo ""
echo -e "${GREEN}=== Database Reset Complete ===${NC}"
echo "Admin credentials: admin / admin123"
echo -e "${RED}Change the password immediately!${NC}"