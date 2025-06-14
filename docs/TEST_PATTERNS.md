# Test Patterns - Enxi ERP

## Overview
This document outlines the standard patterns for writing tests in the Enxi ERP system. We use Jest for unit and integration tests, and Playwright for E2E tests.

## Test Structure

### Directory Organization
```
tests/
├── unit/               # Unit tests (isolated, mocked)
│   ├── services/       # Service class tests
│   ├── utils/          # Utility function tests
│   └── validators/     # Validator tests
├── integration/        # Integration tests (real DB)
│   ├── api/            # API endpoint tests
│   └── workflows/      # Business workflow tests
├── components/         # React component tests
├── e2e/                # End-to-end tests
└── helpers/            # Test utilities and mocks
```

## Unit Tests

### Service Unit Test Pattern
```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { ServiceName } from '@/lib/services/service-name.service'
import { prismaMock, setupCommonMocks } from '@/tests/helpers/mock-prisma'
import { testFactory } from '@/tests/helpers/test-utils'

describe('ServiceName', () => {
  let service: ServiceName
  
  beforeEach(() => {
    setupCommonMocks()
    service = new ServiceName()
  })

  describe('methodName', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = { /* test input */ }
      const expected = { /* expected output */ }
      
      // Mock Prisma calls
      prismaMock.model.create.mockResolvedValue(expected)
      
      // Act
      const result = await service.methodName(input)
      
      // Assert
      expect(result).toEqual(expected)
      expect(prismaMock.model.create).toHaveBeenCalledWith({
        data: expect.objectContaining(input)
      })
    })
  })
})
```

### Mocking Prisma
```typescript
// Use the mock-prisma helper
import { prismaMock } from '@/tests/helpers/mock-prisma'

// Mock a successful query
prismaMock.user.findUnique.mockResolvedValue({
  id: 'user-id',
  email: 'test@example.com',
  // ... other fields
})

// Mock a transaction
prismaMock.$transaction.mockImplementation(async (fn) => {
  if (typeof fn === 'function') {
    return fn(prismaMock)
  }
  return Promise.all(fn)
})

// Mock an error
prismaMock.user.create.mockRejectedValue(
  new Error('Unique constraint failed')
)
```

## Component Tests

### React Component Test Pattern
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ComponentName } from '@/components/component-name'
import { createMockApiClient } from '@/tests/helpers/test-utils'

// Mock API client
jest.mock('@/lib/api/client', () => ({
  apiClient: createMockApiClient()
}))

describe('ComponentName', () => {
  it('should render and handle user interaction', async () => {
    // Arrange
    const mockOnSubmit = jest.fn()
    
    // Act
    render(
      <ComponentName 
        onSubmit={mockOnSubmit}
        initialValue="test"
      />
    )
    
    // Assert initial render
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
    
    // Simulate user interaction
    const input = screen.getByLabelText('Field Label')
    fireEvent.change(input, { target: { value: 'new value' } })
    
    const submitButton = screen.getByRole('button', { name: 'Submit' })
    fireEvent.click(submitButton)
    
    // Assert results
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        value: 'new value'
      })
    })
  })
})
```

### Testing Forms
```typescript
describe('FormComponent', () => {
  it('should validate required fields', async () => {
    render(<FormComponent />)
    
    // Submit without filling required fields
    const submitButton = screen.getByRole('button', { name: 'Submit' })
    fireEvent.click(submitButton)
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })
  })

  it('should submit with valid data', async () => {
    const { apiClient } = require('@/lib/api/client')
    apiClient.post.mockResolvedValue({
      ok: true,
      data: { id: 'created-id' }
    })
    
    render(<FormComponent />)
    
    // Fill form
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Test Name' }
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    })
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    
    // Verify API call
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/resource', {
        name: 'Test Name',
        email: 'test@example.com'
      })
    })
  })
})
```

## Integration Tests

### API Integration Test Pattern
```typescript
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/resource/route'
import { prisma } from '@/lib/db/prisma'
import { testFactory } from '@/tests/helpers/test-utils'

describe('API /api/resource', () => {
  let testUser: any
  
  beforeEach(async () => {
    // Create test data
    testUser = await prisma.user.create({
      data: testFactory.user()
    })
  })
  
  afterEach(async () => {
    // Cleanup
    await prisma.user.deleteMany()
  })
  
  describe('GET', () => {
    it('should return list of resources', async () => {
      // Create test data
      await prisma.resource.createMany({
        data: [
          { name: 'Resource 1', createdBy: testUser.id },
          { name: 'Resource 2', createdBy: testUser.id }
        ]
      })
      
      // Create request
      const request = new NextRequest('http://localhost/api/resource', {
        headers: {
          'authorization': `Bearer ${testUser.token}`
        }
      })
      
      // Call handler
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
    })
  })
})
```

### Workflow Integration Test
```typescript
describe('Order Fulfillment Workflow', () => {
  it('should complete full order workflow', async () => {
    // 1. Create customer
    const customer = await customerService.createCustomer({
      name: 'Test Customer',
      email: 'customer@test.com',
      createdBy: testUserId
    })
    
    // 2. Create quotation
    const quotation = await quotationService.createQuotation({
      customerId: customer.id,
      items: [{ itemId: 'item-1', quantity: 10 }],
      createdBy: testUserId
    })
    
    // 3. Convert to order
    const order = await orderService.createFromQuotation(
      quotation.id,
      testUserId
    )
    
    // 4. Create shipment
    const shipment = await shipmentService.createShipment({
      orderId: order.id,
      items: order.items,
      createdBy: testUserId
    })
    
    // 5. Verify inventory updated
    const inventory = await inventoryService.getItemBalance('item-1')
    expect(inventory.available).toBe(initialQuantity - 10)
    
    // 6. Verify order status
    const updatedOrder = await orderService.getOrder(order.id)
    expect(updatedOrder.status).toBe('FULFILLED')
  })
})
```

## Test Utilities

### Test Factory Pattern
```typescript
// tests/helpers/test-utils.ts
export const testFactory = {
  user: (overrides?: Partial<User>): User => ({
    id: 'test-user-id',
    email: 'test@example.com',
    role: Role.USER,
    // ... default values
    ...overrides
  }),
  
  customer: (overrides?: Partial<Customer>): Customer => ({
    id: 'test-customer-id',
    name: 'Test Customer',
    // ... default values
    ...overrides
  })
}
```

### Custom Matchers
```typescript
// Custom matcher for API responses
expect.extend({
  toBeSuccessResponse(received) {
    const pass = received.ok === true && received.data !== undefined
    return {
      pass,
      message: () => pass
        ? `expected response not to be successful`
        : `expected response to be successful, got ${JSON.stringify(received)}`
    }
  }
})

// Usage
expect(response).toBeSuccessResponse()
```

## Best Practices

### 1. Test Structure
- Use descriptive test names that explain the scenario
- Follow AAA pattern: Arrange, Act, Assert
- Group related tests with `describe` blocks
- One assertion per test when possible

### 2. Mocking
- Mock external dependencies (database, APIs)
- Use test factories for consistent test data
- Reset mocks between tests
- Mock at the appropriate level

### 3. Async Testing
```typescript
// Always await async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})

// Use proper async test patterns
it('should handle async operations', async () => {
  const result = await service.asyncMethod()
  expect(result).toBeDefined()
})
```

### 4. Error Testing
```typescript
it('should handle errors gracefully', async () => {
  // Mock an error
  prismaMock.user.create.mockRejectedValue(
    new Error('Database error')
  )
  
  // Verify error handling
  await expect(service.createUser(data))
    .rejects
    .toThrow('Database error')
})
```

### 5. Cleanup
```typescript
afterEach(() => {
  jest.clearAllMocks() // Clear mock history
})

afterAll(async () => {
  await prisma.$disconnect() // Close DB connection
})
```

## Testing Checklist

- [ ] Unit tests for all service methods
- [ ] Component tests for user interactions
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical user flows
- [ ] Error scenarios tested
- [ ] Edge cases covered
- [ ] Performance considerations
- [ ] Security scenarios tested

## Common Patterns

### Testing Pagination
```typescript
it('should paginate results', async () => {
  // Create 25 items
  await createManyItems(25)
  
  // Get first page
  const page1 = await service.list({ page: 1, pageSize: 10 })
  expect(page1.items).toHaveLength(10)
  expect(page1.total).toBe(25)
  expect(page1.hasMore).toBe(true)
  
  // Get last page
  const page3 = await service.list({ page: 3, pageSize: 10 })
  expect(page3.items).toHaveLength(5)
  expect(page3.hasMore).toBe(false)
})
```

### Testing Permissions
```typescript
it('should enforce permissions', async () => {
  const userWithoutPermission = testFactory.user({ role: Role.VIEWER })
  
  await expect(
    service.deleteResource('id', userWithoutPermission.id)
  ).rejects.toThrow('Insufficient permissions')
})
```

### Testing Transactions
```typescript
it('should rollback on error', async () => {
  // Mock successful first operation
  prismaMock.order.create.mockResolvedValueOnce({ id: 'order-id' })
  
  // Mock failed second operation
  prismaMock.inventory.update.mockRejectedValueOnce(
    new Error('Insufficient stock')
  )
  
  // Verify rollback
  await expect(service.createOrder(data)).rejects.toThrow()
  
  // Verify order was not created
  const orders = await prisma.order.findMany()
  expect(orders).toHaveLength(0)
})
```

This comprehensive testing approach ensures reliability and maintainability of the Enxi ERP system.