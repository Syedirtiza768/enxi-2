# Quotation to Sales Order Feature Mapping

## Overview
This document provides a logical mapping of features from the Quotation module to the Sales Order module, identifying what can be reused, what needs adaptation, and what requires new development.

## 1. Data Model Mapping

### Core Fields Mapping
| Quotation Field | Sales Order Field | Mapping Action |
|----------------|-------------------|----------------|
| quotationNumber | orderNumber | ✅ Direct equivalent |
| version | - | ❌ Add version field to SalesOrder |
| status | status | ⚠️ Different enums, needs mapping |
| validUntil | promisedDate | ⚠️ Different purpose, partial mapping |
| subtotal | subtotal | ✅ Direct mapping |
| taxAmount | taxAmount | ✅ Direct mapping |
| discountAmount | discountAmount | ✅ Direct mapping |
| totalAmount | totalAmount | ✅ Direct mapping |
| paymentTerms | paymentTerms | ✅ Direct mapping |
| deliveryTerms | shippingTerms | ✅ Similar, minor adaptation |
| notes | notes | ✅ Direct mapping |
| internalNotes | - | ❌ Add internalNotes to SalesOrder |

### Item-Level Mapping
| QuotationItem Field | SalesOrderItem Field | Mapping Action |
|--------------------|---------------------|----------------|
| lineNumber | lineNumber | ✅ Direct mapping |
| lineDescription | lineDescription | ✅ Direct mapping |
| isLineHeader | isLineHeader | ✅ Direct mapping |
| description | description | ✅ Direct mapping |
| internalDescription | internalDescription | ✅ Direct mapping |
| quantity | quantity | ✅ Direct mapping |
| unitPrice | unitPrice | ✅ Direct mapping |
| cost | cost | ✅ Direct mapping |
| availabilityStatus | - | ⚠️ Use for initial validation |
| availableQuantity | quantityReserved | ⚠️ Different purpose, needs logic |

## 2. Component Mapping

### Forms
| Quotation Component | Sales Order Equivalent | Mapping Strategy |
|-------------------|----------------------|------------------|
| quotation-form-clean.tsx | - | Create sales-order-form-clean.tsx |
| clean-line-editor.tsx | clean-line-editor.tsx | ✅ Already shared |
| line-based-item-editor.tsx | - | ⚠️ Add to sales orders |

### List Views
| Quotation Feature | Sales Order Status | Implementation |
|------------------|-------------------|----------------|
| List with filters | ✅ Exists | Enhance with missing features |
| Status badges | ✅ Exists | Add more statuses |
| Quick actions | ⚠️ Partial | Add PDF, Email, Clone |
| Bulk operations | ❌ Missing | Add bulk status update |

### Detail Views
| Feature | Quotation | Sales Order | Action Required |
|---------|-----------|-------------|-----------------|
| Internal/Client view toggle | ✅ | ❌ | Add view mode toggle |
| Version history | ✅ | ❌ | Add version tracking |
| Activity timeline | ⚠️ | ⚠️ | Enhance both |
| Related documents | ✅ | ⚠️ | Link to shipments/invoices |

## 3. Service Layer Mapping

### API Routes
```typescript
// Quotation endpoints that need Sales Order equivalents
/api/quotations/[id]/pdf → /api/sales-orders/[id]/pdf
/api/quotations/[id]/clone → /api/sales-orders/[id]/clone
/api/quotations/[id]/email → /api/sales-orders/[id]/email
/api/quotations/export → /api/sales-orders/export
/api/quotations/stats → /api/sales-orders/stats
```

### Service Methods
| QuotationService Method | SalesOrderService Equivalent | Status |
|------------------------|----------------------------|---------|
| createQuotation | createSalesOrder | ✅ Exists |
| updateQuotation | updateSalesOrder | ✅ Exists |
| cloneQuotation | - | ❌ Add method |
| generatePDF | - | ❌ Add method |
| sendEmail | - | ❌ Add method |
| getVersionHistory | - | ❌ Add method |

## 4. Feature Priority Mapping

### High Priority (Core Functionality)
1. **PDF Generation**
   - Reuse quotation PDF template structure
   - Adapt for sales order specific fields
   - Add shipping information section

2. **Internal/Client Views**
   - Add viewMode state to sales order form
   - Hide cost/margin in client view
   - Show fulfillment status in internal view

3. **Version Control**
   - Add version field to SalesOrder model
   - Track changes between versions
   - Allow reverting to previous versions

### Medium Priority (Enhanced Functionality)
1. **Clone Functionality**
   - Copy all order details
   - Reset status to DRAFT
   - Generate new order number

2. **Email Integration**
   - Send order confirmation
   - Include PDF attachment
   - Track email history

3. **Template System**
   - Create order templates
   - Quick order creation from templates
   - Template management UI

### Low Priority (Nice to Have)
1. **Advanced Analytics**
   - Order conversion rates
   - Average order values
   - Fulfillment metrics

2. **Automation**
   - Auto-create from accepted quotations
   - Auto-status updates
   - Notification system

## 5. Implementation Roadmap

### Phase 1: Core Features (Week 1)
- [ ] Add missing fields to SalesOrder model
- [ ] Create sales-order-form-clean.tsx based on quotation form
- [ ] Implement PDF generation for sales orders
- [ ] Add internal/client view toggle

### Phase 2: Enhanced Features (Week 2)
- [ ] Implement version control
- [ ] Add clone functionality
- [ ] Create email sending capability
- [ ] Enhance validation and business rules

### Phase 3: Advanced Features (Week 3)
- [ ] Build template system
- [ ] Add bulk operations
- [ ] Implement advanced search/filters
- [ ] Create analytics dashboard

## 6. Code Reuse Strategy

### Direct Reuse (Copy & Adapt)
- PDF generation logic
- Email sending infrastructure
- Line-based editor components
- Validation utilities

### Shared Components
- clean-line-editor.tsx
- Currency formatters
- Tax calculators
- Status badges

### New Development Required
- Sales order specific workflows
- Fulfillment tracking UI
- Shipping integration
- Inventory reservation logic

## 7. Migration Considerations

### Database Changes
```sql
-- Add version tracking to SalesOrder
ALTER TABLE SalesOrder ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE SalesOrder ADD COLUMN internalNotes TEXT;

-- Add view preferences
ALTER TABLE SalesOrder ADD COLUMN lastViewMode VARCHAR(20) DEFAULT 'internal';
```

### Breaking Changes
- None expected if implemented carefully
- All new features are additive
- Existing functionality remains unchanged

### Testing Strategy
1. Unit tests for new service methods
2. Integration tests for API endpoints
3. E2E tests for critical workflows
4. Manual testing of UI components

## 8. Success Metrics

### Functional Metrics
- All quotation features available in sales orders
- No regression in existing functionality
- Improved user workflow efficiency

### Technical Metrics
- Code reuse > 60%
- Test coverage > 80%
- Performance impact < 10%

### Business Metrics
- Reduced order processing time
- Increased order accuracy
- Better customer communication

## Next Steps

1. Review and approve this mapping document
2. Prioritize features based on business needs
3. Begin Phase 1 implementation
4. Regular progress reviews and adjustments