/**
 * Mock Prisma client for unit tests
 * Provides a fully mocked Prisma client to avoid database calls
 */

import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from "@prisma/client"
import { prisma } from '@/lib/db/prisma'

// Create mock instance
export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>

// Mock the prisma module
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}))

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock)
})

// Helper to setup common mocks
export const setupCommonMocks = () => {
  // Mock $connect and $disconnect
  prismaMock.$connect.mockResolvedValue()
  prismaMock.$disconnect.mockResolvedValue()
  
  // Mock $transaction
  prismaMock.$transaction.mockImplementation(async (fn: any) => {
    if (typeof fn === 'function') {
      return fn(prismaMock)
    }
    return Promise.all(fn)
  })
}