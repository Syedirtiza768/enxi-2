#!/bin/bash

# Enxi ERP Multi-Instance Deployment Script
# This script deploys a new isolated instance of the Enxi ERP application

set -e

# Default values
BASE_DIR="/var/lib/enxi"
APP_SOURCE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BASE_PORT=3050
NGINX_SITES="/etc/nginx/sites-available"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to generate a random JWT secret
generate_jwt_secret() {
    openssl rand -base64 32
}

# Function to find next available port
find_next_port() {
    local port=$BASE_PORT
    while lsof -i :$port >/dev/null 2>&1 || ss -tuln | grep -q ":$port "; do
        ((port++))
    done
    echo $port
}

# Function to create instance directory structure
create_instance_structure() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    print_status "Creating directory structure for $instance_name..."
    
    # Create base directories
    mkdir -p "$instance_dir"/{database,logs,backups,config,uploads}
    mkdir -p "$instance_dir/app"
    
    # Copy application files
    print_status "Copying application files..."
    rsync -av --exclude="node_modules" \
              --exclude=".git" \
              --exclude="prisma/*.db" \
              --exclude=".env*" \
              --exclude="logs" \
              --exclude=".next" \
              --exclude="scripts/multi-instance" \
              "$APP_SOURCE_DIR/" "$instance_dir/app/"
    
    # Set proper permissions
    chmod -R 755 "$instance_dir"
    chmod 700 "$instance_dir/database"
    chmod 700 "$instance_dir/logs"
    chmod 755 "$instance_dir/uploads"
    
    print_status "Instance structure created at $instance_dir"
}

# Function to create instance-specific environment file
create_env_file() {
    local instance_name=$1
    local port=$2
    local domain=$3
    local company_name=$4
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    print_status "Creating environment configuration..."
    
    local jwt_secret=$(generate_jwt_secret)
    local nextauth_secret=$(generate_jwt_secret)
    
    cat > "$instance_dir/app/.env.production" <<EOF
# Instance Configuration
INSTANCE_NAME=$instance_name
COMPANY_NAME="$company_name"

# Database
DATABASE_URL="file:$instance_dir/database/enxi.db"

# Server Configuration
PORT=$port
NODE_ENV=production

# URLs
NEXTAUTH_URL=https://$domain
NEXT_PUBLIC_APP_URL=https://$domain

# Authentication
JWT_SECRET=$jwt_secret
NEXTAUTH_SECRET=$nextauth_secret

# Logging
LOG_DIR=$instance_dir/logs

# Application Settings
ADMIN_EMAIL=admin@$domain
ADMIN_PASSWORD=admin123
DEFAULT_CURRENCY=USD
DEFAULT_TIMEZONE=UTC

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600

# File uploads
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/*,application/pdf

# Email configuration (configure as needed)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@$domain

# Feature flags
ENABLE_MULTI_CURRENCY=true
ENABLE_INVENTORY_TRACKING=true
ENABLE_ADVANCED_REPORTING=true
EOF
    
    chmod 600 "$instance_dir/app/.env.production"
    print_status "Environment configuration created"
}

# Function to initialize database
initialize_database() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    print_status "Initializing database..."
    
    cd "$instance_dir/app"
    
    # Install dependencies
    npm install --production
    
    # Set database URL for this instance
    export DATABASE_URL="file:$instance_dir/database/enxi.db"
    
    # Initialize database
    npx prisma generate
    npx prisma migrate deploy
    
    # Create initial database with proper schema
    npx prisma db push
    
    print_status "Database initialized"
}

# Function to create PM2 configuration
create_pm2_config() {
    local instance_name=$1
    local port=$2
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    print_status "Creating PM2 configuration..."
    
    cat > "$instance_dir/config/ecosystem.config.js" <<EOF
module.exports = {
  apps: [{
    name: 'enxi-$instance_name',
    script: 'npm',
    args: 'start',
    cwd: '$instance_dir/app',
    env: {
      PORT: $port,
      NODE_ENV: 'production',
      DATABASE_URL: 'file:$instance_dir/database/enxi.db'
    },
    env_file: '$instance_dir/app/.env.production',
    error_file: '$instance_dir/logs/pm2-error.log',
    out_file: '$instance_dir/logs/pm2-out.log',
    log_file: '$instance_dir/logs/pm2-combined.log',
    time: true,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    kill_timeout: 5000,
    restart_delay: 4000
  }]
};
EOF
    
    print_status "PM2 configuration created"
}

# Function to create Nginx configuration
create_nginx_config() {
    local instance_name=$1
    local port=$2
    local domain=$3
    
    print_status "Creating Nginx configuration..."
    
    cat > "$NGINX_SITES/enxi-$instance_name" <<EOF
server {
    listen 80;
    server_name $domain;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $domain;
    
    # SSL Configuration (update with your certificates)
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Proxy configuration
    location / {
        proxy_pass http://localhost:$port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
    
    print_status "Nginx configuration created"
}

# Function to start the instance
start_instance() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    print_status "Starting instance..."
    
    cd "$instance_dir/app"
    
    # Set database URL for build
    export DATABASE_URL="file:$instance_dir/database/enxi.db"
    
    # Build the application
    npm run build
    
    # Start with PM2
    pm2 start "$instance_dir/config/ecosystem.config.js"
    pm2 save
    
    # Wait for the application to start
    sleep 5
    
    # Check if the instance is running
    if pm2 show enxi-$instance_name > /dev/null 2>&1; then
        print_status "Instance started successfully"
    else
        print_error "Failed to start instance"
        exit 1
    fi
}

# Main deployment function
deploy_instance() {
    print_status "Enxi ERP Multi-Instance Deployment"
    echo "===================================="
    
    # Get instance details
    read -p "Enter instance name (e.g., company1): " instance_name
    read -p "Enter domain (e.g., company1.yourdomain.com): " domain
    read -p "Enter company name: " company_name
    
    # Validate inputs
    if [[ -z "$instance_name" || -z "$domain" || -z "$company_name" ]]; then
        print_error "All fields are required!"
        exit 1
    fi
    
    # Check if instance already exists
    if [ -d "$BASE_DIR/instances/$instance_name" ]; then
        print_error "Instance $instance_name already exists!"
        exit 1
    fi
    
    # Find available port
    port=$(find_next_port)
    print_status "Using port: $port"
    
    # Create instance
    create_instance_structure "$instance_name"
    create_env_file "$instance_name" "$port" "$domain" "$company_name"
    initialize_database "$instance_name"
    create_pm2_config "$instance_name" "$port"
    create_nginx_config "$instance_name" "$port" "$domain"
    
    # Enable Nginx site
    ln -s "$NGINX_SITES/enxi-$instance_name" "/etc/nginx/sites-enabled/"
    nginx -t && systemctl reload nginx
    
    # Start instance
    start_instance "$instance_name"
    
    print_status "Deployment complete!"
    echo ""
    echo "Instance Details:"
    echo "=================="
    echo "Name: $instance_name"
    echo "Domain: https://$domain"
    echo "Port: $port"
    echo "Directory: $BASE_DIR/instances/$instance_name"
    echo ""
    echo "Next steps:"
    echo "1. Set up SSL certificate: certbot --nginx -d $domain"
    echo "2. Configure DNS to point $domain to this server"
    echo "3. Access the application at https://$domain"
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    # Check for required commands
    for cmd in node npm pm2 nginx rsync lsof; do
        if ! command -v $cmd &> /dev/null; then
            missing_deps+=($cmd)
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_error "Please install the missing dependencies and try again"
        exit 1
    fi
    
    # Check if PM2 is installed globally
    if ! npm list -g pm2 &> /dev/null; then
        print_warning "PM2 not found globally, installing..."
        npm install -g pm2
    fi
    
    print_status "All dependencies are available"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Check dependencies first
check_dependencies

# Run deployment
deploy_instance