# PM2 Production Setup Complete

## Status
The Enxi ERP application is now running in production mode with PM2.

## Access Information
- **URL**: http://localhost:3000
- **PM2 Process Name**: enxi-erp
- **Process ID**: 0
- **Port**: 3000

## PM2 Commands

### Check Status
```bash
pm2 status
```

### View Logs
```bash
# View all logs
pm2 logs enxi-erp

# View last 50 lines
pm2 logs enxi-erp --lines 50

# Real-time logs
pm2 logs enxi-erp -f
```

### Restart Application
```bash
pm2 restart enxi-erp
```

### Stop Application
```bash
pm2 stop enxi-erp
```

### Delete Process
```bash
pm2 delete enxi-erp
```

### Monitor Resources
```bash
pm2 monit
```

## Configuration
- **Config File**: `ecosystem.config.js`
- **Log Directory**: `./logs/`
- **Database**: SQLite at `/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/prisma/prisma/dev.db`

## Auto-Start on Boot
PM2 has been configured to automatically start the application on system boot.

## Login Credentials
- **Username**: admin
- **Password**: DieselUAE2024!

## Notes
- The application is running in production mode
- Logs are saved in the `logs/` directory
- Database permissions have been set correctly
- The process will automatically restart if it crashes