#!/bin/bash

# Dynamic Port Configuration Script for Enxi ERP
# Reads PORT from .env and configures all services accordingly

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== Dynamic Port Configuration for Enxi ERP ===${NC}"
echo ""

# Navigate to app directory (works on any server)
APP_DIR=$(pwd)
if [[ ! "$APP_DIR" =~ "enxi" ]]; then
    # Try common locations
    if [ -d "/var/www/html/apps/enxi-2" ]; then
        APP_DIR="/var/www/html/apps/enxi-2"
    elif [ -d "/home/ubuntu/enxi-2" ]; then
        APP_DIR="/home/ubuntu/enxi-2"
    else
        echo -e "${RED}ERROR: Cannot find Enxi application directory${NC}"
        exit 1
    fi
fi

cd "$APP_DIR" || exit 1
echo -e "${BLUE}Working directory: $APP_DIR${NC}"

# Step 1: Read PORT from .env
echo ""
echo -e "${YELLOW}Step 1: Reading PORT from .env...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}ERROR: .env file not found${NC}"
    exit 1
fi

# Extract PORT value
PORT=$(grep "^PORT=" .env | cut -d'=' -f2 | tr -d '"' | tr -d ' ')

if [ -z "$PORT" ]; then
    echo -e "${RED}ERROR: PORT not found in .env${NC}"
    echo "Please add PORT=xxxx to your .env file"
    exit 1
fi

echo -e "${GREEN}✓ PORT found: $PORT${NC}"

# Step 2: Create dynamic PM2 ecosystem configuration
echo ""
echo -e "${YELLOW}Step 2: Creating dynamic PM2 configuration...${NC}"

cat > ecosystem.config.js << EOF
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
console.log('Starting Enxi on port:', PORT);

module.exports = {
  apps: [{
    name: 'Enxi--Second',
    script: 'node_modules/.bin/next',
    args: 'start -p ' + PORT,
    cwd: '${APP_DIR}',
    instances: 1,
    exec_mode: 'fork',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: PORT
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
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

echo -e "${GREEN}✓ PM2 configuration created for port $PORT${NC}"

# Step 3: Create startup script that uses dynamic port
echo ""
echo -e "${YELLOW}Step 3: Creating dynamic startup script...${NC}"

cat > start-production.sh << 'EOF'
#!/bin/bash

# Load PORT from .env
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$PORT" ]; then
    echo "ERROR: PORT not set in .env"
    exit 1
fi

echo "Starting Enxi on port $PORT..."

# Ensure dotenv is installed
npm list dotenv >/dev/null 2>&1 || npm install dotenv

# Start with PM2
pm2 stop Enxi--Second 2>/dev/null || true
pm2 delete Enxi--Second 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "Enxi started on port $PORT"
echo "Access at: http://localhost:$PORT"
EOF

chmod +x start-production.sh

# Step 4: Create health check script with dynamic port
echo ""
echo -e "${YELLOW}Step 4: Creating health check script...${NC}"

cat > check-health.sh << 'EOF'
#!/bin/bash

# Load PORT from .env
if [ -f ".env" ]; then
    PORT=$(grep "^PORT=" .env | cut -d'=' -f2 | tr -d '"' | tr -d ' ')
fi

if [ -z "$PORT" ]; then
    echo "ERROR: PORT not set in .env"
    exit 1
fi

echo "Checking health on port $PORT..."

# Check if server is responding
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/health" | grep -q "200"; then
    echo "✓ Server is healthy on port $PORT"
else
    echo "✗ Server is not responding on port $PORT"
    echo "Checking PM2 status..."
    pm2 status
fi

# Test authentication endpoint
echo ""
echo "Testing authentication endpoint..."
curl -s "http://localhost:$PORT/api/auth/test" | jq . 2>/dev/null || echo "Auth test failed"
EOF

chmod +x check-health.sh

# Step 5: Update any hardcoded ports in scripts
echo ""
echo -e "${YELLOW}Step 5: Updating hardcoded ports in existing scripts...${NC}"

# Find and update any references to port 3003 or 3051
for script in scripts/*.sh; do
    if [ -f "$script" ]; then
        if grep -q "3003\|3051\|3000" "$script"; then
            echo "Updating $script..."
            # Backup original
            cp "$script" "$script.backup"
            
            # Replace hardcoded ports with dynamic PORT variable
            sed -i 's/localhost:3003/localhost:$PORT/g' "$script"
            sed -i 's/localhost:3051/localhost:$PORT/g' "$script"
            sed -i 's/localhost:3000/localhost:$PORT/g' "$script"
            sed -i 's/-p 3003/-p $PORT/g' "$script"
            sed -i 's/-p 3051/-p $PORT/g' "$script"
            sed -i 's/-p 3000/-p $PORT/g' "$script"
            
            # Add PORT loading at the beginning if not present
            if ! grep -q "Load PORT from .env" "$script"; then
                sed -i '2i\
# Load PORT from .env\
if [ -f ".env" ]; then\
    PORT=$(grep "^PORT=" .env | cut -d="=" -f2 | tr -d "\"" | tr -d " ")\
fi\
' "$script"
            fi
        fi
    fi
done

# Step 6: Restart with new configuration
echo ""
echo -e "${YELLOW}Step 6: Restarting application with port $PORT...${NC}"

./start-production.sh

# Step 7: Verify
echo ""
echo -e "${YELLOW}Step 7: Verifying configuration...${NC}"
sleep 5

./check-health.sh

# Summary
echo ""
echo -e "${GREEN}=== Configuration Complete ===${NC}"
echo ""
echo -e "${BLUE}What was done:${NC}"
echo "1. ✓ Read PORT=$PORT from .env"
echo "2. ✓ Created dynamic PM2 configuration"
echo "3. ✓ Created startup script that uses .env PORT"
echo "4. ✓ Created health check script"
echo "5. ✓ Updated existing scripts to use dynamic PORT"
echo "6. ✓ Restarted application on port $PORT"
echo ""
echo -e "${YELLOW}Important files created:${NC}"
echo "- ecosystem.config.js - PM2 configuration"
echo "- start-production.sh - Start script"
echo "- check-health.sh - Health check script"
echo ""
echo -e "${YELLOW}To start/restart:${NC}"
echo "./start-production.sh"
echo ""
echo -e "${YELLOW}To check health:${NC}"
echo "./check-health.sh"
echo ""
echo -e "${GREEN}The application now automatically uses PORT from .env!${NC}"