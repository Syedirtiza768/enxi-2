# UAE Marine Engine Maintenance Company - Comprehensive Seed Data

## Overview

A comprehensive seed data generator for a UAE-based marine engine maintenance company with 24 months of historical business data. The system implements advanced batch processing, memory management, and progress tracking to handle large-scale data generation without stack overflow issues.

## Architecture Features

### 1. **Multi-Agent Architecture**
- Batch processing with configurable chunk sizes (default: 100 records)
- Memory cleanup every 500 records using garbage collection
- Progress tracking with real-time performance metrics
- Transaction management with 5-minute timeouts
- Retry mechanism with exponential backoff

### 2. **Data Volume & Distribution**
- **24 months** of historical data
- **550+ leads** with seasonal patterns (higher in March-May)
- **300+ sales cases** with realistic conversion rates
- **800+ quotations** with version control
- **400+ sales orders** with various fulfillment statuses
- **200+ purchase orders** with expedited orders
- **270 spare parts** (27 types × 10 brands)
- **15 customers** (major UAE marine companies)
- **10 suppliers** (international engine manufacturers)

### 3. **Business Patterns Implemented**

#### Seasonal Trends
- Pre-summer rush (March-May) with 50% higher lead generation
- Realistic order patterns throughout the year

#### Customer Behavior
- 60% lead conversion to sales cases
- Various payment patterns (full, partial, overdue)
- Repeat customer business

#### Operational Patterns
- FIFO inventory valuation
- Stock movements (opening, purchases, sales, adjustments)
- Inter-warehouse transfers
- Three-way matching for procurement

## Data Categories

### 1. **Base Data**
- Company settings (UAE Marine Engine Services LLC)
- 5 users with different roles
- Complete chart of accounts (AED currency)
- 3 warehouse locations (Dubai, Abu Dhabi, Sharjah)

### 2. **Master Data**
- Customers: Major UAE ports and shipping companies
- Suppliers: Global marine engine manufacturers
- Inventory: 8 categories of marine spare parts
- Items: 270 unique SKUs with realistic pricing

### 3. **Transactional Data**
- Leads → Sales Cases → Quotations → Orders
- Purchase Orders → Goods Receipts → Supplier Invoices
- Customer Invoices → Payments
- Shipments and deliveries

### 4. **Financial Data**
- Monthly journal entries (depreciation, payroll, rent)
- Quarterly VAT settlements
- Payment reconciliations
- Bank charges and fees

### 5. **Operational Data**
- Stock movements and adjustments
- Inter-warehouse transfers
- Customer purchase orders
- Comprehensive audit logs

## Usage

### Basic Seeding
```bash
npx tsx prisma/seed-uae-marine-comprehensive.ts
```

### Clear and Reseed
```bash
CLEAR_DATA=true npx tsx prisma/seed-uae-marine-comprehensive.ts
```

### Configuration Options
```typescript
const CONFIG = {
  BATCH_SIZE: 100,              // Records per batch
  DATE_RANGE_MONTHS: 24,        // Historical data period
  PROGRESS_UPDATE_INTERVAL: 10, // Progress update frequency
  TRANSACTION_TIMEOUT: 300000,  // 5 minutes
  MEMORY_CLEANUP_INTERVAL: 500, // Cleanup frequency
}
```

## Performance Features

### Memory Management
- Batch processing to prevent stack overflow
- Periodic garbage collection
- Efficient date generation utilities
- Streaming approach for large datasets

### Progress Tracking
- Real-time progress indicators
- Processing rate calculation (items/sec)
- Elapsed time tracking
- Completion summaries

### Error Handling
- Retry mechanism with exponential backoff
- Transaction rollback on failure
- Detailed error logging
- Graceful degradation for missing models

## Data Integrity

### Foreign Key Relationships
- All references properly linked
- No orphan records
- Cascading relationships maintained

### Business Logic
- Realistic status progressions
- Proper accounting (debits = credits)
- Inventory accuracy maintained
- Chronological consistency

## Summary Statistics

After successful seeding:
- 👥 **Users**: 5 (various roles)
- 🏢 **Customers**: 15 (UAE marine companies)
- 🏭 **Suppliers**: 10 (engine manufacturers)
- 📦 **Inventory Items**: 270 (spare parts)
- 🎯 **Leads**: 550+ (with conversion tracking)
- 💼 **Sales Cases**: 300+ (various stages)
- 📄 **Quotations**: 800+ (with versions)
- 🛒 **Sales Orders**: 400+ (various statuses)
- 📋 **Purchase Orders**: 200+ (replenishment)
- 💳 **Invoices**: Generated for delivered orders
- 💸 **Payments**: Realistic payment patterns

## Industry-Specific Features

### Marine Engine Parts Categories
1. Engine Core Components
2. Fuel System Parts
3. Cooling System Parts
4. Turbocharger Components
5. Lubrication System
6. Electrical Components
7. Exhaust System
8. Marine Transmission

### Service Types
- Annual maintenance contracts
- Emergency engine repairs
- Spare parts supply
- Turbocharger overhauls
- Fuel system upgrades

### UAE-Specific Details
- TRN numbers for all entities
- 5% VAT calculations
- AED currency throughout
- UAE locations and addresses
- Local business practices

## Testing & Validation

The seed data is designed for:
- ERP system demonstrations
- Performance testing
- Integration testing
- User training
- Report generation
- Dashboard visualization

## Notes

- All passwords are set to `Password123!`
- Admin user: `admin@uaemarineservices.ae`
- Data spans 24 months from current date
- Fully compatible with Prisma schema
- Handles missing models gracefully