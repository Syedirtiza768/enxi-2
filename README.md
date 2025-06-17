# Enxi ERP System

A comprehensive, modular ERP system built with Next.js 15, TypeScript, and Test-Driven Development (TDD).

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** SQLite via Prisma ORM
- **UI:** React + TailwindCSS + ShadCN UI
- **Testing:** Jest, Playwright, React Testing Library, MSW
- **Validation:** Zod
- **Authentication:** JWT/Session-based

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up the database
npx prisma generate
npx prisma db push

# Seed the database (choose one)
npm run seed          # Default demo data
npm run seed:uae      # UAE diesel engine maintenance company data

# Run the development server
npm run dev
```

### Production Setup

```bash
# Set your production database URL
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy

# Seed production database (choose one)
npm run seed:production     # Full production seed with users, permissions, COA, and demo data
npm run seed:production-coa # Production Chart of Accounts only
npm run setup:production-coa # Deploy setup for Chart of Accounts

# Start production server
npm start
```

#### Production Seed Details

The production seed (`npm run seed:production`) includes:

- **Company Settings**: Enxi ERP Demo Company with AED currency and 5% tax
- **Complete RBAC System**: 6 roles with granular permissions for all modules
- **Demo Users** (password: `demo123` - MUST be changed):
  - admin@enxierp.com (ADMIN role)
  - sales.manager@enxierp.com (MANAGER role)
  - sales.rep@enxierp.com (SALES_REP role)
  - accountant@enxierp.com (ACCOUNTANT role)
  - warehouse@enxierp.com (WAREHOUSE role)
- **Full Chart of Accounts**: Complete double-entry accounting setup
- **Tax Configuration**: Standard VAT (5%) and Zero VAT (0%)
- **Master Data**: Categories, units of measure, sample items, customers, suppliers
- **Initial Inventory**: 100 units of each product in Main Warehouse

**Important**: After seeding, immediately change all default passwords and update company settings with actual information.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
/app
  /(auth)           # Protected pages
  /(public)         # Public pages
  /api              # API routes
    /auth
    /leads
    /salescases
    /quotations
    /inventory
    /accounting
    /invoices
    /payments
/components
  /ui               # ShadCN components
  /forms            # Form components
  /tables           # Data tables
/lib
  /db               # Database utilities
  /validators       # Zod schemas
  /services         # Business logic
  /utils            # Helpers
/tests
  /unit
  /integration
  /api
  /components
  /e2e
  /performance
  /security
/prisma
  /migrations
  schema.prisma
/docs
  /modules          # Module documentation
  /api              # API specs
/scripts
  /seed             # Industry-specific seeds
```

## Development Workflow

1. Write comprehensive tests first (TDD)
2. Implement minimal passing code
3. Refactor for quality
4. Document thoroughly
5. Update changelog
6. Verify integration

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Testing
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run E2E tests
- `npm run test:coverage` - Run tests with coverage

### Database Seeding
- `npm run seed` - Default demo data
- `npm run seed:uae` - UAE diesel engine maintenance company data
- `npm run seed:production` - Full production seed with users, permissions, COA, and demo data
- `npm run seed:production-coa` - Production Chart of Accounts only
- `npm run setup:production-coa` - Deploy setup for Chart of Accounts

## License

ISC