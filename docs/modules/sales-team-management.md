# Sales Team Management Module

## Overview

The Sales Team Management module provides hierarchical sales operations support with customer assignment, team structure management, and access control based on sales roles.

## Features

### 1. Customer Assignment
- Each customer can be assigned to a specific salesperson or sales manager
- Sales managers can have exclusive customers assigned directly to them
- Assignment tracking with timestamp and notes

### 2. Sales Team Hierarchy
- Each salesperson reports to one sales manager
- A sales manager can have multiple salespeople under them
- Visual team structure representation

### 3. Permissions and Access Control
- **Salespeople**: Only have access to their assigned customers
- **Sales Managers**: Have access to:
  - Their own exclusive customers
  - Customers of all their reporting salespeople
- **Admins**: Have access to all customers

### 4. Performance Tracking
- Monthly sales targets and achievements
- Year-to-date sales tracking
- Commission percentage configuration
- Territory and specialization assignments

## Data Model

### Customer Model Updates
```prisma
model Customer {
  // ... existing fields
  
  // Sales team assignment
  assignedToId    String?
  assignedTo      User?      @relation("CustomerAssignment", fields: [assignedToId], references: [id])
  assignedAt      DateTime?
  assignedBy      String?
  assignmentNotes String?
}
```

### User Model Updates
```prisma
model User {
  // ... existing fields
  
  // Sales team hierarchy
  managerId         String?
  manager           User?      @relation("SalesTeamHierarchy", fields: [managerId], references: [id])
  managedUsers      User[]     @relation("SalesTeamHierarchy")
  assignedCustomers Customer[] @relation("CustomerAssignment")
  salesTeamMember   SalesTeamMember?
}
```

### SalesTeamMember Model
```prisma
model SalesTeamMember {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])
  
  // Sales team details
  salesTarget       Float    @default(0) // Monthly sales target
  commission        Float    @default(0) // Commission percentage
  territory         String?  // Sales territory/region
  specialization    String?  // Product line or industry focus
  
  // Performance tracking
  currentMonthSales Float    @default(0)
  yearToDateSales   Float    @default(0)
  
  // Team assignment
  teamName          String?
  isTeamLead        Boolean  @default(false)
}
```

## API Endpoints

### Sales Team Management

#### GET /api/sales-team
Get sales team hierarchy or unassigned customers

**Query Parameters:**
- `view`: 'hierarchy' (default) or 'unassigned'
- `search`: Search term for unassigned customers
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "manager": {
    "id": "manager-id",
    "username": "john.manager",
    "email": "john@company.com",
    "name": "John Manager"
  },
  "teamMembers": [
    {
      "id": "rep-id",
      "username": "jane.sales",
      "email": "jane@company.com",
      "name": "Jane Sales",
      "customerCount": 15,
      "salesTeamMember": {
        "salesTarget": 50000,
        "currentMonthSales": 35000,
        "yearToDateSales": 420000
      }
    }
  ]
}
```

#### POST /api/sales-team/assign-manager
Assign a sales manager to a salesperson

**Request Body:**
```json
{
  "salespersonId": "salesperson-id",
  "managerId": "manager-id"
}
```

#### POST /api/sales-team/assign-customer
Assign a customer to a salesperson

**Request Body:**
```json
{
  "customerId": "customer-id",
  "salespersonId": "salesperson-id",
  "notes": "Assignment notes (optional)"
}
```

#### GET /api/sales-team/performance
Get team performance metrics (managers only)

**Response:**
```json
{
  "manager": {
    "customerCount": 5,
    "currentMonthSales": 25000,
    "yearToDateSales": 300000,
    "salesTarget": 30000
  },
  "teamMembers": [
    {
      "userId": "rep-id",
      "customerCount": 15,
      "currentMonthSales": 35000,
      "yearToDateSales": 420000,
      "salesTarget": 50000
    }
  ],
  "totalCurrentMonthSales": 60000,
  "totalYearToDateSales": 720000,
  "totalTarget": 80000,
  "totalCustomers": 20,
  "targetAchievement": 75
}
```

## Service Methods

### SalesTeamService

```typescript
// Assign a sales manager to a salesperson
assignSalesManager(salespersonId: string, managerId: string, assignedBy: string)

// Assign a customer to a salesperson
assignCustomerToSalesperson(customerId: string, salespersonId: string, assignedBy: string, notes?: string)

// Get team hierarchy for a manager
getTeamHierarchy(managerId: string)

// Get all accessible customers for a user
getAccessibleCustomers(userId: string, filters?: {...})

// Check if a user can access a specific customer
canAccessCustomer(userId: string, customerId: string): Promise<boolean>

// Get team performance metrics
getTeamPerformance(managerId: string)

// Update sales team member details
updateSalesTeamMember(userId: string, data: {...}, updatedBy: string)

// Get unassigned customers
getUnassignedCustomers(filters?: {...})
```

## Access Control Rules

### Customer Access
1. **SALES_REP**: Can only access customers assigned to them
2. **MANAGER**: Can access:
   - Customers assigned directly to them
   - Customers assigned to their team members
3. **ADMIN/SUPER_ADMIN**: Can access all customers

### Team Management
1. **SALES_REP**: Can view their own assignment and manager
2. **MANAGER**: Can:
   - View and manage their team members
   - Assign customers within their team
   - View team performance metrics
3. **ADMIN/SUPER_ADMIN**: Can:
   - Manage all team hierarchies
   - Assign managers to salespeople
   - View all performance metrics

## UI Components

### Sales Team Page (`/sales-team`)
- **My Team Tab**: Shows team hierarchy and member performance
- **Unassigned Customers Tab**: Lists customers without assignments
- Performance visualization with progress bars
- Quick navigation to team member details

### Assignment Page (`/sales-team/assign`)
- **Customer Assignment**: Assign customers to salespeople
- **Manager Assignment**: Assign salespeople to managers
- Form validation and error handling
- Assignment notes support

## Integration Points

### Customer Service
- Customers are filtered based on sales team assignments
- Access control is enforced at the service level

### Lead Conversion
- When converting leads to customers, they can be immediately assigned to a salesperson

### Reporting
- Sales performance metrics integrate with the reporting module
- Team performance data available for dashboards

## Security Considerations

1. **Role-based Access**: Enforced through RBAC middleware
2. **Data Isolation**: Customers are isolated based on team assignments
3. **Audit Trail**: All assignments and changes are logged
4. **Permission Checks**: Service methods validate user permissions

## Best Practices

1. **Regular Reviews**: Review team assignments periodically
2. **Balanced Distribution**: Ensure customers are evenly distributed
3. **Performance Monitoring**: Track team performance regularly
4. **Clear Territories**: Define clear territories and specializations
5. **Succession Planning**: Plan for team member transitions

## Future Enhancements

1. **Team Goals**: Set and track team-wide goals
2. **Commission Calculation**: Automated commission calculations
3. **Territory Management**: Geographic territory visualization
4. **Lead Distribution**: Automated lead assignment based on rules
5. **Performance Analytics**: Advanced analytics and forecasting