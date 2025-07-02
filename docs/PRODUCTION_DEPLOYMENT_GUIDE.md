# Production Deployment Guide

## Prerequisites

1. Node.js 20+ installed
2. Environment variables configured
3. Database URL set in `.env`

## Initial Setup

### 1. Database Setup

First, check your database status:

```bash
npm run check:production-db
```

This will show:
- Current database connection status
- Existing data counts
- Recommended seeding order
- Potential data integrity issues

### 2. Environment Variables

Create a `.env` file with:

```bash
DATABASE_URL="file:./prisma/production.db"  # Or your production database URL
NODE_ENV=production
```

**Important**: For production, use a proper database location outside the application directory:

```bash
DATABASE_URL="file:/var/lib/enxi/production.db"
```

### 3. Database Schema

Apply the schema to your database:

```bash
# For initial setup or safe updates
npm run db:push

# For production migrations (if you have migration files)
npx prisma migrate deploy
```

## Seeding Order

The correct order for seeding a fresh production database:

### Step 1: Chart of Accounts (Required First)

```bash
npm run seed:production-coa
```

This creates:
- Essential GL accounts (Assets, Liabilities, Equity, Income, Expenses)
- Default tax categories and rates
- System accounts for automated postings

### Step 2: Core System Data

```bash
npm run seed:production-core
```

This creates:
- Company settings
- System permissions
- Default roles (Admin, Manager, Employee)
- Admin user
- Tax configuration
- Default locations

### Step 3: Demo Data (Optional)

```bash
npm run seed:production
```

This adds sample:
- Customers
- Suppliers
- Inventory items
- Sales cases
- Quotations

## Troubleshooting

### Foreign Key Constraint Errors

If you encounter foreign key errors:

1. Check the database status:
   ```bash
   npm run check:production-db
   ```

2. Clear and restart (if safe):
   ```bash
   # WARNING: This will delete all data
   rm prisma/production.db
   npm run db:push
   ```

3. Then seed in the correct order starting with COA

### Permission Errors

On Linux/Ubuntu servers:

```bash
# Run with sudo if needed
sudo npm run seed:production-coa
sudo npm run seed:production-core
```

### Schema Mismatches

If seed scripts fail due to schema mismatches:

1. Update the schema:
   ```bash
   npm run db:push
   ```

2. Generate fresh Prisma client:
   ```bash
   npm run db:generate
   ```

3. Retry seeding

## Production Best Practices

1. **Database Location**: Store database files outside the application directory
2. **Backups**: Set up regular database backups before any updates
3. **Schema Changes**: Use Prisma migrations for production schema changes
4. **Environment**: Always set `NODE_ENV=production`
5. **Monitoring**: Check logs after seeding for any warnings

## Verification

After seeding, verify the setup:

```bash
# Check database status
npm run check:production-db

# Start the application
npm run build
npm start
```

Then:
1. Navigate to `/login`
2. Use admin credentials to log in
3. Verify all modules are accessible
4. Check company settings at `/settings`