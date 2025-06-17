# General Ledger (GL) System Documentation

## Overview

The Enxi ERP system includes a comprehensive double-entry bookkeeping General Ledger (GL) system that automatically tracks all financial transactions. This document explains how the GL system works and how to configure it properly.

## Chart of Accounts Structure

The system uses a standard 5-digit account numbering scheme:

- **1000-1999**: Assets
  - 1100-1199: Current Assets (Cash, AR, Inventory)
  - 1200-1299: Fixed Assets (Property, Equipment)
  - 1300-1399: Intangible Assets
  
- **2000-2999**: Liabilities
  - 2100-2199: Current Liabilities (AP, Taxes Payable)
  - 2200-2299: Long-term Liabilities
  
- **3000-3999**: Equity
  - 3100-3199: Contributed Capital
  - 3200-3299: Retained Earnings
  - 3300-3399: Distributions
  
- **4000-4999**: Revenue/Income
  - 4100-4199: Sales Revenue
  - 4200-4299: Sales Adjustments
  - 4300-4399: Other Income
  
- **5000-5999**: Cost of Goods Sold
  - 5100-5199: Direct Costs
  - 5200-5299: Inventory Adjustments
  
- **6000-6999**: Operating Expenses
  - 6100-6199: Selling Expenses
  - 6200-6299: Administrative Expenses
  - 6300-6399: IT & Technology
  
- **7000-7999**: Other Expenses
  - 7100-7199: Interest Expense
  - 7200-7299: Tax Expense

## Setting Up the Production Chart of Accounts

To set up the comprehensive chart of accounts for production use:

```bash
npm run seed:production-coa
```

This will:
1. Create all standard GL accounts with proper hierarchy
2. Set up system accounts for automatic posting
3. Configure default tax rates with GL accounts
4. Create GL mapping documentation

## GL Account Configuration

### 1. Item-Level GL Accounts

Each inventory item can have three GL accounts:

```typescript
{
  inventoryAccountId: '1134', // Asset account for inventory value
  cogsAccountId: '5110',       // Expense account for cost of goods sold  
  salesAccountId: '4110'       // Income account for sales revenue
}
```

### 2. Tax Rate GL Accounts

Tax rates can have two GL accounts:

```typescript
{
  collectedAccountId: '2131', // Liability account for tax collected
  paidAccountId: '1151'       // Asset account for tax paid (prepaid taxes)
}
```

### 3. Location GL Accounts

Warehouse locations can have inventory accounts:

```typescript
{
  inventoryAccountId: '1134' // Asset account for location inventory
}
```

## Automatic GL Posting Rules

The system automatically creates journal entries for business transactions:

### Sales Invoice
- **Debit**: Accounts Receivable (1121)
- **Credit**: Sales Revenue (4110)
- **Credit**: Sales Tax Payable (2131)

### Cost of Goods Sold (on Sale)
- **Debit**: Cost of Goods Sold (5110)
- **Credit**: Inventory (1134)

### Purchase Invoice
- **Debit**: Inventory/Expense Account
- **Credit**: Accounts Payable (2111)

### Customer Payment
- **Debit**: Cash (1113)
- **Credit**: Accounts Receivable (1121)

### Vendor Payment
- **Debit**: Accounts Payable (2111)
- **Credit**: Cash (1113)

### Inventory Adjustment
- **Debit/Credit**: Inventory (1134)
- **Credit/Debit**: Inventory Shrinkage (5220)

## Using the GL Defaults Service

The `GLDefaultsService` provides centralized access to default GL accounts:

```typescript
import { GLDefaultsService } from '@/lib/services/gl-defaults.service';

const glDefaults = GLDefaultsService.getInstance();

// Get all default accounts
const defaults = await glDefaults.getDefaultAccounts(companyId);

// Get specific account by code
const arAccount = await glDefaults.getAccountByCode('1121', companyId);

// Get transaction mapping
const salesMapping = await glDefaults.getTransactionMapping('SALES_INVOICE', companyId);

// Get item GL accounts (with fallback to defaults)
const itemAccounts = await glDefaults.getItemAccounts(itemId);
```

## Best Practices

1. **Always Configure GL Accounts**: Set GL accounts for all items, tax rates, and locations
2. **Use System Accounts**: Accounts marked as `isSystemAccount` should not be deleted
3. **Maintain Account Hierarchy**: Keep parent-child relationships intact
4. **Regular Reconciliation**: Reconcile GL balances with subsidiary ledgers
5. **Month-End Close**: Run financial reports and verify account balances

## Financial Reports

The system provides standard financial statements:

1. **Trial Balance**: List of all accounts with balances
2. **Income Statement**: Revenue and expenses for a period
3. **Balance Sheet**: Assets, liabilities, and equity snapshot
4. **Cash Flow Statement**: Cash movements analysis
5. **General Ledger Detail**: Transaction details by account

## Troubleshooting

### Common Issues

1. **Missing GL Accounts on Transactions**
   - Ensure items have all three GL accounts configured
   - Check tax rates have collection accounts set
   - Verify default accounts exist in the system

2. **Out of Balance Journal Entries**
   - System enforces balanced entries (debits = credits)
   - Check for rounding issues in multi-currency transactions
   - Verify all line items are properly created

3. **Incorrect Account Balances**
   - Run account reconciliation reports
   - Check for unposted journal entries
   - Verify opening balances are correct

## Security Considerations

1. **GL Posting Permissions**: Only authorized users should post journal entries
2. **Account Modifications**: Restrict who can modify chart of accounts
3. **Audit Trail**: All GL entries maintain complete audit history
4. **Period Closing**: Implement period closing to prevent backdated entries

## Integration Points

The GL system integrates with:
- Sales Orders and Invoicing
- Purchase Orders and Receipts
- Inventory Management
- Payment Processing
- Financial Reporting

Each module automatically posts to appropriate GL accounts based on configuration.