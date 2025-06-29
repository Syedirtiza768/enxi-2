# Test Suite Documentation

## Overview
This document provides guidance on writing and maintaining tests for the Enxi ERP application.

## Test Helpers

### 1. Common Test Utilities (`tests/helpers/common-test-utils.tsx`)
General utilities for component testing:

- **renderAsync**: Renders components with automatic loading state handling
- **createApiClientMock**: Creates a mock apiClient with standard response format
- **setupAuthMocks**: Sets up authentication mocks
- **setupRouterMock**: Mocks Next.js router
- **formAssertions**: Common form validation assertions

Example usage:
```typescript
import { renderAsync, setupAuthMocks, formAssertions } from '@/tests/helpers/common-test-utils'

it('should validate form', async () => {
  setupAuthMocks()
  await renderAsync(<MyForm />)
  
  formAssertions.expectFieldError('email', 'Email is required')
})
```

### 2. Prisma Mock Factory (`tests/helpers/prisma-mock-factory.ts`)
Utilities for mocking Prisma database operations:

- **createPrismaMock**: Creates a full mock implementation of Prisma model operations
- **factories**: Pre-built factories for common entities (user, customer, product, invoice)
- **generateMockId**: Generates consistent test IDs

Example usage:
```typescript
import { createPrismaMock, factories } from '@/tests/helpers/prisma-mock-factory'

const mockUserModel = createPrismaMock('user')
const testUser = factories.user.build({ email: 'test@example.com' })
mockUserModel._setRecords([testUser])
```

### 3. Invoice Form Test Helpers (`tests/helpers/invoice-form-test-helpers.tsx`)
Specialized helpers for invoice form testing:

- **renderInvoiceForm**: Renders invoice form with proper mocks and loading handling
- **setupInvoiceFormMocks**: Sets up all required API mocks
- Mock data for customers, sales orders, and inventory items

### 4. Component Test Utils (`tests/helpers/component-test-utils.tsx`)
Original component testing utilities with enhanced features for forms.

## Common Testing Patterns

### 1. Component Tests with Async Data Loading
```typescript
it('should load and display data', async () => {
  // Use renderAsync to handle loading states automatically
  await renderAsync(<MyComponent />)
  
  // Assertions run after loading completes
  expect(screen.getByText('Data loaded')).toBeInTheDocument()
})
```

### 2. Form Validation Tests
```typescript
it('should validate required fields', async () => {
  const { onSubmit } = await renderInvoiceForm()
  
  const submitButton = screen.getByRole('button', { name: /submit/i })
  fireEvent.click(submitButton)
  
  await waitFor(() => {
    expect(screen.getByText('Field is required')).toBeInTheDocument()
  })
  expect(onSubmit).not.toHaveBeenCalled()
})
```

### 3. Service Tests with Prisma Mocks
```typescript
beforeEach(() => {
  const mockProduct = createPrismaMock('product')
  mockProduct._setRecords([
    factories.product.build({ id: '1', name: 'Test Product' })
  ])
  
  prisma.product = mockProduct
})

it('should find product by id', async () => {
  const product = await productService.findById('1')
  expect(product.name).toBe('Test Product')
})
```

## Best Practices

1. **Always handle async operations**: Use `act()` and `waitFor()` appropriately
2. **Mock external dependencies**: Don't make real API calls in tests
3. **Use semantic queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
4. **Test user behavior**: Focus on what users see and do, not implementation details
5. **Keep tests isolated**: Each test should be independent and not affect others
6. **Use factories for test data**: Consistent, maintainable test data generation

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/components/invoices/invoice-form.test.tsx

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Debugging Tests

1. Use `screen.debug()` to see the current DOM state
2. Add `--verbose` flag for detailed test output
3. Use `--maxWorkers=1` to run tests sequentially for easier debugging
4. Check test logs for `console.error` warnings about React act() issues