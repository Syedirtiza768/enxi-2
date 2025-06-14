# Prisma Enum Mismatch Fixes Summary

## Fixed Issues

### 1. **prisma/seed.ts**
- Fixed LeadSource enum values:
  - `'Website'` → `LeadSource.WEBSITE`
  - `'Trade Show'` → `LeadSource.TRADE_SHOW`
  - `'Referral'` → `LeadSource.REFERRAL`
- Added `LeadSource` to imports
- Removed `firstName` and `lastName` fields from User creation (not in User model)
- Fixed Customer model fields:
  - `companyName` → `name`
  - Removed `tradeName`, `numberOfEmployees`, `annualRevenue`, `status`
- Fixed Lead model fields:
  - Split `contactName` into `firstName` and `lastName`
  - `companyName` → `company`
  - Removed `industry` and `estimatedValue`
  - Added `jobTitle`
- Fixed SalesCase model fields:
  - Removed `leadId`, `probability`, `expectedCloseDate`, `stage`
  - Changed second sales case to use existing customer instead of lead
- Removed references to non-existent `SalesCaseUpdate` model
- Removed references to non-existent `QuotationVersion` model
- Fixed Quotation creation to match actual schema:
  - Added required `salesCaseId`
  - Used proper QuotationItem structure with lineNumber, lineDescription, etc.
- Fixed StockMovement and StockLot fields:
  - Removed `supplier` field from StockMovement
  - Changed `supplier` → `supplierName` in StockLot
- Fixed function return type: `Promise<T>` → removed type annotation

### 2. **prisma/seed-accounting.ts**
- Fixed Role enum: `'ADMIN'` → `Role.ADMIN`
- Added `Role` to imports

### 3. **prisma/seed-demo.ts**
- Fixed LeadSource enum values:
  - `'Website'` → `LeadSource.WEBSITE`
  - `'Trade Show'` → `LeadSource.TRADE_SHOW`
  - `'Referral'` → `LeadSource.REFERRAL`

## Common Enum Values Reference

### LeadSource
- `WEBSITE`
- `REFERRAL`
- `SOCIAL_MEDIA`
- `EMAIL_CAMPAIGN`
- `PHONE_CALL`
- `TRADE_SHOW`
- `ADVERTISING`
- `OTHER`

### Role
- `SUPER_ADMIN`
- `ADMIN`
- `MANAGER`
- `SALES_REP`
- `ACCOUNTANT`
- `WAREHOUSE`
- `VIEWER`
- `USER`

### Other Important Notes
- Always use enum values from the Prisma client, not string literals
- Import enums from `@/lib/generated/prisma`
- Check the schema.prisma file for correct model field names
- Some models like `SalesCaseUpdate` and `QuotationVersion` don't exist in the current schema