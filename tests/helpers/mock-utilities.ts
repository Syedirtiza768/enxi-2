/**
 * Comprehensive Mock Utilities for Testing
 * Provides standardized mocks for common testing scenarios
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

// Mock Next.js Request class
export class MockNextRequest implements Partial<NextRequest> {
  public headers: Headers
  public method: string
  public url: string
  public nextUrl: URL
  private _body: any

  constructor(url: string, init?: RequestInit & { body?: any }) {
    this.url = url
    this.nextUrl = new URL(url, 'http://localhost:3000')
    this.method = init?.method || 'GET'
    this.headers = new Headers(init?.headers || {})
    this._body = init?.body || {}
  }

  async json() {
    return this._body
  }

  async text() {
    return typeof this._body === 'string' ? this._body : JSON.stringify(this._body)
  }

  async formData() {
    return this._body as FormData
  }
}

// Mock Next.js Response
export const mockNextResponse = () => {
  const responses = {
    json: jest.fn((data: any, init?: ResponseInit) => ({
      type: 'json',
      data,
      status: init?.status || 200,
      headers: init?.headers || {},
    })),
    error: jest.fn(() => ({
      type: 'error',
      status: 500,
      error: true,
    })),
    redirect: jest.fn((url: string) => ({
      type: 'redirect',
      url,
      status: 307,
    })),
  }
  return responses
}

// Mock NextAuth session
export const mockSession = (overrides?: Partial<any>) => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ADMIN',
    ...overrides?.user,
  },
  expires: '2025-12-31',
  ...overrides,
})

// Mock API response helper
export const mockApiResponse = (data: any, options?: { status?: number; headers?: Record<string, string> }) => {
  return {
    ok: options?.status ? options.status >= 200 && options.status < 300 : true,
    status: options?.status || 200,
    headers: new Headers(options?.headers || {}),
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)], { type: 'application/json' }),
  }
}

// Mock fetch for API calls
export const setupMockFetch = () => {
  const mockFetch = jest.fn()
  global.fetch = mockFetch as any
  return mockFetch
}

// Mock Prisma transaction
export const mockPrismaTransaction = (prisma: any) => {
  ;(prisma.$transaction as any).mockImplementation((fn: any) => {
    if (typeof fn === 'function') {
      return fn(prisma)
    }
    return Promise.all(fn)
  })
}

// Mock file upload
export const createMockFile = (name: string, size: number, type: string): File => {
  const content = new Array(size).fill('a').join('')
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

// Mock FormData
export const createMockFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value)
    } else {
      formData.append(key, String(value))
    }
  })
  return formData
}

// Standard API error responses
export const apiErrors = {
  unauthorized: () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  forbidden: () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
  notFound: () => NextResponse.json({ error: 'Not found' }, { status: 404 }),
  badRequest: (message: string) => NextResponse.json({ error: message }, { status: 400 }),
  serverError: () => NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
}

// Mock service responses
export const mockServiceResponses = {
  success: <T>(data: T) => Promise.resolve(data),
  error: (message: string) => Promise.reject(new Error(message)),
  paginated: <T>(items: T[], page = 1, limit = 10) => ({
    data: items.slice((page - 1) * limit, page * limit),
    total: items.length,
    page,
    limit,
    totalPages: Math.ceil(items.length / limit),
  }),
}

// React component test utilities
export const waitForAsync = async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
}

// Mock router utilities
export const createMockRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  beforePopState: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
})

// Mock auth hooks
export const mockUseAuth = (overrides?: any) => ({
  user: mockSession().user,
  isLoading: false,
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  ...overrides,
})

// Cleanup utilities
export const cleanupMocks = () => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}

// Export all utilities
export default {
  MockNextRequest,
  mockNextResponse,
  mockSession,
  mockApiResponse,
  setupMockFetch,
  mockPrismaTransaction,
  createMockFile,
  createMockFormData,
  apiErrors,
  mockServiceResponses,
  waitForAsync,
  createMockRouter,
  mockUseAuth,
  cleanupMocks,
}