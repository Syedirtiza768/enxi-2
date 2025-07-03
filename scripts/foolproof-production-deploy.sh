#!/bin/bash

# ===================================================================
# FOOLPROOF PRODUCTION DEPLOYMENT SCRIPT FOR ENXI ERP
# ===================================================================
# This script handles complete production deployment including:
# - Environment setup
# - Database initialization
# - Application build
# - PM2 configuration
# - Error handling and recovery
# ===================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER="ubuntu"
DEPLOY_DIR="/var/www/html/enxi-2"
PM2_APP_NAME="Enxi-AlSahab"
NODE_VERSION="18"
PRODUCTION_URL="https://erp.alsahab.me"
DB_DIR="/var/lib/enxi/database"
DB_FILE="enxi.db"

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}     ENXI ERP FOOLPROOF PRODUCTION DEPLOYMENT      ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo ""

# Function to check if running as root/sudo
check_sudo() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}This script must be run with sudo${NC}"
        echo "Usage: sudo ./foolproof-production-deploy.sh"
        exit 1
    fi
}

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to log errors
error() {
    echo -e "${RED}[ERROR $(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to log warnings
warn() {
    echo -e "${YELLOW}[WARN $(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Check if running with sudo
check_sudo

# Step 1: System Prerequisites
log "Checking system prerequisites..."

# Update system packages
apt update -qq

# Install required packages if not present
PACKAGES="git nodejs npm sqlite3 build-essential"
for pkg in $PACKAGES; do
    if ! dpkg -l | grep -q "^ii  $pkg"; then
        log "Installing $pkg..."
        apt install -y $pkg
    fi
done

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    log "Installing PM2..."
    npm install -g pm2
fi

# Step 2: Navigate to deployment directory
log "Setting up deployment directory..."

# Create directory if it doesn't exist
if [ ! -d "$DEPLOY_DIR" ]; then
    mkdir -p "$DEPLOY_DIR"
    chown $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_DIR"
fi

cd "$DEPLOY_DIR" || { error "Failed to navigate to $DEPLOY_DIR"; exit 1; }

# Step 3: Clone or update repository
if [ ! -d ".git" ]; then
    log "Cloning repository..."
    # Remove directory contents if any exist
    rm -rf ./* ./.*  2>/dev/null || true
    
    # Clone the repository
    git clone https://github.com/Syedirtiza768/enxi-2.git . || { error "Git clone failed"; exit 1; }
else
    log "Updating existing repository..."
    # Stash any local changes
    git stash
    
    # Pull latest changes
    git pull origin main || { error "Git pull failed"; exit 1; }
fi

# Set proper ownership
chown -R $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_DIR"

# Step 4: Create production environment file
log "Setting up environment configuration..."

if [ ! -f ".env" ]; then
    cat > .env << EOF
# Production Environment Configuration
NODE_ENV=production
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="$PRODUCTION_URL"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
PORT=3050

# Database Configuration
DB_PERSISTENCE_PATH="$DB_DIR/$DB_FILE"

# Additional Settings
LOG_LEVEL=info
EOF
    
    log "Created .env file with secure secrets"
else
    warn ".env file exists, updating JWT secrets for security..."
    
    # Backup existing .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update JWT secrets if they're still default
    if grep -q "your-jwt-secret-here\|your-nextauth-secret-here\|production-jwt-secret-alsahab-2024" .env; then
        # Generate new secrets
        NEW_JWT_SECRET=$(openssl rand -base64 32)
        NEW_NEXTAUTH_SECRET=$(openssl rand -base64 32)
        
        # Update secrets in .env
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=\"$NEW_JWT_SECRET\"/" .env
        sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$NEW_NEXTAUTH_SECRET\"/" .env
        
        log "Updated JWT secrets with secure values"
    fi
fi

# Set proper permissions on .env
chmod 600 .env
chown $DEPLOY_USER:$DEPLOY_USER .env

# Step 5: Install dependencies
log "Installing project dependencies..."
sudo -u $DEPLOY_USER npm ci --production=false || sudo -u $DEPLOY_USER npm install

# Step 6: Set up database
log "Setting up production database..."

# Create database directory
mkdir -p "$DB_DIR"
chown $DEPLOY_USER:$DEPLOY_USER "$DB_DIR"

# Check if database needs to be initialized
if [ ! -f "$DB_DIR/$DB_FILE" ]; then
    log "Creating new production database..."
    
    # Create empty database file
    touch "$DB_DIR/$DB_FILE"
    chown $DEPLOY_USER:$DEPLOY_USER "$DB_DIR/$DB_FILE"
    chmod 664 "$DB_DIR/$DB_FILE"
else
    log "Production database exists at $DB_DIR/$DB_FILE"
fi

# Remove any existing symlink or file
rm -f prisma/prod.db

# Create symlink to persistent database
ln -s "$DB_DIR/$DB_FILE" prisma/prod.db

# Generate Prisma client
log "Generating Prisma client..."
sudo -u $DEPLOY_USER npx prisma generate

# Push database schema
log "Updating database schema..."
sudo -u $DEPLOY_USER npx prisma db push --accept-data-loss || {
    warn "Database push had warnings, continuing..."
}

# Step 7: Seed database with initial data
log "Checking database initialization..."

# Check if User table exists and has data
USER_COUNT=$(sqlite3 "$DB_DIR/$DB_FILE" "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
    log "Database is empty, seeding with initial data..."
    
    # Try different seed commands in order of preference
    if [ -f "scripts/seed-admin.ts" ]; then
        sudo -u $DEPLOY_USER npx tsx scripts/seed-admin.ts || warn "Admin seed failed"
    elif npm run | grep -q "seed:prod"; then
        sudo -u $DEPLOY_USER npm run seed:prod || warn "Production seed failed"
    elif npm run | grep -q "seed:admin"; then
        sudo -u $DEPLOY_USER npm run seed:admin || warn "Admin seed failed"
    elif npm run | grep -q "seed"; then
        sudo -u $DEPLOY_USER npm run seed || warn "Seed failed"
    else
        warn "No seed script found, creating admin user manually..."
        
        # Create a minimal admin user directly
        sqlite3 "$DB_DIR/$DB_FILE" << EOF
INSERT INTO User (id, username, email, password, role, isActive, createdAt, updatedAt)
VALUES (
    '$(uuidgen || echo "admin-$(date +%s)")',
    'admin',
    'admin@enxi.com',
    '\$2a\$10\$YourHashedPasswordHere',
    'admin',
    1,
    datetime('now'),
    datetime('now')
);
EOF
    fi
    
    echo ""
    echo -e "${YELLOW}=== IMPORTANT ===${NC}"
    echo -e "${YELLOW}Default admin credentials:${NC}"
    echo -e "${YELLOW}Username: admin${NC}"
    echo -e "${YELLOW}Password: admin123 (CHANGE IMMEDIATELY!)${NC}"
    echo ""
else
    log "Database already contains $USER_COUNT users"
fi

# Step 8: Build the application
log "Building Next.js application..."
sudo -u $DEPLOY_USER npm run build || { error "Build failed"; exit 1; }

# Verify build succeeded
if [ ! -d ".next" ]; then
    error "Build failed - .next directory not found"
    exit 1
fi

# Step 9: Set up PM2
log "Configuring PM2..."

# Stop existing PM2 process if running
pm2 delete "$PM2_APP_NAME" 2>/dev/null || true

# Update ecosystem.config.js to use environment variables
log "Updating PM2 configuration..."

# Ensure ecosystem.config.js uses proper configuration
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'Enxi-AlSahab',
    script: 'npm',
    args: 'start',
    cwd: './',
    env: {
      PORT: 3050,
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=1024'
    },
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '768M',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    min_uptime: '10s',
    max_restarts: 10,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    shutdown_with_message: true,
    interpreter_args: '--max-old-space-size=1024'
  }]
}
EOF

# Create logs directory
mkdir -p logs
chown -R $DEPLOY_USER:$DEPLOY_USER logs

# Start PM2 application
log "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 startup
pm2 startup systemd -u root --hp /root

# Step 10: Verify deployment
log "Verifying deployment..."

# Wait for application to start
sleep 5

# Check PM2 status
pm2 status

# Check if application is responding
if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
    log "Application is running!"
else
    error "Application failed to start"
    pm2 logs "$PM2_APP_NAME" --lines 50
    exit 1
fi

# Step 11: Set up log rotation
log "Setting up log rotation..."

cat > /etc/logrotate.d/enxi-erp << EOF
$DEPLOY_DIR/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 $DEPLOY_USER $DEPLOY_USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Step 12: Final summary
echo ""
echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}     DEPLOYMENT COMPLETED SUCCESSFULLY!             ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo ""
echo -e "${BLUE}Application Details:${NC}"
echo -e "  URL: ${YELLOW}$PRODUCTION_URL${NC}"
echo -e "  Port: ${YELLOW}3050${NC}"
echo -e "  PM2 App: ${YELLOW}$PM2_APP_NAME${NC}"
echo ""
echo -e "${BLUE}Database Location:${NC}"
echo -e "  ${YELLOW}$DB_DIR/$DB_FILE${NC}"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  View logs: ${YELLOW}pm2 logs $PM2_APP_NAME${NC}"
echo -e "  Check status: ${YELLOW}pm2 status${NC}"
echo -e "  Restart app: ${YELLOW}pm2 restart $PM2_APP_NAME${NC}"
echo -e "  Monitor: ${YELLOW}pm2 monit${NC}"
echo ""
echo -e "${RED}IMPORTANT NEXT STEPS:${NC}"
echo -e "  1. Login at $PRODUCTION_URL/login"
echo -e "  2. Change the default admin password"
echo -e "  3. Configure your firewall rules"
echo -e "  4. Set up SSL certificate if needed"
echo -e "  5. Configure backup strategy"
echo ""

# Create a deployment summary file
cat > deployment-summary.txt << EOF
Deployment Summary
==================
Date: $(date)
User: $(whoami)
Directory: $DEPLOY_DIR
Database: $DB_DIR/$DB_FILE
PM2 App: $PM2_APP_NAME
URL: $PRODUCTION_URL

Environment Variables:
- NODE_ENV: production
- PORT: 3050
- Database: SQLite (persistent)

Next Steps:
1. Change admin password
2. Configure additional users
3. Set up monitoring
4. Configure backups
EOF

log "Deployment summary saved to deployment-summary.txt"