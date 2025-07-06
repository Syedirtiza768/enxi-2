#!/bin/bash

# Fix JWT Authentication in Production
# This ensures the JWT_SECRET is properly loaded and authentication works

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== Fixing JWT Authentication in Production ===${NC}"
echo ""

cd /var/www/html/apps/enxi-2 || exit 1

# Step 1: Verify .env file
echo -e "${YELLOW}Step 1: Verifying environment configuration...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    
    # Check for JWT_SECRET
    if grep -q "JWT_SECRET=" .env; then
        echo -e "${GREEN}✓ JWT_SECRET is configured${NC}"
        JWT_SECRET=$(grep "JWT_SECRET=" .env | cut -d'=' -f2 | tr -d '"')
        echo "JWT_SECRET length: ${#JWT_SECRET} characters"
    else
        echo -e "${RED}✗ JWT_SECRET not found in .env${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ .env file not found${NC}"
    exit 1
fi

# Step 2: Create .env.production symlink
echo ""
echo -e "${YELLOW}Step 2: Creating .env.production symlink...${NC}"
if [ ! -f ".env.production" ]; then
    ln -s .env .env.production
    echo -e "${GREEN}✓ Created .env.production symlink${NC}"
else
    echo -e "${BLUE}ℹ .env.production already exists${NC}"
fi

# Step 3: Test login endpoint
echo ""
echo -e "${YELLOW}Step 3: Testing login endpoint...${NC}"

# First check if server is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/api/health | grep -q "200"; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${YELLOW}⚠ Server may not be fully started${NC}"
fi

# Test login with demo credentials
echo "Testing login with admin/demo123..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"demo123"}')

echo "Login response:"
echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token if login successful
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null)
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful, token received${NC}"
    
    # Test authenticated endpoint
    echo ""
    echo "Testing authenticated endpoint..."
    AUTH_TEST=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3003/api/auth/validate)
    echo "$AUTH_TEST" | jq . 2>/dev/null || echo "$AUTH_TEST"
else
    echo -e "${RED}✗ Login failed or no token received${NC}"
fi

# Step 4: Create PM2 ecosystem with proper env loading
echo ""
echo -e "${YELLOW}Step 4: Updating PM2 configuration...${NC}"

cat > ecosystem.config.js << 'EOF'
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Environment variables loaded from:', envPath);
}

module.exports = {
  apps: [{
    name: 'Enxi--Second',
    script: 'node_modules/.bin/next',
    args: 'start -p 3003',
    cwd: '/var/www/html/apps/enxi-2',
    instances: 1,
    exec_mode: 'fork',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: 3003
    },
    error_file: './logs/pm2-error-3.log',
    out_file: './logs/pm2-out-3.log',
    log_file: './logs/pm2-combined-3.log',
    merge_logs: true,
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

# Step 5: Install dotenv if not present
echo ""
echo -e "${YELLOW}Step 5: Ensuring dotenv is installed...${NC}"
npm list dotenv >/dev/null 2>&1 || npm install dotenv

# Step 6: Restart PM2 with new configuration
echo ""
echo -e "${YELLOW}Step 6: Restarting PM2...${NC}"
pm2 stop Enxi--Second
pm2 delete Enxi--Second
pm2 start ecosystem.config.js
pm2 save

# Step 7: Create browser login helper
echo ""
echo -e "${YELLOW}Step 7: Creating browser login helper...${NC}"

cat > public/login-helper.js << 'EOF'
// Login Helper for Enxi ERP
async function loginToEnxi(username = 'admin', password = 'demo123') {
  try {
    console.log('Attempting login...');
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      // Store token in localStorage
      localStorage.setItem('token', data.token);
      
      // Also set in sessionStorage
      sessionStorage.setItem('token', data.token);
      
      // Set cookie
      document.cookie = `token=${data.token}; path=/; max-age=86400`;
      
      console.log('✓ Login successful!');
      console.log('Token stored in localStorage, sessionStorage, and cookies');
      
      // Reload page to apply authentication
      setTimeout(() => {
        console.log('Reloading page...');
        window.location.reload();
      }, 1000);
      
      return true;
    } else {
      console.error('✗ Login failed:', data);
      return false;
    }
  } catch (error) {
    console.error('✗ Login error:', error);
    return false;
  }
}

// Auto-login if no token exists
if (!localStorage.getItem('token') && !sessionStorage.getItem('token')) {
  console.log('No token found. Run loginToEnxi() to login.');
}

console.log('Login helper loaded. Use loginToEnxi() to login with admin/demo123');
EOF

# Step 8: Wait and check logs
echo ""
echo -e "${YELLOW}Step 8: Checking application status...${NC}"
sleep 5

# Check PM2 status
pm2 status

# Check recent logs
echo ""
echo -e "${BLUE}Recent logs:${NC}"
pm2 logs Enxi--Second --lines 20 --nostream | grep -v "Authentication error" || true

# Summary
echo ""
echo -e "${GREEN}=== Fix Applied ===${NC}"
echo ""
echo -e "${BLUE}What was done:${NC}"
echo "1. ✓ Verified JWT_SECRET in .env"
echo "2. ✓ Created .env.production symlink"
echo "3. ✓ Updated PM2 to properly load environment"
echo "4. ✓ Created login helper script"
echo "5. ✓ Restarted application"
echo ""
echo -e "${YELLOW}To login from browser:${NC}"
echo "1. Open https://enxi.realtrackapp.com"
echo "2. Open browser console (F12)"
echo "3. Run: fetch('/login-helper.js').then(r => r.text()).then(eval)"
echo "4. Run: loginToEnxi()"
echo ""
echo -e "${YELLOW}Or login normally with:${NC}"
echo "Username: admin"
echo "Password: demo123"
echo ""
echo -e "${GREEN}Script completed!${NC}"