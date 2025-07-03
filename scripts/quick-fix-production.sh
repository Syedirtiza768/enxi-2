#!/bin/bash

# Quick fix script for current production issues
# Run this on your production server after pulling latest changes

echo "=== Quick Production Fix Script ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Fix database symlink
echo -e "${YELLOW}Fixing database configuration...${NC}"

# Remove broken symlink
sudo rm -f prisma/prod.db

# Create database directory
sudo mkdir -p /var/lib/enxi/database

# Create database file if doesn't exist
if [ ! -f "/var/lib/enxi/database/enxi.db" ]; then
    sudo touch /var/lib/enxi/database/enxi.db
fi

# Create proper symlink
sudo ln -s /var/lib/enxi/database/enxi.db prisma/prod.db

# Set permissions
sudo chown -R ubuntu:ubuntu /var/lib/enxi/database
sudo chmod 664 /var/lib/enxi/database/enxi.db

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
sudo npx prisma generate

# Push database schema
echo -e "${YELLOW}Creating database schema...${NC}"
sudo npx prisma db push --force-reset

# Create admin user
echo -e "${YELLOW}Creating admin user...${NC}"

# Create a simple seed script inline
cat > /tmp/seed-admin.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@enxi.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      },
    });
    
    console.log('Admin user created:', admin.username);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
EOF

# Run the seed script
sudo node /tmp/seed-admin.js

# Clean up
rm /tmp/seed-admin.js

# Build the application
echo -e "${YELLOW}Building application...${NC}"
sudo npm run build

# Restart PM2
echo -e "${YELLOW}Restarting PM2...${NC}"
sudo pm2 restart 0 || sudo pm2 start ecosystem.config.js

# Show status
echo ""
echo -e "${GREEN}=== Fix Applied ===${NC}"
echo ""
echo "Check the application:"
echo "1. Run: sudo pm2 logs 0"
echo "2. Visit: https://erp.alsahab.me/login"
echo "3. Login with: admin / admin123"
echo ""
echo -e "${RED}IMPORTANT: Change the admin password immediately!${NC}"