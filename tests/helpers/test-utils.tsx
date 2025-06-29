import React from 'react'
import { render as rtlRender, RenderOptions, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'

/**
 * Custom render function that wraps components with necessary providers
 */
export function render(ui: React.ReactElement, options?: RenderOptions) {
  return rtlRender(ui, options)
}

/**
 * Wrapper for async operations that update React state
 */
export async function waitForAsync(callback: () => Promise<void> | void) {
  await act(async () => {
    await callback()
  })
}

/**
 * Wait for component to finish loading
 */
export async function waitForComponentToLoad() {
  await waitFor(() => {
    // Wait for any loading indicators to disappear
    const loadingElements = document.querySelectorAll('[data-testid*="loading"]')
    expect(loadingElements.length).toBe(0)
  }, { timeout: 5000 })
}

/**
 * Mock successful API response
 */
export function mockApiResponse(data: any, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      'content-type': 'application/json',
    }),
  })
}

/**
 * Mock failed API response
 */
export function mockApiError(error: string, status = 500) {
  return Promise.resolve({
    ok: false,
    status,
    json: async () => ({ error }),
    text: async () => JSON.stringify({ error }),
    headers: new Headers({
      'content-type': 'application/json',
    }),
  })
}

/**
 * Setup common mocks for component tests
 */
export function setupComponentTest() {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })) as any

  // Reset all mocks
  jest.clearAllMocks()
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { act } from 'react-dom/test-utils'