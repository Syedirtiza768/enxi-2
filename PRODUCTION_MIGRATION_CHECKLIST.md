# Production Migration Checklist

## Pre-Migration Checklist

### 1. Environment Preparation
- [ ] Ensure you have SSH access to production server
- [ ] Verify sufficient disk space for backups
- [ ] Check current Node.js version matches requirements
- [ ] Confirm database access credentials

### 2. Code Preparation
- [ ] All code changes tested in development
- [ ] Schema changes tested with sample data
- [ ] Migration scripts reviewed by team
- [ ] Rollback plan documented

### 3. Backup Verification
- [ ] Database backup script tested
- [ ] Backup restoration process verified
- [ ] Backup storage location confirmed
- [ ] Retention policy defined

### 4. Communication
- [ ] Maintenance window scheduled
- [ ] Team notified of migration
- [ ] Users notified if downtime expected
- [ ] Support team on standby

## Migration Execution Checklist

### 1. Pre-Migration Steps
```bash
# Connect to production server
ssh production-server

# Navigate to project directory
cd /path/to/enxi-erp

# Check current branch and status
git status
git branch

# Create pre-migration backup
tsx scripts/migrate-production.ts --dry-run
```

### 2. Migration Steps
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run migration with backup
tsx scripts/migrate-production.ts

# Or for manual control:
# 1. Backup database
cp prisma/prisma/prod.db backups/prod-$(date +%Y%m%d-%H%M%S).db

# 2. Apply migrations
npx prisma migrate deploy

# 3. Generate client
npx prisma generate

# 4. Rebuild application
npm run build
```

### 3. Post-Migration Verification
- [ ] Check migration status: `npx prisma migrate status`
- [ ] Validate schema: `npx prisma validate`
- [ ] Test critical endpoints
- [ ] Verify data integrity
- [ ] Check application logs
- [ ] Monitor performance

### 4. Critical Endpoints to Test
```bash
# User authentication
curl -X POST http://localhost:3000/api/auth/validate

# Core data retrieval
curl http://localhost:3000/api/customers
curl http://localhost:3000/api/inventory/items
curl http://localhost:3000/api/quotations

# Transaction creation
# Test creating a quotation, invoice, etc.
```

## Rollback Checklist

### If Issues Detected:
1. [ ] Stop application server
2. [ ] Restore database from backup
3. [ ] Revert code changes
4. [ ] Restart application
5. [ ] Verify functionality
6. [ ] Document issues for resolution

### Rollback Commands:
```bash
# Stop application
pm2 stop enxi-erp

# Restore database
cp backups/prod-[timestamp].db prisma/prisma/prod.db

# Revert code
git revert HEAD
npm install
npm run build

# Restart application
pm2 restart enxi-erp
```

## Post-Migration Tasks

### 1. Monitoring (First 24 Hours)
- [ ] Check error logs every hour
- [ ] Monitor database performance
- [ ] Track user complaints
- [ ] Verify backup processes

### 2. Documentation
- [ ] Update migration log
- [ ] Document any issues encountered
- [ ] Record resolution steps
- [ ] Update runbook if needed

### 3. Cleanup
- [ ] Remove old backups (keep last 5)
- [ ] Clear temporary files
- [ ] Update deployment documentation

## Emergency Contacts

- Database Admin: [Contact]
- DevOps Lead: [Contact]
- On-Call Engineer: [Contact]
- Escalation: [Contact]

## Quick Reference Commands

```bash
# Check status
npx prisma migrate status

# Backup database
cp prisma/prisma/prod.db backups/prod-$(date +%Y%m%d-%H%M%S).db

# Apply migrations
npx prisma migrate deploy

# Generate client
npx prisma generate

# Build application
npm run build

# Check logs
pm2 logs enxi-erp --lines 100

# Restart application
pm2 restart enxi-erp
```

## Notes Section
_Use this space to record any specific observations or issues during migration_

Date: ________________
Performed by: ________________
Start time: ________________
End time: ________________
Status: ________________

Issues encountered:
1. ________________________________
2. ________________________________
3. ________________________________

Resolution steps:
1. ________________________________
2. ________________________________
3. ________________________________