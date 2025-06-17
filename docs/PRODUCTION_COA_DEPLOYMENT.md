# Production Chart of Accounts Deployment Guide

This guide covers deploying the Chart of Accounts (COA) across various production environments.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Methods](#deployment-methods)
4. [Environment Configuration](#environment-configuration)
5. [Troubleshooting](#troubleshooting)
6. [Post-Deployment](#post-deployment)

## Overview

The production Chart of Accounts seed creates a comprehensive accounting structure that includes:
- **Assets**: Cash, Receivables, Inventory, Fixed Assets
- **Liabilities**: Payables, Accrued Expenses, Taxes
- **Equity**: Owner's Equity, Retained Earnings
- **Revenue**: Sales, Services, Other Income
- **Expenses**: COGS, Operating Expenses

## Prerequisites

1. **Database Access**: Ensure your production database is accessible
2. **Node.js**: Version 18+ installed
3. **Environment Variables**: Properly configured (see below)
4. **Database Migrations**: Run `npx prisma migrate deploy` first

## Deployment Methods

### Method 1: Direct Server Deployment

```bash
# SSH into your production server
ssh user@your-server.com

# Navigate to application directory
cd /path/to/enxi-erp

# Set environment variables
export DATABASE_URL="your-production-database-url"
export COMPANY_NAME="Your Company Name"
export DEFAULT_CURRENCY="USD"

# Run the setup
npm run seed:production-coa
```

### Method 2: Using Deployment Script

```bash
# Make script executable
chmod +x scripts/deploy-setup-coa.sh

# Run with environment variables
COMPANY_NAME="Your Company" \
COMPANY_CODE="YOURCO" \
DEFAULT_CURRENCY="USD" \
./scripts/deploy-setup-coa.sh
```

### Method 3: Docker Deployment

```bash
# Build the Docker image
docker build -f docker/setup-coa.dockerfile -t enxi-coa-setup .

# Run the container
docker run --rm \
  -e DATABASE_URL="postgresql://user:pass@host/db" \
  -e COMPANY_NAME="Your Company" \
  -e DEFAULT_CURRENCY="USD" \
  enxi-coa-setup
```

### Method 4: Kubernetes Job

```bash
# Apply the configuration
kubectl apply -f k8s/setup-coa-job.yaml

# Check job status
kubectl get jobs -n enxi-erp
kubectl logs job/setup-chart-of-accounts -n enxi-erp
```

### Method 5: CI/CD Pipeline

Example GitHub Actions workflow:

```yaml
name: Setup Production COA
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  setup-coa:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate Prisma Client
        run: npx prisma generate
        
      - name: Run COA Setup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          COMPANY_NAME: ${{ vars.COMPANY_NAME }}
          DEFAULT_CURRENCY: ${{ vars.DEFAULT_CURRENCY }}
        run: npm run seed:production-coa
```

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@host/db` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `COMPANY_NAME` | Company name | `Default Company` |
| `COMPANY_CODE` | Company code | `DEFAULT` |
| `COMPANY_REG_NO` | Registration number | `REG-001` |
| `COMPANY_TAX_NO` | Tax number | `TAX-001` |
| `COMPANY_EMAIL` | Company email | `info@company.com` |
| `COMPANY_PHONE` | Company phone | `+1234567890` |
| `COMPANY_WEBSITE` | Company website | `https://company.com` |
| `COMPANY_ADDRESS` | Street address | `123 Business St` |
| `COMPANY_CITY` | City | `Business City` |
| `COMPANY_STATE` | State/Province | `BC` |
| `COMPANY_COUNTRY` | Country code | `US` |
| `COMPANY_POSTAL` | Postal code | `12345` |
| `DEFAULT_CURRENCY` | Default currency | `USD` |
| `DEFAULT_TAX_RATE` | Default tax rate | `10` |
| `FORCE_RESEED` | Force recreate accounts | `false` |

### Database Support

The system supports multiple databases:

#### PostgreSQL
```
DATABASE_URL="postgresql://user:password@localhost:5432/enxi_erp"
```

#### MySQL
```
DATABASE_URL="mysql://user:password@localhost:3306/enxi_erp"
```

#### SQL Server
```
DATABASE_URL="sqlserver://localhost:1433;database=enxi_erp;user=sa;password=pass"
```

#### SQLite (Development only)
```
DATABASE_URL="file:./prisma/dev.db"
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```
   Error: P1001: Can't reach database server
   ```
   - Check DATABASE_URL is correct
   - Verify network connectivity
   - Ensure database server is running

2. **Accounts Already Exist**
   ```
   Company already has X accounts
   ```
   - Set `FORCE_RESEED=true` to recreate (WARNING: deletes existing data)
   - Or manually delete existing accounts first

3. **Permission Denied**
   ```
   Error: P2010: Permission denied
   ```
   - Ensure database user has CREATE/INSERT permissions
   - Check file permissions for SQLite

4. **Module Not Found**
   ```
   Error: Cannot find module
   ```
   - Run `npm install` to install dependencies
   - Run `npx prisma generate` to generate client

### Debug Mode

Enable detailed logging:
```bash
DEBUG=* npm run seed:production-coa
```

## Post-Deployment

### 1. Verify Installation

```sql
-- Check account counts by type
SELECT type, COUNT(*) FROM Account GROUP BY type;

-- Verify system accounts
SELECT code, name FROM Account WHERE isSystemAccount = true;

-- Check tax rates
SELECT code, name, rate FROM TaxRate;
```

### 2. Configure Items

Update inventory items with appropriate GL accounts:
```sql
UPDATE Item SET 
  inventoryAccountId = (SELECT id FROM Account WHERE code = '1130'),
  cogsAccountId = (SELECT id FROM Account WHERE code = '5100'),
  salesAccountId = (SELECT id FROM Account WHERE code = '4100')
WHERE inventoryAccountId IS NULL;
```

### 3. Set Up Additional Accounts

You may need industry-specific accounts:
- **Manufacturing**: WIP, Raw Materials, Factory Overhead
- **Retail**: Shrinkage, Returns, Gift Cards
- **Services**: Unbilled Revenue, Retainers, Professional Fees

### 4. Configure GL Mappings

Review and adjust default GL mappings for:
- Sales transactions
- Purchase transactions
- Payment processing
- Inventory movements
- Expense reporting

### 5. User Training

- Train accounting staff on the COA structure
- Document any customizations made
- Set up approval workflows for journal entries
- Configure financial reporting templates

## Security Considerations

1. **Access Control**: Limit who can modify the COA
2. **Audit Trail**: Enable logging for all GL changes
3. **Backup**: Always backup before making changes
4. **Testing**: Test in staging environment first
5. **Compliance**: Ensure COA meets regulatory requirements

## Support

For issues or questions:
1. Check application logs
2. Review this documentation
3. Contact your system administrator
4. Submit a support ticket

Remember: The Chart of Accounts is the foundation of your financial system. Take time to set it up correctly!