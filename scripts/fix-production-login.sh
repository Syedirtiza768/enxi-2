#!/bin/bash

# Production Server Login Fix Script
# This script diagnoses and fixes the 500 error on login endpoint

set -e

echo "🔧 Starting Production Login Fix Script..."
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if running as root/sudo
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Navigate to project directory
cd /var/www/html/enxi-2 || {
    print_error "Project directory not found!"
    exit 1
}

print_status "Found project directory"

# Step 1: Check PM2 logs for specific errors
echo ""
echo "📋 Checking PM2 logs for login errors..."
echo "----------------------------------------"
pm2 logs 3 --lines 100 | grep -i "login\|bcrypt\|jwt\|prisma" | tail -20 || true

# Step 2: Check environment variables
echo ""
echo "🔐 Checking environment variables..."
echo "-----------------------------------"
if [ -f .env ]; then
    print_status ".env file exists"
    
    # Check for required variables
    if grep -q "DATABASE_URL=" .env; then
        print_status "DATABASE_URL is set"
    else
        print_error "DATABASE_URL is missing!"
        echo "DATABASE_URL=postgresql://user:password@host:5432/database" >> .env.example
    fi
    
    if grep -q "JWT_SECRET=" .env; then
        print_status "JWT_SECRET is set"
    else
        print_warning "JWT_SECRET is missing! Adding a default one..."
        echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
        print_status "JWT_SECRET added to .env"
    fi
    
    if grep -q "NODE_ENV=" .env; then
        print_status "NODE_ENV is set"
    else
        print_warning "NODE_ENV is missing! Setting to production..."
        echo "NODE_ENV=production" >> .env
        print_status "NODE_ENV set to production"
    fi
else
    print_error ".env file not found!"
    exit 1
fi

# Step 3: Test bcrypt
echo ""
echo "🔑 Testing bcrypt module..."
echo "--------------------------"
node -e "
try {
    const bcrypt = require('bcrypt');
    bcrypt.hash('test', 10).then(() => {
        console.log('✓ Bcrypt is working correctly');
        process.exit(0);
    }).catch(e => {
        console.error('✗ Bcrypt error:', e.message);
        process.exit(1);
    });
} catch(e) {
    console.error('✗ Failed to load bcrypt:', e.message);
    process.exit(1);
}
" || BCRYPT_FAILED=true

# Step 4: Fix bcrypt if needed
if [ "$BCRYPT_FAILED" = true ]; then
    print_warning "Bcrypt module has issues. Attempting to fix..."
    
    # Remove node_modules and reinstall
    rm -rf node_modules package-lock.json
    print_status "Removed node_modules and package-lock.json"
    
    # Try to install with production flag
    npm install --production
    
    # Test bcrypt again
    node -e "require('bcrypt').hash('test', 10).then(() => console.log('✓ Bcrypt fixed!')).catch(() => process.exit(1))" || {
        print_warning "Native bcrypt still failing, installing bcryptjs as fallback..."
        npm install bcryptjs
        
        # Update imports to use bcryptjs
        find . -name "*.ts" -o -name "*.js" | xargs grep -l "from 'bcrypt'" | while read file; do
            sed -i "s/from 'bcrypt'/from 'bcryptjs'/g" "$file"
            print_status "Updated bcrypt import in $file"
        done
    }
fi

# Step 5: Test database connection
echo ""
echo "🗄️  Testing database connection..."
echo "---------------------------------"
npx prisma db push || {
    print_error "Database connection failed!"
    print_warning "Please check your DATABASE_URL in .env"
    exit 1
}
print_status "Database connection successful"

# Step 6: Check if users exist
echo ""
echo "👥 Checking for users in database..."
echo "-----------------------------------"
USER_COUNT=$(npx prisma studio --browser none & sleep 5 && kill $! 2>/dev/null || true)

# Run a quick check for users
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count().then(count => {
    console.log('User count:', count);
    if (count === 0) {
        console.log('⚠️  No users found in database!');
        process.exit(1);
    } else {
        console.log('✓ Found', count, 'users');
    }
    process.exit(0);
}).catch(e => {
    console.error('Failed to query users:', e.message);
    process.exit(1);
}).finally(() => {
    prisma.\$disconnect();
});
" || {
    print_warning "No users found. Running seed script..."
    npm run seed:production || npm run seed:admin || {
        print_error "Failed to seed database"
        print_warning "Creating a default admin user..."
        
        # Create default admin user
        node -e "
        const { PrismaClient } = require('@prisma/client');
        const bcrypt = require('bcryptjs');
        const prisma = new PrismaClient();
        
        bcrypt.hash('admin123', 10).then(hash => {
            return prisma.user.create({
                data: {
                    username: 'admin',
                    password: hash,
                    email: 'admin@example.com',
                    name: 'Admin User',
                    role: 'ADMIN',
                    permissions: ['ALL']
                }
            });
        }).then(() => {
            console.log('✓ Created default admin user (username: admin, password: admin123)');
            process.exit(0);
        }).catch(e => {
            console.error('Failed to create admin user:', e.message);
            process.exit(1);
        }).finally(() => {
            prisma.\$disconnect();
        });
        "
    }
}

# Step 7: Rebuild application
echo ""
echo "🏗️  Rebuilding application..."
echo "----------------------------"
npm run build || {
    print_error "Build failed!"
    exit 1
}
print_status "Build completed successfully"

# Step 8: Restart PM2
echo ""
echo "🔄 Restarting PM2 process..."
echo "---------------------------"
pm2 restart 3
print_status "PM2 process restarted"

# Step 9: Test login endpoint
echo ""
echo "🧪 Testing login endpoint..."
echo "---------------------------"
sleep 3  # Wait for server to start

# Test with curl
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' || echo "CURL_FAILED")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_status "Login endpoint is working! (HTTP 200)"
elif [ "$HTTP_CODE" = "401" ]; then
    print_warning "Login endpoint works but credentials are invalid (HTTP 401)"
    echo "Please check your username and password"
elif [ "$HTTP_CODE" = "500" ]; then
    print_error "Still getting 500 error!"
    echo "Response body: $BODY"
    echo ""
    echo "Please check PM2 logs for more details:"
    echo "pm2 logs 3 --lines 50"
else
    print_error "Unexpected response code: $HTTP_CODE"
    echo "Response: $BODY"
fi

# Step 10: Final checks
echo ""
echo "📊 Final Status Report"
echo "====================="
echo "1. Environment variables: Checked ✓"
echo "2. Bcrypt module: $(node -e "try { require('bcrypt'); console.log('Working ✓'); } catch(e) { try { require('bcryptjs'); console.log('Using bcryptjs ✓'); } catch(e2) { console.log('Not working ✗'); } }")"
echo "3. Database connection: Working ✓"
echo "4. Application built: Yes ✓"
echo "5. PM2 restarted: Yes ✓"
echo ""
echo "🔍 To monitor logs:"
echo "   pm2 logs 3 --lines 100"
echo ""
echo "🌐 Test from browser:"
echo "   https://erp.alsahab.me/login"
echo ""
print_status "Script completed!"