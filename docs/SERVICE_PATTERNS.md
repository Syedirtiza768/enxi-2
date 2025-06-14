# Service Layer Patterns - Enxi ERP

## Overview
This document outlines the standard patterns for implementing services in the Enxi ERP system. All services should follow these patterns for consistency and maintainability.

## Base Service Pattern

All services must extend the `BaseService` class:

```typescript
import { BaseService } from '@/lib/services/base.service'

export class MyService extends BaseService {
  constructor() {
    super('MyService') // Pass service name to base constructor
  }
}
```

## Method Patterns

### Public Methods
All public methods should be wrapped with `withLogging`:

```typescript
async createItem(data: CreateItemInput): Promise<Item> {
  return this.withLogging('createItem', async () => {
    // Method implementation
    const item = await prisma.item.create({ data })
    
    // Audit logging
    await auditLog({
      userId: data.createdBy,
      action: AuditAction.CREATE,
      entityType: EntityType.ITEM,
      entityId: item.id,
    })
    
    return item
  })
}
```

### Return Types
Always specify explicit return types:

```typescript
// ✅ Good
async getCustomer(id: string): Promise<Customer | null> {
  // ...
}

// ❌ Bad
async getCustomer(id: string) {
  // ...
}
```

### Error Handling
Let errors bubble up naturally unless specific handling is needed:

```typescript
async updateInventory(itemId: string, quantity: number): Promise<void> {
  return this.withLogging('updateInventory', async () => {
    const item = await prisma.item.findUnique({ where: { id: itemId } })
    
    if (!item) {
      throw new Error('Item not found')
    }
    
    if (item.availableQuantity < quantity) {
      throw new Error('Insufficient inventory')
    }
    
    // Update logic...
  })
}
```

## Database Transactions

Use transactions for operations that modify multiple entities:

```typescript
async createOrderWithItems(
  orderData: CreateOrderInput,
  items: CreateOrderItemInput[]
): Promise<Order> {
  return this.withLogging('createOrderWithItems', async () => {
    return await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({ data: orderData })
      
      // Create order items
      await tx.orderItem.createMany({
        data: items.map(item => ({
          ...item,
          orderId: order.id,
        })),
      })
      
      // Update inventory
      for (const item of items) {
        await tx.item.update({
          where: { id: item.itemId },
          data: {
            availableQuantity: { decrement: item.quantity },
          },
        })
      }
      
      return order
    })
  })
}
```

## Query Patterns

### List Methods
Standard list method with pagination and filtering:

```typescript
async listCustomers(params: {
  search?: string
  status?: CustomerStatus
  limit?: number
  offset?: number
}): Promise<{ items: Customer[]; total: number }> {
  return this.withLogging('listCustomers', async () => {
    const where: Prisma.CustomerWhereInput = {}
    
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ]
    }
    
    if (params.status) {
      where.status = params.status
    }
    
    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        take: params.limit || 50,
        skip: params.offset || 0,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ])
    
    return { items, total }
  })
}
```

### Include Relations
Be explicit about included relations:

```typescript
async getInvoiceWithDetails(id: string): Promise<InvoiceWithDetails | null> {
  return this.withLogging('getInvoiceWithDetails', async () => {
    return await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            item: true,
          },
        },
        payments: true,
      },
    })
  })
}
```

## Audit Logging

Always log significant actions:

```typescript
import { auditLog } from '@/lib/audit/logger'
import { AuditAction, EntityType } from '@/lib/validators/audit.validator'

// In your method:
await auditLog({
  userId: user.id,
  action: AuditAction.UPDATE,
  entityType: EntityType.CUSTOMER,
  entityId: customer.id,
  changes: {
    before: { status: 'active' },
    after: { status: 'inactive' },
  },
})
```

## Service Dependencies

Inject other services when needed:

```typescript
export class InvoiceService extends BaseService {
  private customerService: CustomerService
  private inventoryService: InventoryService
  
  constructor() {
    super('InvoiceService')
    this.customerService = new CustomerService()
    this.inventoryService = new InventoryService()
  }
  
  async createInvoice(data: CreateInvoiceInput): Promise<Invoice> {
    return this.withLogging('createInvoice', async () => {
      // Validate customer
      const customer = await this.customerService.getCustomer(data.customerId)
      if (!customer) {
        throw new Error('Customer not found')
      }
      
      // Check inventory
      for (const item of data.items) {
        await this.inventoryService.checkAvailability(item.itemId, item.quantity)
      }
      
      // Create invoice...
    })
  }
}
```

## Type Safety

### Input Types
Define clear input types:

```typescript
interface CreateCustomerInput {
  name: string
  email: string
  phone?: string
  creditLimit?: number
  createdBy: string
}

interface UpdateCustomerInput {
  name?: string
  email?: string
  phone?: string
  creditLimit?: number
  status?: CustomerStatus
  updatedBy: string
}
```

### Use Prisma Types
Leverage Prisma's generated types:

```typescript
import { Prisma } from '@/lib/generated/prisma'

async findCustomers(
  where: Prisma.CustomerWhereInput
): Promise<Customer[]> {
  return this.withLogging('findCustomers', async () => {
    return await prisma.customer.findMany({ where })
  })
}
```

## Testing Services

Services should be easily testable:

```typescript
// customer.service.test.ts
import { CustomerService } from './customer.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  customer: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}))

describe('CustomerService', () => {
  let service: CustomerService
  
  beforeEach(() => {
    service = new CustomerService()
    jest.clearAllMocks()
  })
  
  describe('createCustomer', () => {
    it('should create a customer', async () => {
      const input = {
        name: 'Test Customer',
        email: 'test@example.com',
        createdBy: 'user-1',
      }
      
      const expected = { id: '1', ...input }
      prisma.customer.create.mockResolvedValue(expected)
      
      const result = await service.createCustomer(input)
      
      expect(result).toEqual(expected)
      expect(prisma.customer.create).toHaveBeenCalledWith({ data: input })
    })
  })
})
```

## Common Patterns

### Soft Delete
```typescript
async deleteCustomer(id: string, userId: string): Promise<void> {
  return this.withLogging('deleteCustomer', async () => {
    await prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        status: CustomerStatus.INACTIVE,
      },
    })
    
    await auditLog({
      userId,
      action: AuditAction.DELETE,
      entityType: EntityType.CUSTOMER,
      entityId: id,
    })
  })
}
```

### Validation
```typescript
private validateCustomerData(data: CreateCustomerInput): void {
  if (!data.email || !isValidEmail(data.email)) {
    throw new Error('Invalid email address')
  }
  
  if (data.creditLimit && data.creditLimit < 0) {
    throw new Error('Credit limit cannot be negative')
  }
}
```

### Number Generation
```typescript
private async generateInvoiceNumber(): Promise<string> {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  
  const count = await prisma.invoice.count({
    where: {
      invoiceNumber: { startsWith: `INV-${year}${month}` },
    },
  })
  
  return `INV-${year}${month}${String(count + 1).padStart(4, '0')}`
}
```

## Best Practices

1. **Single Responsibility**: Each service should handle one domain area
2. **Consistent Naming**: Use clear, descriptive method names
3. **Error Messages**: Provide helpful error messages
4. **Logging**: Use the built-in logging from BaseService
5. **Type Safety**: Always use TypeScript types
6. **Transactions**: Use for multi-entity operations
7. **Audit Trail**: Log all significant actions
8. **Performance**: Use `Promise.all()` for parallel operations
9. **Validation**: Validate input data before processing
10. **Documentation**: Add JSDoc comments for complex methods

## Example Service

Here's a complete example following all patterns:

```typescript
import { BaseService } from '@/lib/services/base.service'
import { prisma } from '@/lib/db/prisma'
import { auditLog } from '@/lib/audit/logger'
import { AuditAction, EntityType } from '@/lib/validators/audit.validator'
import { Customer, CustomerStatus, Prisma } from '@/lib/generated/prisma'

interface CreateCustomerInput {
  name: string
  email: string
  phone?: string
  creditLimit?: number
  createdBy: string
}

interface UpdateCustomerInput {
  name?: string
  email?: string
  phone?: string
  creditLimit?: number
  status?: CustomerStatus
  updatedBy: string
}

export class CustomerService extends BaseService {
  constructor() {
    super('CustomerService')
  }

  /**
   * Create a new customer
   */
  async createCustomer(data: CreateCustomerInput): Promise<Customer> {
    return this.withLogging('createCustomer', async () => {
      // Validate input
      this.validateCustomerData(data)
      
      // Check for duplicates
      const existing = await prisma.customer.findFirst({
        where: { email: data.email },
      })
      
      if (existing) {
        throw new Error('Customer with this email already exists')
      }
      
      // Create customer
      const customer = await prisma.customer.create({
        data: {
          ...data,
          customerNumber: await this.generateCustomerNumber(),
          status: CustomerStatus.ACTIVE,
        },
      })
      
      // Audit log
      await auditLog({
        userId: data.createdBy,
        action: AuditAction.CREATE,
        entityType: EntityType.CUSTOMER,
        entityId: customer.id,
      })
      
      return customer
    })
  }

  /**
   * Get customer by ID
   */
  async getCustomer(id: string): Promise<Customer | null> {
    return this.withLogging('getCustomer', async () => {
      return await prisma.customer.findUnique({
        where: { id },
      })
    })
  }

  /**
   * Update customer
   */
  async updateCustomer(
    id: string,
    data: UpdateCustomerInput
  ): Promise<Customer> {
    return this.withLogging('updateCustomer', async () => {
      const customer = await prisma.customer.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })
      
      await auditLog({
        userId: data.updatedBy,
        action: AuditAction.UPDATE,
        entityType: EntityType.CUSTOMER,
        entityId: id,
      })
      
      return customer
    })
  }

  /**
   * List customers with pagination and filtering
   */
  async listCustomers(params: {
    search?: string
    status?: CustomerStatus
    limit?: number
    offset?: number
  }): Promise<{ items: Customer[]; total: number }> {
    return this.withLogging('listCustomers', async () => {
      const where: Prisma.CustomerWhereInput = {}
      
      if (params.search) {
        where.OR = [
          { name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ]
      }
      
      if (params.status) {
        where.status = params.status
      }
      
      const [items, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          take: params.limit || 50,
          skip: params.offset || 0,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.customer.count({ where }),
      ])
      
      return { items, total }
    })
  }

  private validateCustomerData(data: CreateCustomerInput): void {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Invalid email address')
    }
    
    if (data.creditLimit && data.creditLimit < 0) {
      throw new Error('Credit limit cannot be negative')
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  private async generateCustomerNumber(): Promise<string> {
    const count = await prisma.customer.count()
    return `CUST-${String(count + 1).padStart(6, '0')}`
  }
}
```

This pattern ensures consistency, maintainability, and testability across all services in the Enxi ERP system.