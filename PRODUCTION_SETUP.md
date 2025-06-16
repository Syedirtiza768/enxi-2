# Production Server Setup Guide for Enxi ERP

## Prerequisites
- Ubuntu/Debian server
- Node.js 20+ installed
- PM2 process manager installed
- Git installed
- Nginx (optional, for reverse proxy)

## Initial Setup

### 1. Clone Repository
```bash
cd /var/www/html
sudo git clone https://github.com/Syedirtiza768/enxi-2.git
cd enxi-2
```

### 2. Create Required Directories
```bash
# Create all necessary directories
sudo mkdir -p public/uploads/logos
sudo mkdir -p public/uploads/pdfs
sudo mkdir -p temp/exports
sudo mkdir -p logs
sudo mkdir -p prisma
```

### 3. Set Directory Permissions
```bash
# Determine PM2 user
pm2 show 3 | grep "run as user" || echo "Running as: $(whoami)"

# Set permissions (replace 'ubuntu' with your PM2 user)
sudo chown -R ubuntu:ubuntu .
sudo chmod -R 755 public/uploads
sudo chmod -R 755 temp
sudo chmod -R 755 logs
sudo chmod -R 755 prisma
sudo chmod 600 .env
```

### 4. Environment Configuration
```bash
# Create .env file
sudo nano .env
```

Add the following content:
```env
# Database - SQLite for production
DATABASE_URL="file:./prisma/prod.db"

# Authentication
JWT_SECRET="$(openssl rand -base64 32)"

# Environment
NODE_ENV="production"

# Application
NEXT_PUBLIC_APP_URL="https://erp.alsahab.me"
PORT=3050

# File Upload Settings
MAX_FILE_SIZE="10485760"
UPLOAD_DIR="./public/uploads"
```

### 5. Install Dependencies
```bash
# Install production dependencies only
sudo npm install --production --legacy-peer-deps

# If bcrypt fails, use bcryptjs
sudo npm install bcryptjs
```

### 6. Database Setup
```bash
# Generate Prisma client
sudo npx prisma generate

# Create database schema
sudo npx prisma db push

# Set database permissions
sudo chmod 666 prisma/prod.db
```

### 7. Seed Initial Data
```bash
# Create admin user
sudo npm run seed:admin

# Or run full production seed
sudo npm run seed:production
```

### 8. Build Application
```bash
sudo npm run build
```

### 9. Start with PM2
```bash
# Start application
sudo pm2 start ecosystem.config.js --name "Enxi-AlSahab" --env production

# Save PM2 configuration
sudo pm2 save
sudo pm2 startup
```

## Directory Permission Summary

| Directory | Permission | Owner | Purpose |
|-----------|------------|-------|---------|
| `/prisma/` | 755 | app-user | SQLite database files |
| `/prisma/*.db` | 666 | app-user | Database write access |
| `/public/uploads/` | 755 | app-user | File uploads |
| `/public/uploads/logos/` | 755 | app-user | Company logos |
| `/public/uploads/pdfs/` | 755 | app-user | PDF uploads |
| `/temp/` | 755 | app-user | Temporary files |
| `/temp/exports/` | 755 | app-user | Export generation |
| `/logs/` | 755 | app-user | Application logs |
| `/.next/` | 755 | app-user | Build output |
| `/.env` | 600 | app-user | Environment vars |

## Troubleshooting

### Login 500 Error
```bash
# Check logs
pm2 logs --lines 50

# Run diagnostics
bash scripts/check-login-error.sh

# Quick fix
bash scripts/fix-login-simple.sh
```

### File Upload Issues
```bash
# Fix upload permissions
sudo chmod -R 775 public/uploads
sudo chown -R $(pm2 show 0 | grep user | awk '{print $4}'):$(pm2 show 0 | grep user | awk '{print $4}') public/uploads
```

### Database Read-Only Error
```bash
# Fix database permissions
sudo chmod 666 prisma/prod.db
sudo chown $(whoami):$(whoami) prisma/prod.db
```

## Maintenance

### Update Application
```bash
cd /var/www/html/enxi-2
sudo git pull origin main
sudo npm install --production --legacy-peer-deps
sudo npx prisma generate
sudo npx prisma db push
sudo npm run build
sudo pm2 restart all
```

### Backup Database
```bash
# Create backup
sudo cp prisma/prod.db backups/prod-$(date +%Y%m%d-%H%M%S).db
```

### Monitor Logs
```bash
# View PM2 logs
pm2 logs

# View specific process
pm2 logs 3

# Monitor in real-time
pm2 monit
```

### Clean Temporary Files
```bash
# Remove old export files
find temp/exports -type f -mtime +7 -delete

# Clean upload temp files
find public/uploads -name "*.tmp" -mtime +1 -delete
```

## Security Recommendations

1. **File Uploads**
   - Implement virus scanning
   - Validate file types strictly
   - Set maximum file size limits
   - Use separate storage for uploads

2. **Database**
   - Consider PostgreSQL/MySQL for production
   - Implement regular backups
   - Keep database file outside web root

3. **Environment**
   - Use strong JWT_SECRET
   - Enable HTTPS only
   - Implement rate limiting
   - Use WAF (Web Application Firewall)

4. **Monitoring**
   - Set up log rotation
   - Monitor disk space
   - Set up health checks
   - Implement error alerting

## Nginx Configuration (Optional)

```nginx
server {
    listen 80;
    server_name erp.alsahab.me;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.alsahab.me;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        alias /var/www/html/enxi-2/public/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Support Scripts

The following scripts are available in `/scripts/`:
- `check-login-error.sh` - Diagnose login issues
- `fix-login-simple.sh` - Fix common login problems
- `setup-sqlite-env.sh` - Setup SQLite environment
- `fix-production-login.sh` - Comprehensive login fix

Run any script with:
```bash
sudo bash scripts/[script-name].sh
```