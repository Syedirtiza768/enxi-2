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

# Run the development server
npm run dev
```

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

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run E2E tests
- `npm run test:coverage` - Run tests with coverage

## License

ISC