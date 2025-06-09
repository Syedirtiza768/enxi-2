#!/bin/bash

# Quick fix for DATABASE_URL error on Ubuntu

echo "=== Quick Database Setup for Enxi ERP ==="

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    
    # Create .env with basic DATABASE_URL
    cat > .env << EOL
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
EOL

    echo "✓ Created .env file with DATABASE_URL"
else
    echo "✓ .env file already exists"
    
    # Check if DATABASE_URL is set
    if ! grep -q "DATABASE_URL" .env; then
        echo "Adding DATABASE_URL to existing .env..."
        echo 'DATABASE_URL="file:./prisma/dev.db"' >> .env
        echo "✓ Added DATABASE_URL"
    fi
fi

# Create prisma directory if needed
mkdir -p prisma

# Now run prisma commands
echo ""
echo "Running Prisma setup..."
npx prisma db push

echo ""
echo "✓ Setup complete!"
echo ""
echo "You can now run:"
echo "  npm run dev     # For development"
echo "  npm run build   # To build for production"
echo "  npm start       # To run in production"