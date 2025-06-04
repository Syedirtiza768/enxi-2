import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/lib/hooks/use-auth'

// Mock user for testing
const mockUser = {
  id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin',
  department: { id: 'dept-1', name: 'Test Department' }
}

// Create a custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: typeof mockUser
}

function createWrapper(options: CustomRenderOptions = {}) {
  const { user = mockUser } = options

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    )
  }
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  return render(ui, {
    wrapper: createWrapper(options),
    ...options
  })
}

// Simple mock auth context for testing
export const mockAuthContext = {
  user: mockUser,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn()
}

// Mock implementations for testing
export const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}

// Test data generators
export function createMockCategory(overrides = {}) {
  return {
    id: 'cat-1',
    name: 'Test Category',
    code: 'TEST',
    parentId: null,
    level: 0,
    path: 'Test Category',
    isActive: true,
    children: [],
    glAccounts: {
      inventoryAccount: '1130',
      cogsAccount: '5100',
      varianceAccount: '5150'
    },
    ...overrides
  }
}

export function createMockItem(overrides = {}) {
  return {
    id: 'item-1',
    code: 'ITM-001',
    name: 'Test Item',
    description: 'Test item description',
    categoryId: 'cat-1',
    category: createMockCategory(),
    type: 'PRODUCT',
    unitOfMeasure: { code: 'PCS', name: 'Pieces' },
    unitOfMeasureId: 'uom-1',
    trackInventory: true,
    minStockLevel: 0,
    maxStockLevel: 0,
    reorderPoint: 0,
    standardCost: 10.00,
    listPrice: 15.00,
    isActive: true,
    isSaleable: true,
    isPurchaseable: true,
    stockSummary: {
      totalQuantity: 0,
      availableQuantity: 0,
      reservedQuantity: 0,
      totalValue: 0
    },
    ...overrides
  }
}

export function createMockQuotation(overrides = {}) {
  return {
    id: 'quo-1',
    quotationNumber: 'Q-001',
    customerId: 'cust-1',
    salesCaseId: 'sc-1',
    quotationDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'draft',
    currency: 'USD',
    totalAmount: 1000,
    lines: [],
    ...overrides
  }
}

export function createMockQuotationLine(overrides = {}) {
  return {
    id: 'line-1',
    quotationId: 'quo-1',
    sequence: 1,
    description: 'Test Line',
    internalNotes: '',
    totalAmount: 100,
    items: [],
    ...overrides
  }
}

export function createMockStockMovement(overrides = {}) {
  return {
    id: 'mov-1',
    itemId: 'item-1',
    movementType: 'IN',
    quantity: 10,
    unitCost: 15.00,
    totalCost: 150.00,
    reference: 'TEST-001',
    movementDate: new Date(),
    reason: 'Purchase',
    ...overrides
  }
}

// Custom matchers for better assertions
expect.extend({
  toHaveGLEntry(received: any[], account: string, debit?: number, credit?: number) {
    const entry = received.find(e => e.account === account)
    
    if (!entry) {
      return {
        message: () => `Expected GL entries to contain account ${account}`,
        pass: false
      }
    }

    if (debit !== undefined && entry.debit !== debit) {
      return {
        message: () => `Expected account ${account} to have debit ${debit}, got ${entry.debit}`,
        pass: false
      }
    }

    if (credit !== undefined && entry.credit !== credit) {
      return {
        message: () => `Expected account ${account} to have credit ${credit}, got ${entry.credit}`,
        pass: false
      }
    }

    return {
      message: () => `Account ${account} has correct GL entry`,
      pass: true
    }
  }
})

// Declare custom matcher types
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveGLEntry(account: string, debit?: number, credit?: number): R
    }
  }
}