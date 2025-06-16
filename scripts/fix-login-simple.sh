#!/bin/bash

# Simple Production Login Fix Script
# Non-interactive version that won't hang

echo "🔧 Starting Production Login Fix..."
echo "=================================="

cd /var/www/html/enxi-2 || exit 1

# 1. Check environment variables
echo ""
echo "1️⃣ Checking environment variables..."
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

if ! grep -q "JWT_SECRET=" .env; then
    echo "⚠️  Adding JWT_SECRET..."
    echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
fi

# 2. Fix bcrypt issue (most common cause)
echo ""
echo "2️⃣ Fixing bcrypt module..."
rm -rf node_modules package-lock.json
npm install --production --legacy-peer-deps

# 3. Install bcryptjs as fallback
echo ""
echo "3️⃣ Installing bcryptjs fallback..."
npm install bcryptjs

# 4. Generate Prisma client
echo ""
echo "4️⃣ Generating Prisma client..."
npx prisma generate

# 5. Push database schema
echo ""
echo "5️⃣ Updating database schema..."
npx prisma db push --skip-seed

# 6. Build the application
echo ""
echo "6️⃣ Building application..."
npm run build

# 7. Restart PM2
echo ""
echo "7️⃣ Restarting PM2..."
pm2 restart 3

echo ""
echo "✅ Fix script completed!"
echo ""
echo "📋 Next steps:"
echo "1. Check if login works: https://erp.alsahab.me/login"
echo "2. View logs: pm2 logs 3"
echo "3. If still broken, check error details: pm2 logs 3 --err"
echo ""
echo "🔐 If you need to create an admin user, run:"
echo "   sudo npm run seed:admin"