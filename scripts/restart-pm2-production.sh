#!/bin/bash

# PM2 Restart Script for Enxi Production
# Ensures PM2 is running with correct configuration

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== PM2 Production Restart Script ===${NC}"
echo ""

# Navigate to production directory
cd /var/www/html/apps/enxi-2 || {
    echo -e "${RED}ERROR: Cannot navigate to production directory${NC}"
    exit 1
}

# Step 1: Create proper ecosystem configuration
echo -e "${YELLOW}Creating PM2 ecosystem configuration...${NC}"

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'Enxi--Second',
    script: 'node_modules/.bin/next',
    args: 'start -p 3003',
    cwd: '/var/www/html/apps/enxi-2',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3003
    },
    env_production: {
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
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Step 2: Ensure logs directory exists
echo -e "${YELLOW}Setting up logs directory...${NC}"
mkdir -p logs
chmod 755 logs

# Step 3: Load environment variables
echo -e "${YELLOW}Loading environment variables...${NC}"
if [ -f ".env.production" ]; then
    set -a
    source .env.production
    set +a
    echo -e "${GREEN}Environment variables loaded${NC}"
else
    echo -e "${RED}WARNING: .env.production not found${NC}"
fi

# Step 4: Stop and delete existing PM2 process
echo -e "${YELLOW}Stopping existing PM2 processes...${NC}"
pm2 stop Enxi--Second 2>/dev/null || echo "Process not running"
pm2 delete Enxi--Second 2>/dev/null || echo "Process not found"

# Step 5: Clear PM2 logs
echo -e "${YELLOW}Clearing old PM2 logs...${NC}"
pm2 flush

# Step 6: Start with ecosystem configuration
echo -e "${YELLOW}Starting PM2 with ecosystem configuration...${NC}"
pm2 start ecosystem.config.js --env production

# Step 7: Save PM2 process list
echo -e "${YELLOW}Saving PM2 configuration...${NC}"
pm2 save

# Step 8: Set up PM2 startup (if not already done)
echo -e "${YELLOW}Ensuring PM2 startup configuration...${NC}"
pm2 startup systemd -u $USER --hp $HOME || echo "Startup already configured"

# Step 9: Display status
echo ""
echo -e "${BLUE}=== PM2 Status ===${NC}"
pm2 status

# Step 10: Show initial logs
echo ""
echo -e "${BLUE}=== Initial Logs ===${NC}"
pm2 logs Enxi--Second --lines 10 --nostream

# Step 11: Test server health
echo ""
echo -e "${YELLOW}Testing server health...${NC}"
sleep 3

# Check if server is responding
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/ | grep -q "200\|302\|304"; then
    echo -e "${GREEN}✓ Server is responding on port 3003${NC}"
else
    echo -e "${RED}✗ Server is not responding properly${NC}"
    echo "Checking logs for errors..."
    pm2 logs Enxi--Second --lines 20 --nostream
fi

# Summary
echo ""
echo -e "${GREEN}=== PM2 Restart Complete ===${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "- View logs: pm2 logs Enxi--Second"
echo "- Monitor: pm2 monit"
echo "- Status: pm2 status"
echo "- Restart: pm2 restart Enxi--Second"
echo "- Stop: pm2 stop Enxi--Second"
echo ""
echo -e "${YELLOW}Log files location:${NC}"
echo "- Error log: /var/www/html/apps/enxi-2/logs/pm2-error-3.log"
echo "- Output log: /var/www/html/apps/enxi-2/logs/pm2-out-3.log"
echo ""
echo -e "${GREEN}Script completed!${NC}"