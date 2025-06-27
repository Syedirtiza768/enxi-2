/**
 * Test utilities for Enxi ERP
 * Provides common test helpers, mocks, and utilities
 */

import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { NextRouter } from 'next/router'
import { User, Customer, Supplier, Item, Role } from "@prisma/client"

// Mock Next.js router
export const mockRouter: NextRouter = {
  basePath: '',
  pathname: '/',
  route: '/',
  asPath: '/',
  query: {},
  push: jest.fn().mockResolvedValue(true),
  replace: jest.fn().mockResolvedValue(true),
  reload: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn().mockResolvedValue(undefined),
  beforePopState: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isFallback: false,
  isLocaleDomain: false,
  isReady: true,
  isPreview: false,
}

// Custom render function with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // Add providers here as needed
  return render(ui, options)
}

// Test data factories
export const testFactory = {
  user: (overrides?: Partial<User>): User => ({
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: Role.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null,
    failedLoginAttempts: 0,
    lockoutEnd: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    emailVerified: null,
    resetToken: null,
    resetTokenExpiry: null,
    ...overrides,
  }),

  customer: (overrides?: Partial<Customer>): Customer => ({
    id: 'test-customer-id',
    customerNumber: 'CUST-001',
    name: 'Test Customer',
    email: 'customer@example.com',
    phone: '+1234567890',
    status: 'ACTIVE',
    currency: 'USD',
    creditLimit: 10000,
    paymentTerms: 'NET30',
    taxNumber: null,
    website: null,
    notes: null,
    createdBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    accountId: 'test-account-id',
    assignedToId: 'test-user-id',
    ...overrides,
  }),

  supplier: (overrides?: Partial<Supplier>): Supplier => ({
    id: 'test-supplier-id',
    supplierNumber: 'SUP-001',
    name: 'Test Supplier',
    email: 'supplier@example.com',
    phone: '+1234567890',
    status: 'ACTIVE',
    currency: 'USD',
    paymentTerms: 'NET30',
    taxNumber: null,
    website: null,
    notes: null,
    createdBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    accountId: 'test-account-id',
    ...overrides,
  }),

  item: (overrides?: Partial<Item>): Item => ({
    id: 'test-item-id',
    code: 'ITEM-001',
    name: 'Test Item',
    description: 'Test item description',
    categoryId: 'test-category-id',
    unitOfMeasureId: 'test-uom-id',
    type: 'PRODUCT',
    trackInventory: true,
    isActive: true,
    isStockItem: true,
    inventoryAccountId: 'test-account-id',
    cogsAccountId: 'test-account-id',
    salesAccountId: 'test-account-id',
    reorderPoint: 10,
    reorderQuantity: 50,
    leadTime: 5,
    unitCost: 100,
    sellingPrice: 150,
    taxRateId: null,
    notes: null,
    createdBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
}

// API response mocks
export const mockApiResponse = {
  success: <T>(data: T) => ({
    ok: true,
    data,
    error: null,
    status: 200,
  }),

  error: (message: string, status = 500) => ({
    ok: false,
    data: null,
    error: message,
    status,
  }),
}

// Mock API client
export const createMockApiClient = () => ({
  get: jest.fn().mockResolvedValue(mockApiResponse.success([])),
  post: jest.fn().mockResolvedValue(mockApiResponse.success({})),
  put: jest.fn().mockResolvedValue(mockApiResponse.success({})),
  delete: jest.fn().mockResolvedValue(mockApiResponse.success({})),
})

// Mock service utilities
export const createMockService = (serviceName: string) => ({
  create: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(null),
  findMany: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
})

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
  }
}

// Setup and teardown helpers
export const setupTest = () => {
  // Mock localStorage
  const localStorageMock = mockLocalStorage()
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })

  // Mock fetch
  global.fetch = jest.fn()

  // Return cleanup function
  return () => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  }
}

// Assertion helpers
export const expectToBeCalledWithPartial = (
  mock: jest.Mock,
  partial: Record<string, unknown>
) => {
  expect(mock).toHaveBeenCalledWith(
    expect.objectContaining(partial)
  )
}

// Date helpers for consistent testing
export const TEST_DATE = new Date('2024-01-01T00:00:00Z')
export const mockDate = () => {
  jest.useFakeTimers()
  jest.setSystemTime(TEST_DATE)
  return () => jest.useRealTimers()
}