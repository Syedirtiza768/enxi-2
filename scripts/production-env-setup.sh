#!/bin/bash

echo "=== Production Environment Setup ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if .env exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file already exists${NC}"
    echo "Do you want to backup the existing .env file? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        echo -e "${GREEN}Backup created${NC}"
    fi
fi

# Generate random secrets
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-40
}

JWT_SECRET=$(generate_secret)
NEXTAUTH_SECRET=$(generate_secret)

# Create .env file
cat > .env << EOF
# Production Environment Variables
# Generated on $(date)

# Database
DATABASE_URL="file:./prisma/prod.db"

# Authentication (IMPORTANT: These are randomly generated - save them!)
JWT_SECRET="${JWT_SECRET}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="https://erp.alsahab.me"

# Application
NODE_ENV="production"
PORT=3000

# Optional: Add your email configuration if needed
# SMTP_HOST=""
# SMTP_PORT=587
# SMTP_USER=""
# SMTP_PASS=""
EOF

echo -e "${GREEN}✓ .env file created successfully${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Save these generated secrets somewhere safe:${NC}"
echo "JWT_SECRET=${JWT_SECRET}"
echo "NEXTAUTH_SECRET=${NEXTAUTH_SECRET}"
echo ""

# Set proper permissions
chmod 600 .env
echo -e "${GREEN}✓ File permissions set to 600 (read/write for owner only)${NC}"

# Check if database exists
if [ ! -f "prisma/prod.db" ]; then
    echo ""
    echo -e "${YELLOW}Warning: Production database not found at prisma/prod.db${NC}"
    echo "Do you want to create it now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Creating production database..."
        npx prisma db push
        echo -e "${GREEN}✓ Database created${NC}"
        
        echo "Do you want to seed the database? (y/n)"
        read -r seed_response
        if [[ "$seed_response" =~ ^[Yy]$ ]]; then
            npm run seed
            echo -e "${GREEN}✓ Database seeded${NC}"
        fi
    fi
fi

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Review the .env file and update any values if needed"
echo "2. Run: npm run build"
echo "3. Start the application with PM2"
echo ""
echo -e "${YELLOW}Security reminder:${NC}"
echo "- Never commit .env to git"
echo "- Keep backups of your secrets"
echo "- Use strong, unique secrets in production"