# User Management & RBAC Design Document

## Overview
This document outlines the comprehensive Role-Based Access Control (RBAC) system for Enxi ERP.

## Current State Analysis
- Basic User model exists with simple ADMIN/USER roles
- No granular permissions system
- No user management UI
- Basic audit logging exists but not integrated with user actions

## Proposed RBAC Architecture

### 1. Database Schema Updates

#### Enhanced Role System
```prisma
enum Role {
  SUPER_ADMIN    // Full system access
  ADMIN          // Admin access (can manage users)
  MANAGER        // Can manage teams and approve
  SALES_REP      // Sales operations
  ACCOUNTANT     // Financial operations
  WAREHOUSE      // Inventory operations
  VIEWER         // Read-only access
  CUSTOM         // Custom role with specific permissions
}
```

#### New Models
```prisma
model Permission {
  id          String   @id @default(cuid())
  code        String   @unique // e.g., "sales.create", "inventory.update"
  name        String
  description String?
  module      String   // sales, inventory, accounting, etc.
  action      String   // create, read, update, delete, approve, etc.
  createdAt   DateTime @default(now())
  
  rolePermissions RolePermission[]
  userPermissions UserPermission[]
}

model RolePermission {
  id           String     @id @default(cuid())
  role         Role
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id])
  createdAt    DateTime   @default(now())
  
  @@unique([role, permissionId])
}

model UserPermission {
  id           String     @id @default(cuid())
  userId       String
  user         User       @relation(fields: [userId], references: [id])
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id])
  granted      Boolean    @default(true) // Can revoke specific permissions
  expiresAt    DateTime?  // Temporary permissions
  createdAt    DateTime   @default(now())
  
  @@unique([userId, permissionId])
}

model UserProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  firstName     String?
  lastName      String?
  phone         String?
  department    String?
  jobTitle      String?
  avatarUrl     String?
  timezone      String   @default("UTC")
  language      String   @default("en")
  lastLoginAt   DateTime?
  lastLoginIp   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model UserSession {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  token        String   @unique
  ipAddress    String?
  userAgent    String?
  lastActivity DateTime @default(now())
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  
  @@index([userId])
  @@index([token])
  @@index([expiresAt])
}
```

### 2. Permission Structure

#### Module-based Permissions
```
sales.create         - Create sales cases, quotations
sales.read          - View sales data
sales.update        - Edit sales records
sales.delete        - Delete sales records
sales.approve       - Approve quotations, orders

inventory.create    - Add new items, categories
inventory.read      - View inventory
inventory.update    - Update stock levels
inventory.delete    - Remove items
inventory.adjust    - Make stock adjustments

accounting.create   - Create journal entries
accounting.read     - View financial data
accounting.update   - Edit transactions
accounting.delete   - Delete transactions
accounting.approve  - Approve financial transactions

users.create        - Create new users
users.read          - View user list
users.update        - Edit user details
users.delete        - Deactivate users
users.permissions   - Manage user permissions

reports.sales       - Access sales reports
reports.inventory   - Access inventory reports
reports.financial   - Access financial reports
reports.export      - Export report data
```

### 3. Default Role Permissions

#### SUPER_ADMIN
- All permissions

#### ADMIN
- All permissions except system configuration

#### MANAGER
- sales.* (all)
- inventory.read, inventory.update
- accounting.read
- reports.* (all)
- users.read

#### SALES_REP
- sales.create, sales.read, sales.update
- inventory.read
- customers.* (all)
- reports.sales

#### ACCOUNTANT
- accounting.* (all)
- sales.read
- inventory.read
- reports.financial

#### WAREHOUSE
- inventory.* (all)
- sales.read
- reports.inventory

#### VIEWER
- *.read (all read permissions)

### 4. User Management Features

#### User CRUD Operations
- Create new users with role assignment
- Update user details and roles
- Deactivate/reactivate users
- Reset passwords
- Force logout

#### Profile Management
- User profile with personal details
- Avatar upload
- Timezone and language preferences
- Department and job title

#### Session Management
- Active sessions view
- Force logout specific sessions
- Session timeout configuration
- Login history

#### Permission Management
- Assign/revoke individual permissions
- Temporary permission grants
- Permission audit trail
- Bulk permission updates

#### Activity Monitoring
- Real-time activity dashboard
- Login/logout tracking
- Action audit trail
- Suspicious activity alerts

### 5. Security Features

#### Authentication
- Strong password requirements
- Two-factor authentication (future)
- Password reset with email verification
- Account lockout after failed attempts

#### Authorization
- JWT-based authentication
- Permission-based route guards
- API endpoint protection
- Frontend component visibility control

#### Audit Trail
- All user actions logged
- IP address tracking
- Before/after data capture
- Retention policies

### 6. UI Components

#### User List Page
- Sortable/filterable user table
- Quick actions (edit, deactivate)
- Bulk operations
- Export functionality

#### User Detail Page
- User information tabs
- Permission matrix view
- Activity history
- Session management

#### User Form
- Create/edit user
- Role selection
- Permission overrides
- Password management

#### Permission Matrix
- Visual permission grid
- Module-based grouping
- Quick toggle controls
- Inheritance visualization

#### Activity Dashboard
- Real-time activity feed
- User statistics
- Login patterns
- Security alerts

## Implementation Plan

### Phase 1: Database & Backend
1. Update schema with new models
2. Create migration
3. Implement UserService with RBAC
4. Create permission checking middleware
5. Update existing services with permission checks

### Phase 2: API Endpoints
1. User CRUD endpoints
2. Permission management endpoints
3. Session management endpoints
4. Activity logging endpoints

### Phase 3: Frontend
1. User list component
2. User form component
3. Permission matrix component
4. Activity dashboard
5. Integration with existing pages

### Phase 4: Testing & Documentation
1. Unit tests for all services
2. Integration tests for RBAC
3. E2E tests for user workflows
4. Update API documentation
5. Create user guide

## Migration Strategy

1. Seed default permissions
2. Map existing roles to new permissions
3. Create default admin user
4. Migrate existing users
5. Enable new RBAC system

## Future Enhancements

1. Two-factor authentication
2. OAuth integration
3. Role templates
4. Permission approval workflow
5. Advanced audit analytics