# Production Database Protection Guide

This guide provides comprehensive strategies to protect your production database after the initial seed.

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Backup Strategy](#backup-strategy)
3. [Migration Safety](#migration-safety)
4. [Access Control](#access-control)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Disaster Recovery](#disaster-recovery)
7. [Best Practices](#best-practices)

## Initial Setup

### 1. Environment Configuration

After your first production seed, immediately:

1. Copy `.env.production.template` to `.env.production`
2. Set strong, unique values for all secrets
3. Set protection flags:
   ```bash
   ALLOW_PRODUCTION_MIGRATION=false
   ALLOW_PRODUCTION_RESTORE=false
   ```

### 2. Database User Permissions

Create separate database users with minimal required permissions:

```sql
-- Application user (limited permissions)
CREATE USER enxi_app WITH PASSWORD 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES TO enxi_app;

-- Read-only user for reporting
CREATE USER enxi_readonly WITH PASSWORD 'another_strong_password';
GRANT SELECT ON ALL TABLES TO enxi_readonly;

-- Revoke dangerous permissions
REVOKE CREATE, DROP, ALTER ON ALL TABLES FROM enxi_app;
```

### 3. Initial Backup

Immediately after seeding, create your first backup:

```bash
npx tsx scripts/backup-database.ts backup
```

## Backup Strategy

### Automated Backups

We've created `scripts/backup-database.ts` that provides:

- **Full backups** with complete data
- **Compression** to save storage space
- **Encryption** for security
- **Automatic rotation** to manage storage

### Backup Schedule

Set up automated backups using cron:

```bash
# Edit crontab
crontab -e

# Add these entries:
# Daily backup at 2 AM
0 2 * * * cd /path/to/enxi-erp && npx tsx scripts/backup-database.ts backup

# Weekly backup on Sunday at 3 AM (kept for 4 weeks)
0 3 * * 0 cd /path/to/enxi-erp && npx tsx scripts/backup-database.ts backup

# Monthly backup on 1st (kept for 12 months)
0 4 1 * * cd /path/to/enxi-erp && npx tsx scripts/backup-database.ts backup
```

### Backup Verification

Regularly test your backups:

```bash
# Test restore to a temporary database
DATABASE_URL="postgresql://user:pass@localhost:5432/test_restore" \
npx tsx scripts/backup-database.ts restore backup-full-2024-01-01.sql.gz.enc
```

## Migration Safety

### Safe Migration Process

Use `scripts/safe-migrate.ts` for all production migrations:

```bash
# Dry run first
npx tsx scripts/safe-migrate.ts --dry-run

# Apply with automatic backup
ALLOW_PRODUCTION_MIGRATION=true npx tsx scripts/safe-migrate.ts

# Skip backup if you've already created one
npx tsx scripts/safe-migrate.ts --skip-backup
```

### Migration Checklist

Before any production migration:

1. ✅ Review migration SQL thoroughly
2. ✅ Test on staging environment
3. ✅ Create manual backup
4. ✅ Schedule during low-traffic period
5. ✅ Have rollback plan ready
6. ✅ Monitor after deployment

## Access Control

### Database Connection Limits

Configure in your database:

**PostgreSQL:**
```sql
ALTER DATABASE enxi_production SET max_connections = 100;
ALTER USER enxi_app CONNECTION LIMIT 20;
```

**MySQL:**
```sql
ALTER USER 'enxi_app'@'localhost' WITH MAX_USER_CONNECTIONS 20;
```

### Network Security

1. **Use SSL/TLS** for all database connections
2. **Restrict IP addresses** that can connect
3. **Use VPN** for remote access
4. **Enable firewall** rules

### Application-Level Security

1. Use **connection pooling** with limits:
   ```javascript
   // In your Prisma configuration
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     connectionLimit = 10
   }
   ```

2. Implement **query timeouts**:
   ```javascript
   // Set statement timeout
   await prisma.$executeRaw`SET statement_timeout = '5min'`;
   ```

## Monitoring & Alerts

### Database Monitoring Script

Run the monitoring script we created:

```bash
./scripts/setup-database-security.sh
# Then run the generated monitor script
/tmp/monitor-database-security.sh
```

### Key Metrics to Monitor

1. **Connection count** - Alert if > 80% of max
2. **Long-running queries** - Alert if > 5 minutes
3. **Failed login attempts** - Alert on repeated failures
4. **Disk space** - Alert if < 20% free
5. **Replication lag** (if using replication)

### Logging

Enable comprehensive logging:

**PostgreSQL:**
```ini
log_connections = on
log_disconnections = on
log_statement = 'mod'
log_min_duration_statement = 1000  # Log queries > 1 second
```

## Disaster Recovery

### Recovery Plan

1. **Immediate Response**
   - Assess the damage
   - Stop the application if necessary
   - Notify stakeholders

2. **Recovery Steps**
   ```bash
   # 1. Find latest backup
   ls -la backups/
   
   # 2. Restore to new database
   DATABASE_URL="postgresql://user:pass@localhost:5432/enxi_recovery" \
   npx tsx scripts/backup-database.ts restore backup-full-LATEST.sql.gz.enc
   
   # 3. Verify data integrity
   npx tsx scripts/verify-database-integrity.ts
   
   # 4. Switch application to recovered database
   ```

3. **Post-Recovery**
   - Analyze root cause
   - Update procedures
   - Test recovery process

### High Availability Setup

Consider implementing:

1. **Database Replication**
   - Primary-secondary setup
   - Automatic failover
   - Read replicas for scaling

2. **Point-in-Time Recovery**
   - Enable WAL archiving (PostgreSQL)
   - Binary logs (MySQL)

## Best Practices

### Do's ✅

1. **Regular Backups**
   - Automate daily backups
   - Test restore process monthly
   - Store backups off-site

2. **Access Control**
   - Use principle of least privilege
   - Rotate passwords quarterly
   - Use strong passwords (20+ characters)

3. **Monitoring**
   - Set up alerts for anomalies
   - Review logs weekly
   - Track database growth

4. **Updates**
   - Keep database software updated
   - Apply security patches promptly
   - Test updates in staging first

### Don'ts ❌

1. **Never**
   - Run untested migrations in production
   - Share database credentials
   - Disable backups "temporarily"
   - Ignore security alerts

2. **Avoid**
   - Using root/superuser for application
   - Storing backups on same server
   - Postponing security updates
   - Manual database modifications

## Emergency Contacts

Set up your emergency response team:

```bash
# Add to .env.production
EMERGENCY_EMAIL="oncall@company.com"
EMERGENCY_PHONE="+1-555-0123"
BACKUP_NOTIFICATION_EMAIL="alerts@company.com"
```

## Compliance & Auditing

1. **Audit Trails**
   - Enable database audit logging
   - Track all data modifications
   - Review audit logs regularly

2. **Compliance**
   - Follow GDPR/CCPA for data protection
   - Implement data retention policies
   - Document all procedures

## Quick Reference

### Daily Tasks
- [ ] Check backup completion
- [ ] Review error logs
- [ ] Monitor disk space

### Weekly Tasks
- [ ] Test backup restore
- [ ] Review access logs
- [ ] Check for updates

### Monthly Tasks
- [ ] Full security audit
- [ ] Update documentation
- [ ] Review and rotate credentials

### Quarterly Tasks
- [ ] Disaster recovery drill
- [ ] Performance optimization
- [ ] Security training

## Support

For additional help:
1. Review logs in `/logs` directory
2. Check monitoring dashboards
3. Contact database administrator
4. Escalate to security team if needed

Remember: **Data protection is not a one-time task but an ongoing responsibility.**