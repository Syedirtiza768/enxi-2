#!/bin/bash

# Enxi ERP Authentication Diagnostic Script
# Diagnoses why authentication tokens are missing in production

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== Enxi ERP Authentication Diagnostics ===${NC}"
echo ""

cd /var/www/html/apps/enxi-2 || exit 1

# Step 1: Check which routes are failing
echo -e "${YELLOW}Step 1: Analyzing authentication errors...${NC}"
echo "Recent authentication errors:"
grep -n "Authentication error" logs/pm2-error-3.log | tail -10 | while read line; do
    echo -e "${RED}$line${NC}"
done

# Step 2: Check middleware configuration
echo ""
echo -e "${YELLOW}Step 2: Checking middleware.ts...${NC}"
if [ -f "middleware.ts" ]; then
    echo "Middleware exists. Checking authentication logic..."
    grep -A 5 -B 5 "token\|auth\|jwt" middleware.ts || echo "No auth logic found in middleware"
else
    echo -e "${RED}middleware.ts not found!${NC}"
fi

# Step 3: Create enhanced middleware with logging
echo ""
echo -e "${YELLOW}Step 3: Creating enhanced middleware with detailed logging...${NC}"

cat > middleware.ts << 'EOF'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Log all API requests for debugging
  if (path.startsWith('/api/')) {
    console.log(`[Middleware] ${new Date().toISOString()} - ${request.method} ${path}`);
    
    // Check for authentication headers
    const authHeader = request.headers.get('authorization');
    const cookie = request.headers.get('cookie');
    
    // Log authentication status
    if (!authHeader && !cookie?.includes('token')) {
      console.error(`[Middleware] No auth token for: ${path}`);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
EOF

# Step 4: Create client-side auth interceptor
echo ""
echo -e "${YELLOW}Step 4: Creating client-side authentication interceptor...${NC}"

cat > public/auth-interceptor.js << 'EOF'
// Enxi ERP Authentication Interceptor
// This script ensures all API requests include authentication tokens

(function() {
  console.log('[Auth Interceptor] Initializing...');
  
  // Store original fetch
  const originalFetch = window.fetch;
  
  // Get token from various sources
  function getAuthToken() {
    // Check localStorage
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    
    // Check sessionStorage
    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;
    
    // Check cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') return value;
    }
    
    return null;
  }
  
  // Override fetch to add authentication
  window.fetch = async function(...args) {
    let [url, options = {}] = args;
    
    // Only modify API requests
    if (typeof url === 'string' && url.includes('/api/')) {
      const token = getAuthToken();
      
      if (token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
        console.log(`[Auth Interceptor] Added token to ${url}`);
      } else {
        console.warn(`[Auth Interceptor] No token found for ${url}`);
      }
    }
    
    return originalFetch.apply(this, [url, options]);
  };
  
  // Also intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    this._method = method;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };
  
  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._url && this._url.includes('/api/')) {
      const token = getAuthToken();
      if (token) {
        this.setRequestHeader('Authorization', `Bearer ${token}`);
        console.log(`[Auth Interceptor] Added token to XHR ${this._url}`);
      }
    }
    return originalXHRSend.apply(this, args);
  };
  
  console.log('[Auth Interceptor] Ready. Token status:', getAuthToken() ? 'Found' : 'Not found');
  
  // Expose helper functions
  window.authHelpers = {
    getToken: getAuthToken,
    setToken: (token) => {
      localStorage.setItem('token', token);
      console.log('[Auth Interceptor] Token set');
    },
    clearToken: () => {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      console.log('[Auth Interceptor] Token cleared');
    },
    testAuth: async () => {
      try {
        const response = await fetch('/api/auth/validate');
        const data = await response.json();
        console.log('[Auth Test]', response.ok ? 'Success' : 'Failed', data);
        return response.ok;
      } catch (error) {
        console.error('[Auth Test] Error:', error);
        return false;
      }
    }
  };
})();
EOF

# Step 5: Add auth interceptor to app layout
echo ""
echo -e "${YELLOW}Step 5: Injecting auth interceptor into application...${NC}"

# Check if root layout exists
if [ -f "app/layout.tsx" ]; then
    echo "Adding auth interceptor to root layout..."
    
    # Backup original
    cp app/layout.tsx app/layout.tsx.backup
    
    # Add script tag before closing body
    sed -i '/<\/body>/i\        <script src="/auth-interceptor.js" defer></script>' app/layout.tsx
else
    echo -e "${RED}Root layout not found${NC}"
fi

# Step 6: Create API endpoint to test authentication
echo ""
echo -e "${YELLOW}Step 6: Creating auth test endpoint...${NC}"

mkdir -p app/api/auth/test
cat > app/api/auth/test/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cookie = request.headers.get('cookie');
  
  console.log('[Auth Test] Headers:', {
    authorization: authHeader || 'None',
    hasCookie: !!cookie,
    cookieHasToken: cookie?.includes('token') || false
  });
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    auth: {
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader ? 'Bearer ***' : null,
      hasCookie: !!cookie,
      cookieHasToken: cookie?.includes('token') || false
    },
    message: authHeader || cookie?.includes('token') 
      ? 'Authentication token found' 
      : 'No authentication token'
  });
}
EOF

# Step 7: Rebuild application
echo ""
echo -e "${YELLOW}Step 7: Rebuilding application...${NC}"
npm run build

# Step 8: Restart PM2
echo ""
echo -e "${YELLOW}Step 8: Restarting PM2...${NC}"
pm2 restart Enxi--Second

# Step 9: Test the auth endpoint
echo ""
echo -e "${YELLOW}Step 9: Testing authentication...${NC}"
sleep 3

echo "Testing without token:"
curl -s http://localhost:3003/api/auth/test | jq .

echo ""
echo "Testing with token:"
curl -s -H "Authorization: Bearer test-token" http://localhost:3003/api/auth/test | jq .

# Step 10: Monitor logs
echo ""
echo -e "${YELLOW}Step 10: Recent logs after changes...${NC}"
pm2 logs Enxi--Second --lines 10 --nostream

# Summary
echo ""
echo -e "${GREEN}=== Diagnostics Complete ===${NC}"
echo ""
echo -e "${BLUE}What was done:${NC}"
echo "1. Added detailed logging to middleware"
echo "2. Created client-side auth interceptor"
echo "3. Injected interceptor into application"
echo "4. Created test endpoint /api/auth/test"
echo "5. Rebuilt and restarted application"
echo ""
echo -e "${YELLOW}To test from browser:${NC}"
echo "1. Open browser console"
echo "2. Run: authHelpers.testAuth()"
echo "3. Check if token exists: authHelpers.getToken()"
echo "4. Set token if needed: authHelpers.setToken('your-token')"
echo ""
echo -e "${YELLOW}Monitor with:${NC}"
echo "pm2 logs Enxi--Second -f"
echo ""
echo -e "${GREEN}Script completed!${NC}"