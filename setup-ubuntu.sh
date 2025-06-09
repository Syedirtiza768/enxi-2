#!/bin/bash

# Enxi ERP Ubuntu Setup Script
# This script sets up the application on Ubuntu server

echo "=== Enxi ERP Ubuntu Setup ==="

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo: sudo bash setup-ubuntu.sh"
    exit 1
fi

# Set variables
PROJECT_DIR="/var/www/html/enxi-2"

# Navigate to project directory
cd "$PROJECT_DIR" || exit 1

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -base64 32)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    # Update .env with generated secrets
    sed -i "s/your-jwt-secret-here/$JWT_SECRET/g" .env
    sed -i "s/your-nextauth-secret-here/$NEXTAUTH_SECRET/g" .env
    
    # Update NEXTAUTH_URL for production
    read -p "Enter your domain (e.g., example.com) or press Enter for localhost: " DOMAIN
    if [ -n "$DOMAIN" ]; then
        sed -i "s|http://localhost:3000|https://$DOMAIN|g" .env
    fi
    
    echo "✓ .env file created with secure secrets"
else
    echo "✓ .env file already exists"
fi

# Set proper permissions
chmod 600 .env
chown www-data:www-data .env

# Create prisma directory if needed
mkdir -p prisma
chown -R www-data:www-data prisma

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Push database schema
echo "Setting up database..."
npx prisma db push

# Seed database (optional)
read -p "Do you want to seed the database with demo data? (y/N): " SEED
if [[ $SEED =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    npx prisma db seed
fi

# Build the application
echo "Building application..."
npm run build

# Set ownership
chown -R www-data:www-data "$PROJECT_DIR"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Configure your web server (Nginx/Apache) to serve the application"
echo "2. Set up PM2 or systemd service to run the application"
echo "3. Configure firewall rules if needed"
echo ""
echo "To start the application:"
echo "  npm start          # Production mode"
echo "  npm run dev        # Development mode"
echo ""
echo "Your .env file has been created at: $PROJECT_DIR/.env"
echo "Please review and update it if needed."