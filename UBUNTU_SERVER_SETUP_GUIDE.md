# Ubuntu Server Setup Guide for Enxi ERP

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Prerequisites Installation](#prerequisites-installation)
3. [Application Setup](#application-setup)
4. [Database Configuration](#database-configuration)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Production Deployment](#production-deployment)
8. [Nginx Configuration](#nginx-configuration)
9. [SSL Certificate Setup](#ssl-certificate-setup)
10. [Process Management](#process-management)
11. [Monitoring and Logs](#monitoring-and-logs)
12. [Backup Strategy](#backup-strategy)
13. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements
- Ubuntu 20.04 LTS or 22.04 LTS
- 2 CPU cores
- 4GB RAM (8GB recommended)
- 20GB disk space
- Node.js 20.x or higher
- Git

### Recommended Production Requirements
- Ubuntu 22.04 LTS
- 4+ CPU cores
- 8GB+ RAM
- 50GB+ SSD storage
- PostgreSQL 14+ (for production)
- Redis 6+ (for caching)
- Nginx (for reverse proxy)

## Prerequisites Installation

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### 2. Install Node.js 20.x
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PostgreSQL (Optional - for production)
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE enxi_erp;
CREATE USER enxi_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE enxi_erp TO enxi_user;
EOF
```

### 4. Install Redis (Optional - for caching)
```bash
sudo apt install -y redis-server

# Configure Redis
sudo sed -i 's/supervised no/supervised systemd/g' /etc/redis/redis.conf
sudo systemctl restart redis
sudo systemctl enable redis
```

### 5. Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6. Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

## Application Setup

### 1. Create Application User (Recommended for production)
```bash
# Create a dedicated user for the application
sudo adduser --system --group --home /var/www/enxi-app enxi-app

# Add current user to the enxi-app group for easier management
sudo usermod -a -G enxi-app $USER
```

### 2. Clone Repository
```bash
# Create application directory
sudo mkdir -p /var/www/html
cd /var/www/html

# Clone repository
sudo git clone https://github.com/Syedirtiza768/enxi-2.git
cd enxi-2

# Set proper permissions
sudo chown -R enxi-app:enxi-app /var/www/html/enxi-2
```

### 3. Install Dependencies
```bash
# Switch to application directory
cd /var/www/html/enxi-2

# Install dependencies
sudo -u enxi-app npm install

# Install development dependencies if needed
sudo -u enxi-app npm install --include=dev
```

## Database Configuration

### For SQLite (Default/Development)
```bash
# Create database directory
sudo -u enxi-app mkdir -p /var/www/html/enxi-2/prisma

# Set permissions
sudo chmod 755 /var/www/html/enxi-2/prisma
```

### For PostgreSQL (Production)
```bash
# Test connection
psql -h localhost -U enxi_user -d enxi_erp -c "SELECT version();"
```

## Environment Configuration

### 1. Create Environment File
```bash
cd /var/www/html/enxi-2
sudo -u enxi-app cp .env.example .env
sudo -u enxi-app nano .env
```

### 2. Configure Environment Variables
```env
# Database Configuration
# For SQLite (Development)
DATABASE_URL="file:./dev.db"

# For PostgreSQL (Production)
# DATABASE_URL="postgresql://enxi_user:your_secure_password@localhost:5432/enxi_erp"

# Authentication
JWT_SECRET="generate-a-secure-random-string-here"

# Application
NODE_ENV="production"
PORT=3000

# Redis Configuration (if using)
REDIS_URL="redis://localhost:6379"

# Email Configuration (if needed)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Frontend URL
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### 3. Generate Secure JWT Secret
```bash
# Generate a secure random string
openssl rand -base64 64
```

## Running the Application

### 1. Database Setup
```bash
cd /var/www/html/enxi-2

# Generate Prisma client
sudo -u enxi-app npx prisma generate

# Push database schema
sudo -u enxi-app npx prisma db push

# Seed database (optional)
sudo -u enxi-app npm run seed
```

### 2. Build Application
```bash
# Build Next.js application
sudo -u enxi-app npm run build
```

### 3. Development Mode
```bash
# Run in development mode (not recommended for production)
sudo -u enxi-app npm run dev
```

### 4. Production Mode
```bash
# Start application
sudo -u enxi-app npm start
```

## Production Deployment

### 1. Create PM2 Ecosystem File
```bash
sudo -u enxi-app nano /var/www/html/enxi-2/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'enxi-erp',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/html/enxi-2',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/enxi-erp/error.log',
    out_file: '/var/log/enxi-erp/out.log',
    log_file: '/var/log/enxi-erp/combined.log',
    time: true
  }]
};
```

### 2. Create Log Directory
```bash
sudo mkdir -p /var/log/enxi-erp
sudo chown -R enxi-app:enxi-app /var/log/enxi-erp
```

### 3. Start with PM2
```bash
# Start application
sudo -u enxi-app pm2 start ecosystem.config.js

# Save PM2 configuration
sudo -u enxi-app pm2 save

# Setup PM2 startup script
sudo pm2 startup systemd -u enxi-app --hp /var/www/enxi-app
```

## Nginx Configuration

### 1. Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/enxi-erp
```

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Logs
    access_log /var/log/nginx/enxi-erp.access.log;
    error_log /var/log/nginx/enxi-erp.error.log;

    # Proxy Configuration
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600";
    }

    # API Rate Limiting
    location /api {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # File upload limits
    client_max_body_size 10M;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

### 2. Enable Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/enxi-erp /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## SSL Certificate Setup

### 1. Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 3. Auto-renewal Setup
```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
sudo crontab -e
# Add this line:
0 2 * * * /usr/bin/certbot renew --quiet
```

## Process Management

### PM2 Commands
```bash
# View application status
sudo -u enxi-app pm2 status

# View logs
sudo -u enxi-app pm2 logs enxi-erp

# Restart application
sudo -u enxi-app pm2 restart enxi-erp

# Stop application
sudo -u enxi-app pm2 stop enxi-erp

# Monitor resources
sudo -u enxi-app pm2 monit
```

### Log Rotation
```bash
# Install PM2 log rotation
sudo -u enxi-app pm2 install pm2-logrotate

# Configure log rotation
sudo -u enxi-app pm2 set pm2-logrotate:max_size 10M
sudo -u enxi-app pm2 set pm2-logrotate:retain 7
sudo -u enxi-app pm2 set pm2-logrotate:compress true
```

## Monitoring and Logs

### 1. Application Logs
```bash
# PM2 logs
sudo -u enxi-app pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/enxi-erp.access.log
sudo tail -f /var/log/nginx/enxi-erp.error.log

# System logs
sudo journalctl -u nginx
sudo journalctl -u postgresql
sudo journalctl -u redis
```

### 2. System Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor system resources
htop
iotop
nethogs
```

### 3. Database Monitoring
```bash
# PostgreSQL connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Database size
sudo -u postgres psql -c "SELECT pg_database_size('enxi_erp');"
```

## Backup Strategy

### 1. Database Backup Script
```bash
sudo nano /usr/local/bin/backup-enxi-erp.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/enxi-erp"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="$BACKUP_DIR/database_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# For SQLite
if [ -f "/var/www/html/enxi-2/prisma/dev.db" ]; then
    cp /var/www/html/enxi-2/prisma/dev.db "$BACKUP_DIR/database_$DATE.db"
fi

# For PostgreSQL
# pg_dump -U enxi_user -h localhost enxi_erp > $DB_FILE

# Compress backup
gzip $DB_FILE

# Remove backups older than 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

# Sync to remote storage (optional)
# aws s3 sync $BACKUP_DIR s3://your-backup-bucket/enxi-erp/
```

### 2. Setup Backup Cron
```bash
# Make script executable
sudo chmod +x /usr/local/bin/backup-enxi-erp.sh

# Add to crontab
sudo crontab -e
# Add this line for daily backups at 2 AM:
0 2 * * * /usr/local/bin/backup-enxi-erp.sh
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
sudo -u enxi-app pm2 logs enxi-erp --lines 100

# Check port availability
sudo lsof -i :3000

# Check Node.js version
node --version
```

#### 2. Database Connection Issues
```bash
# Test database connection
# For PostgreSQL
psql -h localhost -U enxi_user -d enxi_erp

# Check database service
sudo systemctl status postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### 3. Permission Issues
```bash
# Fix ownership
sudo chown -R enxi-app:enxi-app /var/www/html/enxi-2

# Fix permissions
sudo chmod -R 755 /var/www/html/enxi-2
```

#### 4. Memory Issues
```bash
# Check memory usage
free -h

# Add swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### 5. SSL Certificate Issues
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### Performance Optimization

#### 1. Node.js Optimization
```bash
# Set Node.js memory limit in ecosystem.config.js
env: {
  NODE_OPTIONS: '--max-old-space-size=4096'
}
```

#### 2. PostgreSQL Tuning
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf

# Recommended settings for 8GB RAM:
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 20MB
```

#### 3. Redis Configuration
```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Recommended settings:
maxmemory 1gb
maxmemory-policy allkeys-lru
```

### Security Hardening

#### 1. Firewall Setup
```bash
# Install UFW
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### 2. Fail2ban Installation
```bash
# Install fail2ban
sudo apt install -y fail2ban

# Configure for Nginx
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true

[nginx-noproxy]
enabled = true
```

### Maintenance

#### Regular Tasks
1. **Weekly**: Check logs, monitor disk space
2. **Monthly**: Update system packages, review security logs
3. **Quarterly**: Update Node.js dependencies, review backup strategy

#### Update Procedure
```bash
# Backup before updating
/usr/local/bin/backup-enxi-erp.sh

# Update application
cd /var/www/html/enxi-2
sudo -u enxi-app git pull origin main
sudo -u enxi-app npm install
sudo -u enxi-app npm run build
sudo -u enxi-app pm2 restart enxi-erp

# Update system
sudo apt update && sudo apt upgrade -y
```

## Support and Resources

### Useful Commands Reference
```bash
# Application management
pm2 status              # Check app status
pm2 logs               # View logs
pm2 restart all        # Restart all apps
pm2 save              # Save current process list

# System monitoring
htop                  # Interactive process viewer
df -h                 # Disk usage
free -h               # Memory usage
netstat -tulpn        # Network connections

# Service management
systemctl status nginx
systemctl status postgresql
systemctl status redis

# Log viewing
journalctl -xe        # System logs
tail -f /var/log/syslog  # System log tail
```

### Additional Resources
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)

---

This guide should help you deploy and maintain the Enxi ERP application on Ubuntu server. Adjust configurations based on your specific requirements and server specifications.