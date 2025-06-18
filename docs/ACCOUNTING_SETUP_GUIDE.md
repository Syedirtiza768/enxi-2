# Accounting System Setup Guide

## Overview

The Enxi ERP accounting system is now fully integrated with automatic journal entry creation for all business transactions. This guide explains how to set up and use the accounting system.

## Quick Start

To initialize the accounting system with default chart of accounts:

```bash
npm run initialize-accounting
# or
tsx scripts/initialize-accounting.ts
```

This will create a complete chart of accounts with all necessary accounts for the system to function immediately.

## Default Chart of Accounts Structure

The system comes with a comprehensive chart of accounts:

### Assets (1000s)
- **1100** - Cash on Hand
- **1110** - Bank Accounts
- **1200** - Accounts Receivable
- **1300** - Inventory
- **1400** - Prepaid Expenses
- **1500** - Fixed Assets

### Liabilities (2000s)
- **2100** - Accounts Payable
- **2200** - Sales Tax Payable
- **2300** - Accrued Expenses
- **2400** - Salaries Payable

### Equity (3000s)
- **3100** - Share Capital
- **3200** - Retained Earnings
- **3300** - Current Year Earnings

### Revenue (4000s)
- **4100** - Sales Revenue
- **4200** - Service Revenue
- **4300** - Sales Discounts
- **4900** - Other Income

### Cost of Sales (5000s)
- **5100** - Cost of Goods Sold
- **5200** - Inventory Adjustments

### Operating Expenses (6000s)
- **6100** - Salaries and Wages
- **6200** - Rent Expense
- **6300** - Utilities Expense
- **6400** - Office Supplies
- **6500** - Depreciation Expense
- **6600** - Bank Charges
- **6900** - General Expenses

## Automatic Journal Entry Creation

The system automatically creates journal entries for all financial transactions:

### 1. Sales Transactions

#### Sales Invoice (when sent)
- **Debit**: Accounts Receivable (1200)
- **Credit**: Sales Revenue (4100) and Sales Tax Payable (2200)

#### Customer Payment
- **Debit**: Bank (1110) or Cash (1100)
- **Credit**: Accounts Receivable (1200)

#### Credit Note (when sent)
- **Debit**: Sales Revenue (4100) and Sales Tax Payable (2200)
- **Credit**: Accounts Receivable (1200)

### 2. Purchase Transactions

#### Supplier Invoice
- **Debit**: Inventory (1300) or Expense accounts
- **Credit**: Accounts Payable (2100)

#### Supplier Payment
- **Debit**: Accounts Payable (2100)
- **Credit**: Bank (1110)

### 3. Inventory Movements

#### Stock In (Opening Stock)
- **Debit**: Inventory (1300)
- **Credit**: Inventory Adjustments (5200)

#### Stock Out (Sales/Usage)
- **Debit**: Cost of Goods Sold (5100)
- **Credit**: Inventory (1300)

### 4. Expense Reports

#### Approved Expenses
- **Debit**: Expense Account (6xxx)
- **Credit**: Bank/Cash or Accounts Payable

## Key Features

1. **Automatic Posting**: All journal entries are automatically posted when transactions are confirmed
2. **Double-Entry Compliance**: Every transaction maintains balanced debits and credits
3. **Multi-Currency Support**: System supports multiple currencies with exchange rates
4. **Real-time Reporting**: All reports reflect current transaction data

## Configuration

The account codes are centralized in `/lib/constants/default-accounts.ts`. You can modify these mappings if needed, but ensure all referenced accounts exist in the database.

## Reports Available

After setup, the following reports work immediately:
- Trial Balance
- Balance Sheet
- Income Statement (Profit & Loss)

All reports show real-time data from posted journal entries.

## Important Notes

1. **System Accounts**: Accounts marked as "system accounts" are critical for automatic posting and should not be deleted
2. **Account Codes**: The system uses specific account codes for automatic posting. Changing these codes requires updating the configuration
3. **Journal Entry Status**: Only "POSTED" journal entries appear in financial reports

## Troubleshooting

### Missing Accounts Error
If you get "Account with code XXXX not found" errors:
1. Run `npm run initialize-accounting` to create missing accounts
2. Check that the account exists and is active
3. Verify the account code matches the configuration

### Transactions Not Appearing in Reports
1. Ensure the transaction created a journal entry
2. Check that the journal entry status is "POSTED"
3. Verify the report date range includes the transaction date

## Next Steps

1. Review and customize the chart of accounts if needed
2. Set up tax rates and link to appropriate tax accounts
3. Configure item-specific inventory and COGS accounts
4. Set up supplier-specific payable accounts if needed

The system is now ready for immediate use with full accounting functionality!