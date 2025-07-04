// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom')

// Import database cleanup for integration tests
const { cleanupDatabase } = require('./tests/helpers/database-cleanup')

// Clean up database before all tests in integration tests
if (process.env.NODE_ENV === 'test') {
  beforeAll(async () => {
    // Only cleanup for integration tests
    if (process.env.TEST_TYPE === 'integration') {
      await cleanupDatabase()
    }
  })
}

// Polyfill for Next.js
const { TextDecoder, TextEncoder } = require('util')
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

// Polyfill for JSDOM for Radix UI
Object.assign(global.Element.prototype, {
  hasPointerCapture: jest.fn(),
  releasePointerCapture: jest.fn(),
  setPointerCapture: jest.fn(),
  scrollIntoView: jest.fn(),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock DOMRect
global.DOMRect = jest.fn().mockImplementation(() => ({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}))

// Mock getBoundingClientRect
global.Element.prototype.getBoundingClientRect = jest.fn(() => ({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  toJSON: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))