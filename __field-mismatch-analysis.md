# Field Mismatch Analysis Report

## Summary

There is a systematic mismatch between the code and the Prisma schema for inventory item fields:

### Incorrect Usage Found:
1. **Model Name**: Code uses `prisma.inventoryItem` but schema defines `model Item`
2. **Field Names**: 
   - Code uses `costPrice` → Schema has `standardCost`
   - Code uses `sellingPrice` → Schema has `listPrice`

## Files with Incorrect Field Usage

### Test Files Using `costPrice` and/or `sellingPrice`:
1. `/tests/integration/end-to-end-p2p-workflow.test.ts`
   - Lines 119-120: Uses `costPrice: 250.00` and `sellingPrice: 375.00`
   - Lines 130-131: Uses `costPrice: 150.00` and `sellingPrice: 225.00`

2. `/tests/integration/three-way-matching-enhanced.test.ts`
   - Uses both `costPrice` and `sellingPrice` fields

3. `/tests/integration/shipment-api.test.ts`
   - Uses `costPrice` field

4. `/tests/integration/shipment-workflow.test.ts`
   - Uses `costPrice` field

### Seed Scripts Using `costPrice`:
1. `/scripts/seed-comprehensive-accounting.ts`
   - Line 149: Uses `prisma.inventoryItem.create`
   - Lines 138-144: Uses `costPrice` in item data
   - Line 165: Uses `costPrice` for `costPerUnit`
   - Lines 177-178: Uses `costPrice` for `unitCost` and `totalCost`

## Correct Schema Definition

From `/prisma/schema.prisma`:

```prisma
model Item {
  id              String     @id @default(cuid())
  code            String     @unique
  name            String
  description     String?
  
  // ... other fields ...
  
  // Pricing
  standardCost    Float      @default(0)  // Standard cost for costing
  listPrice       Float      @default(0)  // Default selling price
  
  // ... rest of model ...
}
```

## Pattern of Misuse

The pattern shows that:
1. Test files are trying to create items with non-existent fields
2. Seed scripts are using the wrong model name (`inventoryItem` instead of `item`)
3. The field mapping should be:
   - `costPrice` → `standardCost`
   - `sellingPrice` → `listPrice`
   - `prisma.inventoryItem` → `prisma.item`

## Recommendation

All identified files need to be updated to use the correct model name and field names as defined in the Prisma schema.