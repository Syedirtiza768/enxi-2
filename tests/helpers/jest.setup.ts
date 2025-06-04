// Jest setup for database tests
import { prisma } from '@/lib/db/prisma'

// Increase Prisma transaction timeout for tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db'

// Set longer transaction timeout
jest.setTimeout(60000)

// Global test configuration
beforeAll(async () => {
  // Configure Prisma for testing
  await prisma.$connect()
})

afterAll(async () => {
  // Cleanup and disconnect
  await prisma.$disconnect()
})