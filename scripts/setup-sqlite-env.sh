#!/bin/bash

# Setup SQLite production environment

echo "🔧 Setting up SQLite production environment..."
echo "==========================================="

cd /var/www/html/enxi-2 || exit 1

# 1. Create .env file for SQLite
if [ ! -f .env ]; then
    echo "📝 Creating .env file for SQLite..."
    
    cat > .env << 'EOF'
# Database - SQLite
DATABASE_URL="file:./prisma/prod.db"

# Authentication
JWT_SECRET="$(openssl rand -base64 32)"

# Environment
NODE_ENV="production"

# Application
NEXT_PUBLIC_APP_URL="https://erp.alsahab.me"
PORT=3050
EOF

    # Generate actual JWT secret
    JWT=$(openssl rand -base64 32)
    sed -i "s|\$(openssl rand -base64 32)|$JWT|g" .env
    
    echo "✅ .env file created with SQLite configuration"
else
    echo "✅ .env file already exists"
fi

# 2. Create prisma directory if needed
mkdir -p prisma

# 3. Generate Prisma client
echo ""
echo "🔄 Generating Prisma client..."
npx prisma generate

# 4. Push database schema (creates SQLite file if needed)
echo ""
echo "🗄️  Setting up SQLite database..."
npx prisma db push

# 5. Check if database file was created
if [ -f "./prisma/prod.db" ]; then
    echo "✅ SQLite database created successfully"
    # Set proper permissions
    chmod 666 ./prisma/prod.db
    echo "✅ Database permissions set"
else
    echo "⚠️  Database file not created, checking alternative locations..."
    find . -name "*.db" -type f 2>/dev/null
fi

# 6. Run seed if database is empty
echo ""
echo "🌱 Checking for data..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count()
  .then(count => {
    if (count === 0) {
      console.log('⚠️  No users found. Run: sudo npm run seed:admin');
    } else {
      console.log('✅ Found ' + count + ' users');
    }
  })
  .catch(e => console.log('Error checking users:', e.message))
  .finally(() => prisma.\$disconnect());
"

# 7. Build and restart
echo ""
echo "🏗️  Building application..."
npm run build

echo ""
echo "🔄 Restarting PM2..."
pm2 restart 3

echo ""
echo "✅ SQLite setup complete!"
echo ""
echo "📋 Database location: ./prisma/prod.db"
echo "🔐 JWT_SECRET has been generated automatically"
echo ""
echo "If you need to create an admin user:"
echo "sudo npm run seed:admin"