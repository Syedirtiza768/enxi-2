# Stock Movement GL Integration Summary

## Current Status: ✅ WORKING

Stock in and stock out operations **ARE creating general ledger entries** automatically.

## How It Works

### 1. Stock In Movement
When a stock in operation is performed:
- **Debit**: Inventory Account (1300) - increases asset
- **Credit**: Inventory Adjustments (5900) - expense account for adjustments

Example from test:
```
Movement: SIN-0003
Amount: $1,000 (10 units × $100/unit)
- Dr: Inventory (1300) $1,000
- Cr: Inventory Adjustments (5900) $1,000
```

### 2. Stock Out Movement
When a stock out operation is performed:
- **Debit**: Cost of Goods Sold (5100) - increases expense
- **Credit**: Inventory Account (1300) - decreases asset

Example from test:
```
Movement: SOUT-0003
Amount: $22,350 (5 units × $4,470/unit using FIFO)
- Dr: Cost of Goods Sold (5100) $22,350
- Cr: Inventory (1300) $22,350
```

## Key Components

### 1. StockMovementService (`/lib/services/inventory/stock-movement.service.ts`)
- Creates stock movements
- Automatically creates journal entries via `createInventoryJournalEntry()` method
- Uses FIFO for stock out cost calculation

### 2. Item Configuration
Items must have GL accounts configured:
- `inventoryAccountId` - for inventory asset tracking
- `cogsAccountId` - for cost of goods sold expense

### 3. GL Accounts Used
- **1300** - Inventory (Asset)
- **5100** - Cost of Goods Sold (Expense)
- **5900** - Inventory Adjustments (Expense)
- **4000** - Revenue (Income) - for sales

## Database Evidence

Recent stock movements with GL entries:
```sql
SIN-0002  | STOCK_IN   | JE2025000001
SOUT-0002 | STOCK_OUT  | JE2025000002
SIN-0003  | STOCK_IN   | JE2025000003
SOUT-0003 | STOCK_OUT  | JE2025000004
```

## Configuration Requirements

1. Items must have `trackInventory = true`
2. Items must have `inventoryAccountId` and `cogsAccountId` configured
3. GL accounts must exist in the Chart of Accounts

## Scripts Available

1. **Setup GL Accounts**: `npx tsx scripts/setup-inventory-gl-accounts.ts`
2. **Fix Item GL Accounts**: `npx tsx scripts/fix-item-gl-accounts.ts`
3. **Test GL Integration**: `npx tsx scripts/test-stock-gl-integration.ts`

## Conclusion

The stock movement system is fully integrated with the general ledger. Every stock in and stock out operation automatically creates appropriate journal entries to maintain accurate financial records.