# Enxi ERP Development Reference

## Table of Contents
1. [Phase 1: Foundation](#phase-1-foundation)
   - [Authentication System](#authentication-system)
   - [Layout & Navigation](#layout--navigation)
   - [Audit Trail Infrastructure](#audit-trail-infrastructure)
2. [Architecture Decisions](#architecture-decisions)
3. [Testing Strategy](#testing-strategy)
4. [API Documentation](#api-documentation)
5. [Database Schema](#database-schema)
6. [UI/UX Patterns](#uiux-patterns)
7. [Security Considerations](#security-considerations)
8. [Development Workflow](#development-workflow)

---

## Phase 1: Foundation

### Overview
Phase 1 establishes the core infrastructure for the ERP system, including authentication, navigation, and comprehensive audit logging. All features follow strict Test-Driven Development (TDD) methodology.

### Authentication System

#### Architecture
- **JWT-based authentication** with 24-hour token expiry
- **Dual storage**: localStorage for client-side, httpOnly cookies for SSR
- **Password hashing** using bcryptjs with salt rounds of 10
- **Role-based access** with ADMIN and USER roles

#### Implementation Details

##### User Model (Prisma Schema)
```prisma
model User {
  id        String      @id @default(cuid())
  username  String      @unique
  email     String      @unique
  password  String
  role      Role        @default(USER)
  isActive  Boolean     @default(true)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  
  // Relations
  auditLogs AuditLog[]

  @@index([username])
  @@index([email])
}

enum Role {
  ADMIN
  USER
}
```

##### Auth Service (`lib/services/auth.service.ts`)
Key methods:
- `validateUser(username, password)`: Validates credentials and returns user data
- `generateToken(user)`: Creates JWT token with user payload
- `verifyToken(token)`: Validates and decodes JWT token
- `hashPassword(password)`: Hashes password using bcrypt
- `createUser(data)`: Creates new user with hashed password
- `getUserById(id)`: Retrieves user by ID

##### API Endpoints
1. **POST /api/auth/login**
   - Body: `{ username: string, password: string }`
   - Response: `{ token: string, user: UserResponse }`
   - Audit: Logs both successful and failed login attempts

2. **POST /api/auth/register**
   - Body: `{ username: string, email: string, password: string, role?: Role }`
   - Response: `{ token: string, user: UserResponse }`
   - Status: 201 on success

3. **GET /api/auth/profile**
   - Headers: `Authorization: Bearer <token>`
   - Response: `UserResponse`
   - Protected: Requires valid JWT

##### Middleware (`middleware.ts`)
- Protects all routes except public ones (`/login`, `/api/auth/*`)
- Extracts user info from JWT and adds to request headers
- Redirects unauthenticated requests to login
- Returns 401 for unauthorized API requests

##### UI Components
- **LoginForm** (`components/auth/login-form.tsx`)
  - Zod validation for form inputs
  - Real-time validation error display
  - Loading states during submission
  - Error handling for failed attempts
  - Stores token in localStorage and sets cookie

##### Security Features
- Password minimum length: 6 characters
- Username minimum length: 3 characters
- Failed login attempts are logged with IP address
- Tokens contain user ID, username, email, and role
- Environment-based JWT secret

#### Testing Coverage
- **Unit Tests**: 12 tests for AuthService (100% coverage)
- **API Tests**: Login, register, and profile endpoints
- **Component Tests**: LoginForm validation and submission
- **E2E Tests**: Complete authentication flow

#### Default Admin User
- Username: `admin`
- Password: `admin123`
- Seeded via `scripts/seed/seed-admin.ts`

---

### Layout & Navigation

#### Architecture
- **Client-side navigation** with Next.js App Router
- **Protected layout** for authenticated pages
- **Responsive sidebar** with module navigation
- **Route groups**: `(auth)` for protected, `(public)` for open

#### Implementation Details

##### Layout Structure (`app/(auth)/layout.tsx`)
- Fixed sidebar (256px width) with dark theme
- Main content area with header showing current user
- Logout functionality clears token and redirects
- Navigation items with Lucide React icons

##### Navigation Menu
```typescript
const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/sales-cases', label: 'Sales Cases', icon: Briefcase },
  { href: '/quotations', label: 'Quotations', icon: FileText },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/accounting', label: 'Accounting', icon: Calculator },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/payments', label: 'Payments', icon: DollarSign },
  { href: '/audit', label: 'Audit Trail', icon: FileText },
]
```

##### Route Organization
```
app/
├── (auth)/          # Protected routes
│   ├── layout.tsx   # Auth layout with sidebar
│   ├── dashboard/   # Dashboard page
│   └── audit/       # Audit trail viewer
├── (public)/        # Public routes
│   └── login/       # Login page
└── page.tsx         # Root (redirects to login)
```

#### UI/UX Patterns
- Consistent spacing: 8px base unit (p-2, p-4, p-8)
- Color scheme: Gray-900 sidebar, white content area
- Hover states for interactive elements
- Loading states for async operations

---

### Audit Trail Infrastructure

#### Architecture
- **Automatic logging** via Prisma extensions
- **Comprehensive tracking**: User, action, entity, timestamp, IP, user agent
- **Before/after data capture** for updates
- **Non-blocking**: Audit failures don't break operations
- **Performance optimized**: Indexed queries, pagination

#### Implementation Details

##### AuditLog Model (Prisma Schema)
```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String   // CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, IMPORT
  entityType String   // User, Lead, SalesCase, etc.
  entityId   String
  metadata   Json?    // Additional context
  beforeData Json?    // State before change
  afterData  Json?    // State after change
  ipAddress  String?
  userAgent  String?
  timestamp  DateTime @default(now())
  
  // Relations
  user       User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entityType, entityId])
  @@index([action])
  @@index([timestamp])
}
```

##### Audit Service (`lib/services/audit.service.ts`)
Key methods:
- `logAction(data)`: Creates audit log entry (non-throwing)
- `getAuditLogs(filters, pagination)`: Retrieves logs with filtering
- `getEntityHistory(entityType, entityId)`: Gets history for specific entity
- `getUserActivity(userId, pagination)`: Gets user's actions
- `generateAuditReport(startDate, endDate)`: Creates summary statistics

##### Audit Actions Enum
```typescript
export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}
```

##### Prisma Extension (`lib/db/prisma-with-audit.ts`)
Automatically logs:
- CREATE operations with created data
- UPDATE operations with before/after data
- DELETE operations with deleted data
- Skips AuditLog model to prevent recursion

Usage:
```typescript
const auditedPrisma = prismaWithAudit({
  userId: 'user-123',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
})

// All operations are automatically logged
await auditedPrisma.user.create({ data: {...} })
```

##### Audit Context Helper (`lib/utils/audit-context.ts`)
- `extractAuditContext(request)`: Extracts user, IP, and user agent from request
- `withAudit()`: Wrapper for manual audit logging with error handling

##### API Integration
- **GET /api/audit**: Paginated audit log viewer
  - Query params: `page`, `limit`, `userId`, `entityType`, `action`
  - Returns: Paginated results with total count

##### UI Components
- **Audit Trail Viewer** (`app/(auth)/audit/page.tsx`)
  - Real-time log display with pagination
  - Color-coded actions (CREATE=green, UPDATE=blue, DELETE=red)
  - Metadata display
  - Date formatting

#### Testing Coverage
- **Unit Tests**: 7 tests for AuditService (100% coverage)
- **Integration**: Login endpoint logs attempts
- **Manual Testing**: Verified via UI

#### Performance Considerations
- Indexed on userId, entityType+entityId, action, timestamp
- Pagination to handle large datasets
- Non-blocking logging (errors logged to console)
- JSON fields for flexible metadata storage

---

## Architecture Decisions

### Technology Choices
1. **Next.js 15 App Router**: Modern React framework with SSR support
2. **TypeScript**: Type safety and better developer experience
3. **Prisma ORM**: Type-safe database access with migrations
4. **SQLite**: Simple, file-based database perfect for development
5. **JWT**: Stateless authentication tokens
6. **Zod**: Runtime type validation for API inputs
7. **ShadCN UI**: Customizable component library
8. **TailwindCSS**: Utility-first CSS framework

### Design Patterns
1. **Service Layer**: Business logic separated from API routes
2. **Repository Pattern**: Prisma for data access
3. **Middleware Pattern**: Authentication and audit logging
4. **Factory Pattern**: Audited Prisma instances
5. **Singleton Pattern**: Prisma client instance

### Folder Structure Decisions
- **/app**: Next.js pages and API routes
- **/components**: Reusable UI components
- **/lib**: Business logic, services, utilities
- **/tests**: Organized by test type (unit, integration, etc.)
- **/docs**: Comprehensive documentation
- **/scripts**: Utility scripts (seeding, etc.)

---

## Testing Strategy

### Test Organization
```
tests/
├── unit/           # Service and utility tests
├── integration/    # Database interaction tests
├── api/           # API endpoint tests
├── components/    # React component tests
├── e2e/           # End-to-end user flow tests
├── performance/   # Load and efficiency tests
├── security/      # Vulnerability tests
└── accessibility/ # WCAG compliance tests
```

### TDD Workflow
1. **RED Phase**: Write failing tests for all layers
2. **GREEN Phase**: Implement minimal code to pass
3. **REFACTOR Phase**: Improve code quality
4. **INTEGRATE Phase**: Verify with existing system
5. **DOCUMENT Phase**: Update documentation

### Test Coverage Requirements
- Business Logic: 100%
- Overall: 90% minimum
- Critical paths: E2E tests required

### Testing Tools
- **Jest**: Unit and integration testing
- **React Testing Library**: Component testing
- **Playwright**: E2E testing
- **MSW**: API mocking
- **Supertest**: HTTP testing

### Current Test Status
- **Unit Tests**: 19/19 passing (Auth + Audit services)
- **Integration Tests**: 4/4 passing (Full auth flow)
- **API Tests**: 9/9 passing (Endpoint logic)
- **Component Tests**: 7/7 passing (Login form logic)
- **E2E Tests**: Written for auth flow (Playwright)
- **Total**: 39/39 tests passing
- **Coverage**: 100% for implemented services

### Test Strategy Refinements
- **API Tests**: Testing business logic separately from Next.js server components
- **Component Tests**: Testing form logic without complex UI dependencies
- **Integration Tests**: Full database and service integration
- **Mocking Strategy**: Services mocked in API tests, real database in integration tests

---

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Login with username and password.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "cmb9r2meo0000v28mrzq2k3sg",
    "username": "admin",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

**Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

**Audit:** Logs both successful and failed attempts with IP address

#### POST /api/auth/register
Create a new user account.

**Request:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "role": "USER"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "cmb9r2meo0001v28mrzq2k3sg",
    "username": "newuser",
    "email": "newuser@example.com",
    "role": "USER"
  }
}
```

#### GET /api/auth/profile
Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "cmb9r2meo0000v28mrzq2k3sg",
  "username": "admin",
  "email": "admin@example.com",
  "role": "ADMIN"
}
```

### Audit Endpoints

#### GET /api/audit
Get paginated audit logs.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `userId` (string): Filter by user
- `entityType` (string): Filter by entity type
- `action` (string): Filter by action

**Response (200):**
```json
{
  "data": [
    {
      "id": "cmb9r2meo0002v28mrzq2k3sg",
      "userId": "cmb9r2meo0000v28mrzq2k3sg",
      "action": "LOGIN",
      "entityType": "User",
      "entityId": "cmb9r2meo0000v28mrzq2k3sg",
      "metadata": {
        "success": true,
        "username": "admin"
      },
      "timestamp": "2024-01-01T12:00:00.000Z",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

---

## Database Schema

### Current Schema
```prisma
// User Management
model User {
  id        String      @id @default(cuid())
  username  String      @unique
  email     String      @unique
  password  String
  role      Role        @default(USER)
  isActive  Boolean     @default(true)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  auditLogs AuditLog[]
}

// Audit Trail
model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String
  entityType String
  entityId   String
  metadata   Json?
  beforeData Json?
  afterData  Json?
  ipAddress  String?
  userAgent  String?
  timestamp  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])
}

// Enums
enum Role {
  ADMIN
  USER
}
```

### Indexing Strategy
- User: username, email (unique constraints act as indexes)
- AuditLog: userId, entityType+entityId, action, timestamp

### Migration Management
- Using Prisma migrations for production
- `prisma db push` for development
- Schema versioning in git

---

## UI/UX Patterns

### Component Library (ShadCN UI)
- **Button**: Primary actions with loading states
- **Card**: Content containers with header/content/footer
- **Input**: Form inputs with consistent styling
- **Label**: Accessible form labels

### Design System
- **Colors**: 
  - Primary: Slate/Gray palette
  - Success: Green-600
  - Warning: Blue-600
  - Error: Red-600
  - Background: Gray-50 (light), Gray-900 (dark)
- **Spacing**: 8px base unit (0.5rem)
- **Typography**: System fonts with responsive sizing
- **Border Radius**: 0.5rem default

### Accessibility
- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus visible indicators
- Error messages linked to inputs

### Responsive Design
- Mobile-first approach
- Sidebar hidden on mobile (future: hamburger menu)
- Fluid typography and spacing
- Flexible grid layouts

---

## Security Considerations

### Authentication Security
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 24 hours
- Tokens stored in httpOnly cookies for SSR
- Environment-based secrets

### API Security
- All routes protected by default
- Role-based access control ready
- Input validation with Zod
- SQL injection prevention via Prisma

### Audit Security
- All actions logged with user context
- IP address tracking
- Failed login attempt monitoring
- Immutable audit logs

### Future Enhancements
- Rate limiting for auth endpoints
- CSRF protection
- Content Security Policy headers
- Two-factor authentication

---

## Development Workflow

### Git Workflow
1. Feature branches from main
2. Conventional commits
3. PR with all tests passing
4. Code review required
5. Squash and merge

### Local Development
```bash
# Install dependencies
npm install

# Set up database
npm run db:push
npm run db:generate

# Seed admin user
npm run seed:admin

# Start development
npm run dev

# Run tests
npm test
npm run test:watch
npm run test:coverage
npm run test:e2e

# Run integration test
npm run test:integration
```

### Common Issues & Solutions

#### TailwindCSS v4 Configuration
**Issue**: TailwindCSS v4 requires different configuration
**Solution**: Use proper v4 setup:

**postcss.config.mjs**:
```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

**globals.css** (v4 syntax):
```css
@import "tailwindcss";

:root {
  /* CSS variables */
}

/* Direct CSS instead of @apply */
body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

**tailwind.config.ts** (simplified for v4):
```typescript
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { /* custom theme */ } },
  plugins: [], // No plugins needed for basic setup
}
```

#### Port Already in Use
**Error**: Port 3000 is in use
**Solution**: Next.js will automatically use available port (3001, 3002, etc.)
Or kill existing process:
```bash
lsof -ti:3000 | xargs kill
```

### Environment Variables
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

### Code Quality Tools
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js configuration
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **Playwright**: E2E testing

### Debugging
- Server logs in terminal
- Client logs in browser console
- Prisma query logging available
- Source maps enabled in development

---

## Phase 1 Summary

### Completed Features
✅ JWT Authentication with role support  
✅ Protected routes and API endpoints  
✅ Basic layout with navigation  
✅ Comprehensive audit trail  
✅ Admin user seeding  
✅ 100% test coverage for services  

### Key Achievements
- Solid foundation for future development
- Strict TDD methodology followed
- Security-first approach
- Performance optimized
- Fully documented

### Lessons Learned
1. Jest configuration needs adjustment for Next.js 15
2. React 19 requires careful dependency management
3. Prisma extensions powerful for cross-cutting concerns
4. Audit logging critical for compliance

### Next Steps
- Phase 2: Lead Management CRUD
- Customer entity setup
- Enhanced validation
- Batch operations support

---

*Last Updated: 2025-05-29*
*Version: 1.0.0*