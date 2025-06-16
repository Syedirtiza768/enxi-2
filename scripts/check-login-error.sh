#!/bin/bash

# Quick script to check what's causing the login 500 error

echo "🔍 Checking Login Error..."
echo "========================"

cd /var/www/html/enxi-2 || exit 1

# 1. Show recent error logs
echo ""
echo "📋 Recent error logs:"
echo "-------------------"
pm2 logs 3 --err --lines 20 --nostream

# 2. Test bcrypt directly
echo ""
echo "🔑 Testing bcrypt:"
echo "-----------------"
node -e "try { require('bcrypt'); console.log('✅ bcrypt loads OK'); } catch(e) { console.log('❌ bcrypt error:', e.message); }"

# 3. Check if database is accessible
echo ""
echo "🗄️  Testing database:"
echo "-------------------"
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => { console.log('✅ Database connected'); return prisma.user.count(); })
  .then(count => { console.log('✅ User count:', count); })
  .catch(e => { console.log('❌ Database error:', e.message); })
  .finally(() => prisma.\$disconnect());
"

# 4. Check environment
echo ""
echo "🔐 Environment check:"
echo "-------------------"
[ -f .env ] && echo "✅ .env exists" || echo "❌ .env missing"
grep -q "DATABASE_URL=" .env && echo "✅ DATABASE_URL set" || echo "❌ DATABASE_URL missing"
grep -q "JWT_SECRET=" .env && echo "✅ JWT_SECRET set" || echo "❌ JWT_SECRET missing"

echo ""
echo "💡 Common fixes:"
echo "1. If bcrypt fails: npm install bcryptjs"
echo "2. If database fails: check DATABASE_URL in .env"
echo "3. If JWT missing: echo 'JWT_SECRET=your-secret' >> .env"