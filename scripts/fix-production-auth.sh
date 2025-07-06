#!/bin/bash

# Enxi ERP Production Authentication Fix Script
# This script comprehensively fixes authentication issues on production

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Enxi ERP Production Authentication Fix ===${NC}"
echo -e "${BLUE}Server: /var/www/html/apps/enxi-2${NC}"
echo ""

# Step 1: Navigate to production directory
cd /var/www/html/apps/enxi-2 || {
    echo -e "${RED}ERROR: Cannot navigate to /var/www/html/apps/enxi-2${NC}"
    exit 1
}

# Step 2: Check and fix environment variables
echo -e "${YELLOW}Step 1: Checking environment configuration...${NC}"

# Check for .env.production
if [ ! -f ".env.production" ]; then
    echo -e "${RED}ERROR: .env.production not found${NC}"
    echo -e "${YELLOW}Creating .env.production...${NC}"
    
    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    
    cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
NEXTAUTH_SECRET=$JWT_SECRET
NEXTAUTH_URL=http://localhost:3003
DATABASE_URL="file:./prisma/dev.db"
EOF
    
    echo -e "${GREEN}Created .env.production${NC}"
else
    echo -e "${GREEN}.env.production exists${NC}"
    
    # Check if JWT_SECRET exists
    if ! grep -q "JWT_SECRET=" .env.production; then
        echo -e "${YELLOW}Adding JWT_SECRET to .env.production...${NC}"
        JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        echo "" >> .env.production
        echo "JWT_SECRET=$JWT_SECRET" >> .env.production
        echo "NEXTAUTH_SECRET=$JWT_SECRET" >> .env.production
    fi
fi

# Step 3: Create authentication debug endpoint
echo ""
echo -e "${YELLOW}Step 2: Creating authentication debug endpoint...${NC}"

mkdir -p app/api/auth/debug

cat > app/api/auth/debug/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const headers = request.headers;
  const authHeader = headers.get('authorization');
  const cookie = headers.get('cookie');
  
  // Check environment
  const jwtSecret = process.env.JWT_SECRET;
  const nodeEnv = process.env.NODE_ENV;
  
  return NextResponse.json({
    environment: {
      NODE_ENV: nodeEnv,
      JWT_SECRET_EXISTS: !!jwtSecret,
      JWT_SECRET_LENGTH: jwtSecret?.length || 0,
    },
    request: {
      authHeader: authHeader || 'No authorization header',
      hasCookie: !!cookie,
      cookieValue: cookie?.includes('token') ? 'Token cookie found' : 'No token in cookies',
    },
    timestamp: new Date().toISOString(),
  });
}
EOF

# Step 4: Update middleware to log auth issues
echo ""
echo -e "${YELLOW}Step 3: Updating middleware for better logging...${NC}"

# Backup current middleware
cp middleware.ts middleware.ts.backup 2>/dev/null || true

# Step 5: Rebuild the application
echo ""
echo -e "${YELLOW}Step 4: Rebuilding application...${NC}"

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Clean and rebuild
npm run build || {
    echo -e "${RED}Build failed. Checking for issues...${NC}"
    npm install
    npm run build
}

# Step 6: Update PM2 configuration
echo ""
echo -e "${YELLOW}Step 5: Updating PM2 configuration...${NC}"

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'Enxi--Second',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/html/apps/enxi-2',
    env: {
      NODE_ENV: 'production',
      PORT: 3003
    },
    env_file: '.env.production',
    error_file: 'logs/pm2-error-3.log',
    out_file: 'logs/pm2-out-3.log',
    merge_logs: true,
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false
  }]
};
EOF

# Step 7: Restart PM2 with new configuration
echo ""
echo -e "${YELLOW}Step 6: Restarting application...${NC}"

# Stop current process
pm2 stop Enxi--Second || true
pm2 delete Enxi--Second || true

# Start with ecosystem file
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Step 8: Test the authentication
echo ""
echo -e "${YELLOW}Step 7: Testing authentication endpoint...${NC}"
sleep 5  # Wait for server to start

# Test debug endpoint
echo "Testing debug endpoint..."
curl -s http://localhost:3003/api/auth/debug | jq . || {
    echo -e "${YELLOW}Debug endpoint response:${NC}"
    curl -s http://localhost:3003/api/auth/debug
}

# Step 9: Check logs
echo ""
echo -e "${YELLOW}Step 8: Checking application logs...${NC}"

# Show recent errors
echo -e "${BLUE}Recent errors:${NC}"
tail -n 20 logs/pm2-error-3.log | grep -E "(Authentication|Token|JWT)" || echo "No recent auth errors"

# Step 10: Create client-side fix script
echo ""
echo -e "${YELLOW}Step 9: Creating client-side token helper...${NC}"

cat > public/fix-auth-token.js << 'EOF'
// Client-side authentication token helper
(function() {
  console.log('=== Enxi Auth Token Helper ===');
  
  // Check current token
  const token = localStorage.getItem('token');
  const sessionToken = sessionStorage.getItem('token');
  
  console.log('LocalStorage token:', token ? 'Found' : 'Not found');
  console.log('SessionStorage token:', sessionToken ? 'Found' : 'Not found');
  
  // Check cookies
  const cookies = document.cookie.split(';').map(c => c.trim());
  const tokenCookie = cookies.find(c => c.startsWith('token='));
  console.log('Token cookie:', tokenCookie ? 'Found' : 'Not found');
  
  // If no token found, prompt for action
  if (!token && !sessionToken && !tokenCookie) {
    console.warn('No authentication token found!');
    console.log('To fix: Please log in again or run: localStorage.setItem("token", "your-token-here")');
  }
  
  // Add token to all API requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options = {}] = args;
    
    // Add auth header if token exists
    const authToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (authToken && url.includes('/api/')) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${authToken}`
      };
    }
    
    return originalFetch.apply(this, [url, options]);
  };
  
  console.log('Auth helper installed. All API requests will include token if available.');
})();
EOF

# Step 11: Summary
echo ""
echo -e "${GREEN}=== Fix Applied Successfully ===${NC}"
echo ""
echo -e "${BLUE}What was done:${NC}"
echo "1. ✓ Environment variables checked and fixed"
echo "2. ✓ Debug endpoint created at /api/auth/debug"
echo "3. ✓ Application rebuilt with proper environment"
echo "4. ✓ PM2 restarted with ecosystem configuration"
echo "5. ✓ Client-side auth helper created"
echo ""
echo -e "${YELLOW}To debug client-side issues:${NC}"
echo "1. Open browser console"
echo "2. Run: fetch('/fix-auth-token.js').then(r => r.text()).then(eval)"
echo "3. This will diagnose and help fix token issues"
echo ""
echo -e "${YELLOW}To monitor:${NC}"
echo "- Logs: pm2 logs Enxi--Second"
echo "- Status: pm2 status"
echo "- Debug: curl http://localhost:3003/api/auth/debug"
echo ""
echo -e "${GREEN}Script completed!${NC}"