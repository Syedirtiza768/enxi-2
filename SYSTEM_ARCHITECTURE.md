# Enxi ERP System Architecture

## Overview
Enxi ERP is a comprehensive enterprise resource planning system built with modern web technologies. The system follows a monolithic architecture with Next.js serving both frontend and API routes, backed by a SQLite database (development) with Prisma ORM.

## Technology Stack

### Frontend
- **Framework**: Next.js 15.3.3 (App Router)
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS
- **Component Library**: Custom atomic design pattern with Radix UI primitives
- **State Management**: React Context + Local state
- **Forms**: React Hook Form with Zod validation

### Backend
- **Framework**: Next.js API Routes (integrated)
- **ORM**: Prisma 6.8.2
- **Database**: SQLite (development), PostgreSQL (production-ready)
- **Authentication**: JWT-based with httpOnly cookies
- **Validation**: Zod schemas

### Infrastructure
- **Runtime**: Node.js v22.15.0
- **Package Manager**: npm 10.9.2
- **Process Manager**: PM2 (production)
- **Build Tools**: TypeScript, ESLint, Prettier

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                       │
│                    (React + Next.js SSR)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────┴───────────────────────────────────┐
│                     Next.js Application                      │
│  ┌─────────────────────────┬────────────────────────────┐  │
│  │    Frontend Routes      │      API Routes (/api)      │  │
│  │  /(auth)/* - Protected  │   Authentication           │  │
│  │  /(public)/* - Public   │   Business Logic           │  │
│  │                         │   Data Validation          │  │
│  └─────────────────────────┴────────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────┴────────────────────────────┐ │
│  │                   Service Layer                         │ │
│  │  BaseService → Domain Services → Business Logic        │ │
│  └───────────────────────────┬────────────────────────────┘ │
│                              │                               │
│  ┌───────────────────────────┴────────────────────────────┐ │
│  │                    Prisma ORM                           │ │
│  │         Type-safe database queries & migrations         │ │
│  └───────────────────────────┬────────────────────────────┘ │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                      SQLite Database                         │
│                    (PostgreSQL ready)                        │
└─────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Authentication & Authorization
- **JWT Token Management**: Secure token generation and validation
- **Role-Based Access Control (RBAC)**: Hierarchical permission system
- **Session Management**: HttpOnly cookie-based sessions
- **Password Security**: Bcrypt hashing with salt rounds

### 2. Sales & CRM
- **Lead Management**: Lead capture, qualification, and conversion
- **Customer Management**: 360-degree customer view with credit management
- **Sales Cases**: Opportunity tracking with P&L analysis
- **Quotations**: Multi-version quotes with approval workflow
- **Sales Orders**: Order fulfillment and tracking

### 3. Procurement
- **Supplier Management**: Vendor master data and performance tracking
- **Purchase Orders**: Multi-level approval workflow
- **Goods Receipts**: PO receiving with quality inspection
- **Three-way Matching**: Automated PO-Receipt-Invoice reconciliation

### 4. Inventory Management
- **Multi-location Inventory**: Warehouse and bin management
- **FIFO Costing**: First-In-First-Out inventory valuation
- **Stock Movements**: Real-time tracking with audit trail
- **Batch/Lot Tracking**: Expiry date management
- **Physical Counts**: Cycle counting and reconciliation

### 5. Financial Management
- **Chart of Accounts**: Hierarchical GL structure
- **Multi-currency**: Real-time exchange rate management
- **Tax Engine**: Configurable tax rates and exemptions
- **Financial Reporting**: Balance Sheet, P&L, Trial Balance
- **Audit Trail**: Complete transaction history

### 6. Logistics & Shipping
- **Shipment Management**: Delivery planning and tracking
- **Carrier Integration**: Multi-carrier support
- **Documentation**: Packing lists, shipping labels

## Data Flow

### Authentication Flow
1. User submits credentials → `/api/auth/login`
2. Credentials validated against database
3. JWT token generated and stored in httpOnly cookie
4. Subsequent requests include cookie for authentication
5. Middleware validates token and extracts user context

### Transaction Flow (Sales Order Example)
1. Lead → Customer conversion
2. Sales Case created with opportunity details
3. Quotation generated with line items and pricing
4. Upon acceptance → Sales Order created
5. Fulfillment → Shipment and delivery
6. Invoice generation → Payment collection
7. GL entries posted automatically

## Security Architecture

### Authentication
- JWT tokens with configurable expiry (7 days default)
- HttpOnly cookies prevent XSS attacks
- Secure flag enabled in production (HTTPS only)
- SameSite=lax for CSRF protection

### Authorization
- Role hierarchy: SUPER_ADMIN → ADMIN → MANAGER → SALES_REP → USER
- Resource-level permissions
- API route protection with role checks
- Frontend route guards

### Data Security
- Input validation at all boundaries
- Parameterized queries via Prisma (no SQL injection)
- Sensitive data encryption at rest
- Audit logging for compliance

## API Design

### RESTful Endpoints
```
GET    /api/{resource}      - List resources
POST   /api/{resource}      - Create resource
GET    /api/{resource}/{id} - Get single resource
PUT    /api/{resource}/{id} - Update resource
DELETE /api/{resource}/{id} - Delete resource (soft delete)
```

### Action Endpoints
```
POST /api/{resource}/{id}/{action} - Perform action
Examples:
- /api/quotations/{id}/accept
- /api/sales-orders/{id}/approve
- /api/leads/{id}/convert
```

## Service Layer Architecture

### BaseService Pattern
All services extend BaseService which provides:
- Centralized error handling
- Performance logging
- Transaction management
- Audit trail integration

### Service Hierarchy
```
BaseService
├── CustomerService
├── LeadService
├── QuotationService
├── SalesOrderService
├── InvoiceService
├── InventoryService
├── PurchaseOrderService
├── TaxService
└── UserService
```

## Database Schema

### Key Design Principles
1. **Soft Deletes**: isActive flag for audit trail
2. **Audit Fields**: createdAt, updatedAt, createdBy, updatedBy
3. **UUID Primary Keys**: Globally unique identifiers
4. **Referential Integrity**: Foreign key constraints
5. **Indexes**: On foreign keys and frequently queried fields

### Major Entities
- **Company**: Multi-tenant support
- **User**: System users with roles
- **Customer/Supplier**: Business partners
- **Item**: Products and services
- **Account**: Chart of accounts
- **Transaction Tables**: Orders, invoices, payments

## Performance Considerations

### Database
- Connection pooling via Prisma
- Eager loading for related data
- Query optimization with proper indexes
- Pagination for large datasets

### API
- Response caching where appropriate
- Batch operations for bulk updates
- Async processing for long operations
- Rate limiting on sensitive endpoints

### Frontend
- Server-side rendering for SEO
- Code splitting and lazy loading
- Image optimization
- Bundle size optimization

## Deployment Architecture

### Development
```bash
npm run dev         # Next.js dev server
npx prisma studio   # Database GUI
```

### Production
```bash
npm run build       # Build optimized bundle
npm start           # Start production server
pm2 start ecosystem.config.js  # PM2 process management
```

### Environment Variables
- `DATABASE_URL`: Database connection string
- `JWT_SECRET`: Token signing secret (required)
- `NEXT_PUBLIC_API_URL`: API endpoint
- `NODE_ENV`: Environment (development/production)

## Monitoring & Logging

### Application Logs
- Structured logging with context
- Error tracking and alerting
- Performance metrics
- User activity tracking

### Health Checks
- `/api/system/health` - Application health
- Database connectivity checks
- External service monitoring

## Future Considerations

### Scalability
- Microservices architecture for specific modules
- Read replicas for reporting
- Caching layer (Redis)
- Message queue for async processing

### Integrations
- Email service (SendGrid/SES)
- SMS notifications
- Payment gateways
- Third-party accounting systems
- BI/Analytics platforms

## Development Guidelines

### Code Organization
```
/app              # Next.js app router pages
  /(auth)         # Protected routes
  /(public)       # Public routes
  /api            # API endpoints
/components       # React components
/lib              # Business logic
  /services       # Service layer
  /utils          # Utilities
  /validators     # Zod schemas
/prisma           # Database schema
/public           # Static assets
```

### Best Practices
1. Use TypeScript for type safety
2. Follow atomic design for components
3. Implement proper error boundaries
4. Write comprehensive tests
5. Document API endpoints
6. Use conventional commits
7. Perform code reviews

## Maintenance

### Database Migrations
```bash
npx prisma migrate dev    # Development
npx prisma migrate deploy # Production
```

### Dependency Updates
- Regular security updates via `npm audit`
- Major version updates with testing
- Lock file committed for consistency

### Backup Strategy
- Daily database backups
- Transaction log backups
- Document/file storage backups
- Disaster recovery procedures