# Production Deployment Guide for Enxi ERP

## Overview
This guide provides instructions for deploying the comprehensive seed data to production environments.

## Prerequisites
- Node.js 18+ installed
- Access to production database
- Environment variables configured
- Backup of current production data

## Deployment Steps

### 1. Backup Current Production Data
```bash
# Create a backup of the current database
npm run db:backup

# Or manually backup SQLite database
cp prisma/prod.db prisma/prod.db.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. Configure Environment Variables
Create or update `.env.production` with:
```env
DATABASE_URL="file:./prisma/prod.db"
NODE_ENV="production"

# Seed configuration options
CLEAR_DATA=false          # Set to true only if you want to clear existing data
ENABLE_MULTI_LOCATION=true
ENABLE_STOCK_LOTS=true
ENABLE_CUSTOMER_PO=true
ENABLE_SERVICE_DELIVERY=true
ENABLE_TERRITORIES=true
GENERATE_MONTHS=24        # Number of months of historical data
```

### 3. Deploy Code Updates
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build the application
npm run build

# Run migrations
npx prisma migrate deploy
```

### 4. Run Comprehensive Seed Script

#### Option A: Run with All Features (Recommended)
```bash
# Run with all features enabled
CLEAR_DATA=false \
ENABLE_MULTI_LOCATION=true \
ENABLE_STOCK_LOTS=true \
ENABLE_CUSTOMER_PO=true \
ENABLE_SERVICE_DELIVERY=true \
ENABLE_TERRITORIES=true \
GENERATE_MONTHS=24 \
npx tsx prisma/seed-uae-marine-comprehensive-enhanced.ts
```

#### Option B: Run with Basic Features
```bash
# Run with basic features only
CLEAR_DATA=false npx tsx prisma/seed-uae-marine-comprehensive-enhanced.ts
```

#### Option C: Use the Shell Script
```bash
# Make the script executable
chmod +x scripts/seed-uae-marine-all-comprehensive.sh

# Run the script
./scripts/seed-uae-marine-all-comprehensive.sh
```

### 5. Verify Deployment

#### Check Data Counts
```bash
# Run validation script
npx tsx scripts/validate-system.ts
```

#### Manual Verification
1. Log into the application
2. Check the following:
   - Users: 6 accounts created (admin, sales manager, 2 sales reps, accountant, warehouse manager)
   - Customers: 12 UAE marine companies
   - Suppliers: 10 marine engine suppliers
   - Items: 270 inventory items (spare parts + services)
   - Leads: 15 leads with various statuses
   - Sales Cases: Multiple cases per customer
   - Quotations: Multiple versions per sales case
   - Sales Orders: Confirmed quotations converted to orders

### 6. Post-Deployment Tasks

#### Update User Passwords
```bash
# Create script to update passwords
npx tsx scripts/update-production-passwords.ts
```

#### Configure Permissions
```bash
# Grant necessary permissions
npx tsx scripts/grant-admin-sales-approve.ts
npx tsx scripts/grant-shipments-permissions.ts
```

#### Start the Application
```bash
# Using PM2 (recommended for production)
pm2 start ecosystem.config.js --env production

# Or using npm
npm start
```

## Important Notes

### Data Safety
- **NEVER** set `CLEAR_DATA=true` in production unless you intend to wipe all existing data
- Always backup before running seed scripts
- Test in staging environment first

### Performance Considerations
- The seed script processes data in batches for optimal performance
- Expected runtime: 30-60 seconds depending on server specifications
- Memory usage: Peak ~500MB during execution

### Customization Options

#### Adjust Historical Data Range
```bash
# Generate only 12 months of data
GENERATE_MONTHS=12 npx tsx prisma/seed-uae-marine-comprehensive-enhanced.ts
```

#### Feature Toggles
- `ENABLE_MULTI_LOCATION`: Creates multiple warehouse locations
- `ENABLE_STOCK_LOTS`: Enables lot tracking for inventory
- `ENABLE_CUSTOMER_PO`: Creates customer purchase orders
- `ENABLE_SERVICE_DELIVERY`: Adds service delivery tracking
- `ENABLE_TERRITORIES`: Assigns sales territories

### Troubleshooting

#### Common Issues

1. **Unique constraint violations**
   - Cause: Data already exists
   - Solution: Either set `CLEAR_DATA=true` (dangerous!) or run on fresh database

2. **Memory issues**
   - Cause: Large batch processing
   - Solution: Reduce batch size in CONFIG or increase Node.js memory:
   ```bash
   NODE_OPTIONS="--max-old-space-size=2048" npx tsx prisma/seed-uae-marine-comprehensive-enhanced.ts
   ```

3. **Transaction timeouts**
   - Cause: Slow database operations
   - Solution: Increase timeout in seed configuration

#### Logs and Monitoring
- Check application logs: `pm2 logs`
- Monitor database: Check for lock issues or slow queries
- System resources: Monitor CPU and memory usage during seeding

## Rollback Procedure

If issues occur:

1. Stop the application
```bash
pm2 stop all
```

2. Restore database backup
```bash
cp prisma/prod.db.backup.[timestamp] prisma/prod.db
```

3. Restart application with previous version
```bash
git checkout [previous-version]
npm install
npm run build
pm2 restart all
```

## Security Considerations

1. **Default Passwords**: All users are created with password `password123`. Change immediately after deployment.

2. **Access Control**: Review and configure user permissions based on roles.

3. **API Keys**: Update any API keys or secrets used in production.

## Maintenance

### Regular Tasks
- Monitor seed data quality
- Update seed templates as business requirements change
- Regularly test seed scripts in staging

### Updates
To update the seed data:
1. Modify the seed script as needed
2. Test thoroughly in development
3. Deploy to staging for validation
4. Schedule production deployment during maintenance window

## Support

For issues or questions:
- Check logs in `/logs` directory
- Review error patterns in `API_ERROR_PATTERNS_REPORT.md`
- Contact development team for assistance