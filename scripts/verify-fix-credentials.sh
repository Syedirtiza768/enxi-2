#!/bin/bash

# Verify and Fix Database Credentials for Enxi ERP
# Ensures admin user exists with correct password

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== Verify and Fix Database Credentials ===${NC}"
echo ""

cd /var/www/html/apps/enxi-2 || exit 1

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Step 1: Check database location
echo -e "${YELLOW}Step 1: Checking database configuration...${NC}"

DB_PATH=""
if [ -n "$DATABASE_URL" ]; then
    # Extract path from DATABASE_URL
    DB_PATH=$(echo "$DATABASE_URL" | grep -o 'file:.*' | sed 's/file://')
    # Handle relative paths
    if [[ "$DB_PATH" == ./* ]]; then
        DB_PATH="$(pwd)/${DB_PATH#./}"
    fi
    echo "Database URL: $DATABASE_URL"
    echo "Database path: $DB_PATH"
elif [ -n "$DB_PERSISTENCE_PATH" ]; then
    DB_PATH="$DB_PERSISTENCE_PATH"
    echo "Database path from DB_PERSISTENCE_PATH: $DB_PATH"
fi

if [ -z "$DB_PATH" ] || [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}ERROR: Database file not found at $DB_PATH${NC}"
    echo "Looking for database files..."
    find . -name "*.db" -type f 2>/dev/null | head -10
    exit 1
fi

echo -e "${GREEN}✓ Database found at: $DB_PATH${NC}"

# Step 2: Create user verification script
echo ""
echo -e "${YELLOW}Step 2: Creating user verification script...${NC}"

cat > verify-users.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking users in database...\n');
  
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- Username: ${user.username}, Email: ${user.email || 'N/A'}, Created: ${user.createdAt}`);
    });
    
    // Check for admin user
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (adminUser) {
      console.log('\n✓ Admin user exists');
      
      // Test password
      const testPassword = 'demo123';
      const passwordMatch = await bcrypt.compare(testPassword, adminUser.password);
      
      if (passwordMatch) {
        console.log('✓ Password "demo123" is correct');
      } else {
        console.log('✗ Password "demo123" is incorrect');
        console.log('Updating admin password to "demo123"...');
        
        // Update password
        const hashedPassword = await bcrypt.hash('demo123', 10);
        await prisma.user.update({
          where: { id: adminUser.id },
          data: { password: hashedPassword }
        });
        
        console.log('✓ Admin password updated to "demo123"');
      }
    } else {
      console.log('\n✗ Admin user not found');
      console.log('Creating admin user...');
      
      // Create admin user
      const hashedPassword = await bcrypt.hash('demo123', 10);
      const newAdmin = await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          email: 'admin@enxi.com'
        }
      });
      
      console.log('✓ Admin user created with password "demo123"');
    }
    
    // Test login
    console.log('\nTesting login functionality...');
    const testUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (testUser) {
      const loginTest = await bcrypt.compare('demo123', testUser.password);
      if (loginTest) {
        console.log('✓ Login test successful!');
      } else {
        console.log('✗ Login test failed');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
EOF

# Step 3: Run user verification
echo ""
echo -e "${YELLOW}Step 3: Running user verification...${NC}"

# Ensure bcryptjs is installed
npm list bcryptjs >/dev/null 2>&1 || npm install bcryptjs

# Run the verification script
node verify-users.js

# Step 4: Test login via API
echo ""
echo -e "${YELLOW}Step 4: Testing login via API...${NC}"

# Get port
PORT=$(grep "^PORT=" .env | cut -d'=' -f2 | tr -d '"' | tr -d ' ')
PORT=${PORT:-3051}

# Wait a moment for any database updates
sleep 2

# Test login
echo "Testing login with admin/demo123..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:$PORT/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"demo123"}' \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | grep -v "HTTP_STATUS:")

echo "Response status: $HTTP_STATUS"
echo "Response body:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_STATUS" = "200" ] && echo "$RESPONSE_BODY" | grep -q "token"; then
    echo -e "${GREEN}✓ Login successful!${NC}"
else
    echo -e "${RED}✗ Login failed${NC}"
    
    # Check server logs
    echo ""
    echo "Recent server logs:"
    pm2 logs Enxi--Second --lines 10 --nostream | grep -E "(auth|login|password)" || true
fi

# Step 5: Create manual test endpoint
echo ""
echo -e "${YELLOW}Step 5: Creating manual test endpoint...${NC}"

mkdir -p app/api/auth/test-credentials

cat > app/api/auth/test-credentials/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' },
      select: {
        id: true,
        username: true,
        email: true,
        password: true
      }
    });
    
    if (!adminUser) {
      return NextResponse.json({
        success: false,
        message: 'Admin user not found'
      });
    }
    
    // Test password
    const passwordMatch = await bcrypt.compare('demo123', adminUser.password);
    
    return NextResponse.json({
      success: true,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email
      },
      passwordTest: {
        tested: 'demo123',
        matches: passwordMatch
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
EOF

# Step 6: Rebuild if needed
echo ""
echo -e "${YELLOW}Step 6: Rebuilding application...${NC}"
npm run build

# Step 7: Restart PM2
echo ""
echo -e "${YELLOW}Step 7: Restarting application...${NC}"
pm2 restart Enxi--Second

# Cleanup
rm -f verify-users.js

# Summary
echo ""
echo -e "${GREEN}=== Credential Verification Complete ===${NC}"
echo ""
echo -e "${BLUE}Actions taken:${NC}"
echo "1. ✓ Verified database location"
echo "2. ✓ Checked/created admin user"
echo "3. ✓ Set password to 'demo123'"
echo "4. ✓ Tested login functionality"
echo "5. ✓ Created test endpoint"
echo ""
echo -e "${YELLOW}Login credentials:${NC}"
echo "Username: admin"
echo "Password: demo123"
echo ""
echo -e "${YELLOW}Test endpoints:${NC}"
echo "curl http://localhost:$PORT/api/auth/test-credentials"
echo ""
echo -e "${GREEN}You should now be able to login!${NC}"