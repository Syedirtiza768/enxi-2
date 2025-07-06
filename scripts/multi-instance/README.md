# Enxi ERP Multi-Instance Deployment

This directory contains scripts to deploy and manage multiple isolated instances of the Enxi ERP application. Each instance runs with its own database, configuration, and domain/subdomain.

## 📋 Overview

The multi-instance setup allows you to:
- Deploy multiple isolated ERP instances on a single server
- Each instance has its own database, configuration, and domain
- Centralized management and monitoring
- Automated backup and restore capabilities
- Load balancing and health monitoring

## 🚀 Quick Start

### 1. Deploy a New Instance

```bash
# Deploy a new instance interactively
sudo ./deploy-instance.sh

# You'll be prompted for:
# - Instance name (e.g., company1)
# - Domain (e.g., company1.yourdomain.com)
# - Company name (e.g., Company One Ltd)
```

### 2. Manage Instances

```bash
# List all instances
./manage-instances.sh list

# Start an instance
./manage-instances.sh start company1

# Stop an instance
./manage-instances.sh stop company1

# Restart an instance
./manage-instances.sh restart company1

# View instance status
./manage-instances.sh status company1

# View instance logs
./manage-instances.sh logs company1

# Update an instance
./manage-instances.sh update company1

# Delete an instance (with backup)
./manage-instances.sh delete company1
```

### 3. Backup and Restore

```bash
# Backup a specific instance
./backup-instances.sh backup company1

# Backup all instances
./backup-instances.sh backup-all

# List available backups
./backup-instances.sh list company1

# Restore from backup
./backup-instances.sh restore company1 /var/backups/enxi/company1/20231201_120000.tar.gz

# Clean up old backups
./backup-instances.sh cleanup
```

### 4. Monitor Instances

```bash
# View dashboard
./monitor-instances.sh dashboard

# Watch dashboard with auto-refresh
./monitor-instances.sh watch

# Generate JSON report
./monitor-instances.sh json /tmp/report.json

# Check for alerts
./monitor-instances.sh alerts
```

## 📁 Directory Structure

After deployment, each instance will have the following structure:

```
/var/lib/enxi/
├── instances/
│   ├── company1/
│   │   ├── app/                 # Application files
│   │   ├── database/            # SQLite database
│   │   │   └── enxi.db
│   │   ├── logs/                # PM2 logs
│   │   ├── config/              # PM2 configuration
│   │   └── backups/             # Local backups
│   ├── company2/
│   │   └── ...
│   └── company3/
│       └── ...
└── deleted-instances/           # Backups of deleted instances
```

## 🔧 Configuration

### Environment Variables

Each instance has its own `.env.production` file:

```env
# Instance Configuration
INSTANCE_NAME=company1
COMPANY_NAME="Company One Ltd"

# Database
DATABASE_URL="file:/var/lib/enxi/instances/company1/database/enxi.db"

# Server Configuration
PORT=3051
NODE_ENV=production

# URLs
NEXTAUTH_URL=https://company1.yourdomain.com
NEXT_PUBLIC_APP_URL=https://company1.yourdomain.com

# Authentication
JWT_SECRET=unique-secret-per-instance
NEXTAUTH_SECRET=unique-secret-per-instance
```

### PM2 Configuration

Each instance has its own PM2 configuration:

```javascript
// /var/lib/enxi/instances/company1/config/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'enxi-company1',
    script: 'npm',
    args: 'start',
    cwd: '/var/lib/enxi/instances/company1/app',
    env: {
      PORT: 3051,
      NODE_ENV: 'production'
    },
    // ... other PM2 settings
  }]
};
```

## 🌐 Nginx Configuration

### Subdomain Setup (Recommended)

Each instance gets its own subdomain:

```nginx
# company1.yourdomain.com → localhost:3051
# company2.yourdomain.com → localhost:3052
# company3.yourdomain.com → localhost:3053
```

Generate nginx configuration:

```bash
# Generate subdomain config
./nginx-config-generator.sh subdomain company1 3051 company1.yourdomain.com true

# Enable the site
sudo ln -s /etc/nginx/sites-available/enxi-company1 /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d company1.yourdomain.com
```

### Path-Based Setup

All instances under one domain:

```nginx
# yourdomain.com/company1 → localhost:3051
# yourdomain.com/company2 → localhost:3052
```

Generate path-based configuration:

```bash
./nginx-config-generator.sh path yourdomain.com company1:3051 company2:3052
```

### Load Balancer Setup

Distribute traffic across instances:

```bash
./nginx-config-generator.sh loadbalancer yourdomain.com instance1:3051 instance2:3052
```

## 🔒 Security Considerations

### Instance Isolation

- Each instance has its own database file
- Separate JWT and NextAuth secrets
- Isolated file permissions
- Individual SSL certificates

### Database Security

- SQLite files are stored with restricted permissions (600)
- Database files are backed up regularly
- No shared database connections between instances

### Network Security

- Each instance runs on a unique port
- Nginx handles SSL termination
- Rate limiting per instance
- Security headers configured

## 🔄 Backup Strategy

### Automated Backups

Set up automated backups with cron:

```bash
# Add to crontab
0 2 * * * /path/to/backup-instances.sh backup-all
0 3 * * 0 /path/to/backup-instances.sh cleanup
```

### Backup Contents

Each backup includes:
- Database file (SQLite)
- Configuration files
- Recent logs (last 7 days)
- Custom uploads (if any)

### Retention Policy

- Default: 30 days retention
- Configurable via `RETENTION_DAYS` variable
- Automatic cleanup of old backups

## 📊 Monitoring

### Dashboard Features

- Real-time instance status
- Resource usage (CPU, memory)
- Health check results
- Error count tracking
- System resource overview

### Alerting

- Instance down alerts
- Health check failures
- High error rate alerts
- Resource usage alerts

### Logging

- Centralized logging via PM2
- Separate log files per instance
- Log rotation and cleanup
- Syslog integration

## 🛠️ Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :3051
   
   # Kill the process if needed
   sudo kill -9 <PID>
   ```

2. **Database Lock Error**
   ```bash
   # Check database permissions
   ls -la /var/lib/enxi/instances/company1/database/
   
   # Fix permissions if needed
   sudo chown -R $USER:$USER /var/lib/enxi/instances/company1/
   ```

3. **SSL Certificate Issues**
   ```bash
   # Renew certificates
   sudo certbot renew
   
   # Check certificate status
   sudo certbot certificates
   ```

4. **Instance Won't Start**
   ```bash
   # Check logs
   ./manage-instances.sh logs company1
   
   # Check PM2 status
   pm2 list
   pm2 show enxi-company1
   ```

### Log Locations

- PM2 logs: `/var/lib/enxi/instances/<instance>/logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`

## 📝 Best Practices

### Deployment

1. Always test deployment on a staging environment first
2. Use meaningful instance names (company names, not generic numbers)
3. Keep DNS records updated for new instances
4. Monitor resource usage after adding instances

### Maintenance

1. Regular backups before updates
2. Update instances during maintenance windows
3. Monitor logs for errors after updates
4. Keep SSL certificates up to date

### Scaling

1. Monitor server resources before adding instances
2. Consider horizontal scaling (multiple servers) for high loads
3. Use load balancing for high-availability setups
4. Implement health checks for automated failover

## 🔗 Additional Resources

- [Enxi ERP Documentation](../../../README.md)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt SSL](https://letsencrypt.org/)

## 🆘 Support

If you encounter issues:

1. Check the logs first
2. Verify nginx configuration
3. Check PM2 process status
4. Ensure DNS is properly configured
5. Verify SSL certificates are valid

For additional support, check the main project documentation or raise an issue in the project repository.