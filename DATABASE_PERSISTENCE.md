# SQLite Database Persistence Guide

This guide explains how to ensure your SQLite database persists across application rebuilds and deployments.

## Quick Start

Run the persistence setup script:

```bash
# For user-local setup (recommended for development)
./scripts/setup-persistent-db.sh

# For system-wide setup (requires root, recommended for production)
sudo ./scripts/setup-persistent-db.sh
```

## What the Setup Does

1. **Creates a persistent directory** outside your application directory
2. **Moves your database** to this persistent location
3. **Creates a symlink** from your app to the persistent database
4. **Sets up backup scripts** for data protection
5. **Configures your environment** for the new database path

## Persistence Options

### Option 1: Local Directory (Development)
- Database stored at: `~/.enxi/database/enxi.db`
- Survives application updates and rebuilds
- User-specific, no special permissions needed

### Option 2: System Directory (Production)
- Database stored at: `/var/lib/enxi/database/enxi.db`
- Requires root access to set up
- Shared across all users
- Professional production setup

### Option 3: Docker Volumes
Use the provided Docker Compose configuration:

```bash
docker-compose -f docker-compose.persistent.yml up -d
```

This creates a named volume that persists across container rebuilds.

## Manual Setup

If you prefer to set up persistence manually:

1. **Create a persistent directory:**
   ```bash
   mkdir -p ~/enxi-data
   ```

2. **Move your database:**
   ```bash
   mv ./prisma/prisma/dev.db ~/enxi-data/enxi.db
   ```

3. **Create a symlink:**
   ```bash
   ln -s ~/enxi-data/enxi.db ./prisma/prod.db
   ```

4. **Update your .env file:**
   ```env
   DATABASE_URL="file:./prisma/prod.db"
   ```

## Backup Strategy

The setup script creates a backup script at `scripts/backup-database.sh`. 

### Manual Backups
```bash
./scripts/backup-database.sh
```

### Automatic Backups
- **System-wide setup**: Automatically configured with systemd (daily)
- **User setup**: Add to crontab:
  ```bash
  # Daily backup at 2 AM
  0 2 * * * /path/to/enxi/scripts/backup-database.sh
  ```

## Important Notes

1. **Always backup your database** before major updates
2. **Test the persistence** by rebuilding your application
3. **Monitor disk space** as the database grows
4. **Consider migration** to PostgreSQL/MySQL for large-scale production use

## Troubleshooting

### Database Not Found
If your app can't find the database after setup:
1. Check the symlink: `ls -la ./prisma/prod.db`
2. Verify permissions: `ls -la ~/enxi-data/enxi.db`
3. Ensure .env is updated with the correct path

### Permission Denied
For production setup, ensure proper permissions:
```bash
chmod 666 /var/lib/enxi/database/enxi.db
```

### Migration Issues
After setting up persistence, run migrations:
```bash
npm run db:push
# or
npx prisma db push
```