#!/bin/bash

# Setup production environment

echo "🔧 Setting up production environment..."
echo "====================================="

cd /var/www/html/enxi-2 || exit 1

# 1. Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    
    cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/enxi_erp"

# Authentication
JWT_SECRET="your-secret-key-change-this-in-production"

# Environment
NODE_ENV="production"

# Application
NEXT_PUBLIC_APP_URL="https://erp.alsahab.me"
PORT=3050

# Optional: Add these if needed
# EMAIL_HOST=""
# EMAIL_PORT=""
# EMAIL_USER=""
# EMAIL_PASSWORD=""
EOF

    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Update the following in .env:"
    echo "1. DATABASE_URL - Set your actual database connection string"
    echo "2. JWT_SECRET - Generate a secure secret with: openssl rand -base64 32"
    echo ""
else
    echo "✅ .env file already exists"
fi

# 2. Generate Prisma client
echo ""
echo "🔄 Generating Prisma client..."
npx prisma generate

# 3. Test database connection
echo ""
echo "🗄️  Testing database connection..."
npx prisma db push || {
    echo "❌ Database connection failed!"
    echo "Please update DATABASE_URL in .env with your actual database credentials"
    exit 1
}

# 4. Restart PM2
echo ""
echo "🔄 Restarting application..."
pm2 restart 3

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file: sudo nano .env"
echo "2. Update DATABASE_URL with your PostgreSQL credentials"
echo "3. Generate a secure JWT_SECRET"
echo "4. Run: sudo bash scripts/fix-login-simple.sh"