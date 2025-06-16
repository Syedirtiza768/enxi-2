# Quotation System Testing Guide

## Overview
The quotation system is fully implemented with the following features:
- Complete CRUD operations
- Line-based item grouping
- Dual views (client/internal)
- PDF generation
- Template support
- Version control
- Status workflow management

## Prerequisites
1. Development server running: `npm run dev`
2. Database initialized with seed data
3. Valid user account for authentication

## Testing Steps

### 1. Authentication
- Navigate to http://localhost:3001/login
- Login with valid credentials
- You should be redirected to the dashboard

### 2. Quotation List View
- Navigate to http://localhost:3001/quotations
- Verify the following:
  - Statistics cards show correct counts
  - Search functionality works
  - Status filter works
  - Sales case filter loads options
  - Pagination works if multiple quotations exist

### 3. Create New Quotation
- Click "New Quotation" button
- Select a customer (or create one first if needed)
- Select or create a sales case
- Add items using either:
  - Line-based editor (grouped items)
  - Simple editor (flat list)
- Set validity period
- Set payment and delivery terms
- Add notes (optional)
- Save as draft or send immediately

### 4. View/Edit Quotation
- Click on a quotation from the list
- Verify all details display correctly
- Test view mode toggle (Internal/Client)
- Edit the quotation (if in DRAFT status)
- Test status actions:
  - Send (for DRAFT)
  - Accept/Reject (for SENT)

### 5. PDF Generation
- Open a quotation detail view
- Look for PDF download option (may need to implement UI button)
- PDF should generate with company branding

### 6. Template System
- Templates can be created via API
- Use templates when creating new quotations

## API Endpoints

### List Quotations
```
GET /api/quotations
Query params: status, salesCaseId, search, dateFrom, dateTo, limit, offset
```

### Create Quotation
```
POST /api/quotations
Body: {
  salesCaseId: string,
  validUntil: string (ISO date),
  paymentTerms: string,
  deliveryTerms: string,
  notes: string,
  internalNotes: string,
  items: [{
    lineNumber: number,
    lineDescription: string,
    isLineHeader: boolean,
    itemType: 'PRODUCT' | 'SERVICE',
    itemId: string (optional),
    itemCode: string,
    description: string,
    quantity: number,
    unitPrice: number,
    discount: number,
    taxRateId: string
  }]
}
```

### Get Single Quotation
```
GET /api/quotations/{id}
Query params: view ('client' | 'internal')
```

### Update Quotation
```
PUT /api/quotations/{id}
Body: Same as create
```

### Status Updates
```
POST /api/quotations/{id}/send
POST /api/quotations/{id}/accept
POST /api/quotations/{id}/reject
POST /api/quotations/{id}/cancel
```

### PDF Generation
```
GET /api/quotations/{id}/pdf
```

### Clone Quotation
```
POST /api/quotations/{id}/clone
```

### Statistics
```
GET /api/quotations/stats
```

## Common Issues & Solutions

### Issue: No sales cases available
**Solution**: Create a sales case first through the Sales Cases module

### Issue: Items not showing prices
**Solution**: Ensure inventory items have list prices set

### Issue: Tax calculations not working
**Solution**: Configure tax rates in system settings

### Issue: PDF generation fails
**Solution**: Check company settings for required fields (name, address, etc.)

## Test Data Creation

1. **Create Test Customer**:
   - Navigate to Customers module
   - Create a new customer with complete details

2. **Create Sales Case**:
   - Navigate to Sales Cases module
   - Create a new sales case for the customer
   - Status should be OPEN

3. **Create Inventory Items** (optional):
   - Navigate to Inventory module
   - Create products/services with prices

4. **Configure Settings**:
   - Navigate to Settings
   - Configure company details
   - Set quotation defaults (validity period, terms)

## Validation Checklist

- [ ] Can list all quotations
- [ ] Can filter by status
- [ ] Can search by number/customer
- [ ] Can create new quotation
- [ ] Can add line items
- [ ] Tax calculations work
- [ ] Can save as draft
- [ ] Can send quotation
- [ ] Can view in both modes
- [ ] Can edit draft quotations
- [ ] Can accept/reject sent quotations
- [ ] PDF generation works
- [ ] Clone functionality works
- [ ] Statistics are accurate