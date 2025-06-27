# Production Database Migration Guide

## Overview
This guide outlines the safe process for applying schema changes to your production database while preserving all existing data.

## Key Principles
1. **Always backup before migrating**
2. **Test migrations in staging first**
3. **Use Prisma's migration tools properly**
4. **Have a rollback plan**

## Step-by-Step Migration Process

### 1. Backup Production Database
```bash
# Create a timestamped backup
cp prisma/prisma/prod.db prisma/prisma/prod.db.backup-$(date +%Y%m%d-%H%M%S)

# Or for PostgreSQL/MySQL
# pg_dump production_db > backup-$(date +%Y%m%d-%H%M%S).sql
# mysqldump production_db > backup-$(date +%Y%m%d-%H%M%S).sql
```

### 2. Pull Latest Changes
```bash
# On production server
git pull origin main
npm install  # Install any new dependencies
```

### 3. Generate Prisma Migration
```bash
# Generate migration SQL to review
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script > migration.sql

# Review the migration SQL
cat migration.sql
```

### 4. Apply Migrations Safely

#### Option A: Using Prisma Migrate (Recommended for Development)
```bash
# This will apply all pending migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

#### Option B: Manual Migration (Recommended for Production)
```bash
# 1. Create migration without applying
npx prisma migrate dev --create-only

# 2. Review the migration file in prisma/migrations/

# 3. Apply migration manually
npx prisma db execute --file ./prisma/migrations/[migration_folder]/migration.sql

# 4. Mark migration as applied
npx prisma migrate resolve --applied [migration_name]

# 5. Generate Prisma Client
npx prisma generate
```

### 5. Verify Migration
```bash
# Check migration status
npx prisma migrate status

# Validate schema
npx prisma validate
```

### 6. Test Application
```bash
# Run basic health checks
npm run test:production

# Or manually test critical features
```

## Common Schema Changes and Their Impact

### Safe Changes (No Data Loss)
- Adding new tables
- Adding nullable columns
- Adding indexes
- Removing unused indexes

### Potentially Risky Changes
- Adding non-nullable columns (need default values)
- Changing column types
- Renaming columns/tables
- Adding unique constraints

### High-Risk Changes
- Removing columns/tables
- Changing primary keys
- Modifying relationships

## Migration Scripts for Common Scenarios

### Adding Non-Nullable Column with Default
```sql
-- Add column as nullable first
ALTER TABLE "User" ADD COLUMN "status" TEXT;

-- Set default values for existing rows
UPDATE "User" SET "status" = 'active' WHERE "status" IS NULL;

-- Make column non-nullable
ALTER TABLE "User" ALTER COLUMN "status" SET NOT NULL;
```

### Renaming Column Safely
```sql
-- Add new column
ALTER TABLE "Product" ADD COLUMN "itemCode" TEXT;

-- Copy data
UPDATE "Product" SET "itemCode" = "productCode";

-- After verifying, drop old column
ALTER TABLE "Product" DROP COLUMN "productCode";
```

## Rollback Procedures

### Quick Rollback
```bash
# Restore from backup
cp prisma/prisma/prod.db.backup-[timestamp] prisma/prisma/prod.db

# Revert code
git revert HEAD
npm install
npm run build
```

### Migration Rollback
```bash
# Create down migration
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > rollback.sql

# Apply rollback
npx prisma db execute --file rollback.sql
```

## Best Practices

1. **Always Test First**
   ```bash
   # Create test database with production data
   cp prisma/prisma/prod.db prisma/prisma/test.db
   
   # Test migration on copy
   DATABASE_URL="file:./test.db" npx prisma migrate deploy
   ```

2. **Use Migrations Folder**
   - Keep all migrations in `prisma/migrations/`
   - Never delete migration files
   - Track migration history

3. **Document Changes**
   - Add comments in schema.prisma
   - Document migration reasons
   - Keep migration log

4. **Monitor After Migration**
   - Check application logs
   - Monitor performance
   - Verify data integrity

## Emergency Contacts and Resources
- Prisma Migration Docs: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Database backup location: `/backups/database/`
- Last known good backup: Check timestamps in backup directory

## Quick Commands Reference
```bash
# Backup
cp prisma/prisma/prod.db prisma/prisma/prod.db.backup-$(date +%Y%m%d-%H%M%S)

# Migrate
npx prisma migrate deploy

# Generate Client
npx prisma generate

# Check Status
npx prisma migrate status

# Validate
npx prisma validate
```