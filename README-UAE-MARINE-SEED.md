# UAE Marine Diesel Company - Comprehensive Seed Data

This seed creates a complete ERP setup for a UAE-based Marine Diesel Engine Maintenance Company.

## 🏢 Company Profile
- **Name**: Gulf Marine Diesel Services LLC
- **Location**: Jebel Ali Free Zone, Dubai, UAE
- **Industry**: Marine Engine Maintenance & Repair
- **Currency**: AED (UAE Dirham)
- **Tax**: UAE VAT 5%

## 📦 What's Included

### Company Configuration
- Company settings with UAE-specific details
- Multi-currency support with exchange rates
- UAE VAT configuration (5% standard rate)
- Complete chart of accounts in AED

### Users & Permissions (7 users)
1. **Admin** (admin/demo123) - Full system access
2. **Sales Manager** (sales_manager/demo123) - Sales team lead
3. **Sales Executive** (sales_exec/demo123) - Sales team member
4. **Accountant** (accountant/demo123) - Financial management
5. **Warehouse Manager** (warehouse/demo123) - Inventory control
6. **Purchasing Manager** (purchasing/demo123) - Procurement
7. **Service Engineer** (engineer/demo123) - Technical services

### Locations
- Dubai Main Warehouse (Jebel Ali)
- Abu Dhabi Service Center (Mussafah)
- Mobile Service Van

### Inventory Setup
- Marine engine parts (pistons, injectors, cylinder heads)
- Filters (oil, fuel, air)
- Lubricants & fluids
- Cooling system components
- Service items (maintenance, overhaul, emergency)

### Business Partners
**Customers:**
- DP World Jebel Ali
- ADNOC Logistics & Services
- Emirates Shipping Line
- Gulftainer
- Topaz Energy and Marine
- National Marine Dredging Company

**Suppliers:**
- Bosch Marine Middle East
- MAN Energy Solutions UAE
- Caterpillar Marine Power Systems
- Fleetguard Filters Gulf
- Shell Marine Lubricants

### Sample Transactions
- Annual maintenance contract with DP World (AED 2.4M)
- Engine overhaul quotation for ADNOC (AED 3.6M)
- Purchase orders for spare parts
- Stock movements and inventory balances
- Customer invoices and payments
- Supplier invoices and payments
- Complete journal entries

## 🚀 How to Use

### Option 1: Use the Complete Seed File
The main seed file (`seed-uae-marine.ts`) contains the complete implementation but is split into parts for readability.

### Option 2: Combine All Parts
1. Copy all functions from the part files:
   - `seed-uae-marine-part2.ts` - Chart of accounts, locations, inventory
   - `seed-uae-marine-part3.ts` - Suppliers, customers, sales setup
   - `seed-uae-marine-part4.ts` - Transactions and workflows

2. Add them to the main `seed-uae-marine.ts` file after the existing functions

3. Run the seed:
```bash
npx tsx prisma/seed-uae-marine.ts
```

### Option 3: Create a Consolidated File
Create a new file that imports all the functions:

```typescript
// seed-uae-marine-full.ts
import { /* all functions */ } from './seed-uae-marine'
import { /* all functions */ } from './seed-uae-marine-part2'
import { /* all functions */ } from './seed-uae-marine-part3'
import { /* all functions */ } from './seed-uae-marine-part4'

// Call main() from seed-uae-marine.ts
```

## 📊 Post-Seed Verification

After running the seed, verify:

1. **Login** with admin/demo123
2. **Check Company Settings** - Should show Gulf Marine Diesel Services
3. **Verify Currency** - Default should be AED
4. **Check Exchange Rates** - Should have rates for USD, EUR, GBP, etc.
5. **Review Chart of Accounts** - Should have marine-specific accounts
6. **Check Inventory** - Marine parts should be stocked
7. **View Sales** - DP World contract should be active
8. **Check Accounting** - Journal entries should be posted

## 🔧 Customization

To adapt for your company:

1. **Company Details**: Update company name, address, TRN in `createCompanySettings()`
2. **Users**: Modify user profiles in `createUsersAndProfiles()`
3. **Products**: Adjust marine parts in `createMarineInventory()`
4. **Customers**: Update customer list in `createCustomers()`
5. **Pricing**: Adjust prices to match your market

## ⚠️ Important Notes

1. This seed **clears all existing data**
2. All amounts are in **AED** unless specified
3. VAT is set at **5%** (UAE standard rate)
4. Exchange rates are approximate and should be updated
5. Passwords are set to **demo123** for all users

## 🐛 Troubleshooting

If you encounter errors:

1. **Module not found**: Ensure all import paths are correct
2. **Type errors**: Check that all enums are imported from `@/lib/generated/prisma`
3. **Foreign key errors**: The seed cleans data in the correct order
4. **Memory issues**: Run with increased memory: `NODE_OPTIONS="--max-old-space-size=4096" npx tsx prisma/seed-uae-marine.ts`

## 📈 Next Steps

After seeding:

1. Update exchange rates to current values
2. Adjust credit limits for customers
3. Set up email configurations
4. Configure backup schedules
5. Train users on the system
6. Start with pilot transactions before full rollout

---

This seed provides a complete, production-ready setup for a UAE marine services company. It demonstrates multi-currency operations, UAE VAT compliance, and industry-specific inventory management.