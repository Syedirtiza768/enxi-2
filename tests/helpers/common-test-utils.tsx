import React from 'react'
import { render, RenderOptions, waitFor, screen } from '@testing-library/react'
import { act } from 'react-dom/test-utils'

/**
 * Common test utilities for component testing
 */

/**
 * Render component with proper async handling
 * Automatically waits for loading states to complete
 */
export async function renderAsync<T extends React.ReactElement>(
  ui: T,
  options?: RenderOptions
) {
  let result: any

  await act(async () => {
    result = render(ui, options)
  })

  // Wait for any loading states to complete
  await waitFor(() => {
    const loadingElements = [
      ...screen.queryAllByText(/loading/i),
      ...screen.queryAllByTestId(/loading|spinner|loader/i),
      ...screen.queryAllByRole('progressbar')
    ]
    expect(loadingElements).toHaveLength(0)
  }, { timeout: 5000 })

  return result
}

/**
 * Mock apiClient with standard response format
 */
export function createApiClientMock() {
  return jest.fn((url: string, options?: any) => {
    // Default successful response
    return Promise.resolve({
      ok: true,
      data: [],
      error: null
    })
  })
}

/**
 * Create a mock for hooks that return loading states
 */
export function createLoadingHookMock<T>(data: T) {
  return jest.fn(() => ({
    data,
    loading: false,
    error: null,
    refetch: jest.fn()
  }))
}

/**
 * Wait for element to appear and return it
 */
export async function waitForElement(
  query: () => HTMLElement | null,
  options = { timeout: 5000 }
) {
  let element: HTMLElement | null = null
  
  await waitFor(() => {
    element = query()
    expect(element).toBeInTheDocument()
  }, options)
  
  return element!
}

/**
 * Common mock setup for authenticated tests
 */
export function setupAuthMocks(user = { id: 'user1', name: 'Test User', role: 'ADMIN' }) {
  const useAuthMock = {
    user,
    loading: false,
    login: jest.fn(),
    logout: jest.fn()
  }

  jest.mock('@/lib/hooks/use-auth', () => ({
    useAuth: () => useAuthMock
  }))

  return useAuthMock
}

/**
 * Mock Next.js router
 */
export function setupRouterMock() {
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()
  const mockBack = jest.fn()
  
  const routerMock = {
    push: mockPush,
    refresh: mockRefresh,
    back: mockBack,
    pathname: '/',
    query: {},
    asPath: '/'
  }

  jest.mock('next/navigation', () => ({
    useRouter: () => routerMock,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams()
  }))

  return routerMock
}

/**
 * Create mock for components that are not under test
 */
export function createComponentMock(componentName: string) {
  return ({ children, ...props }: any) => (
    <div data-testid={`mock-${componentName.toLowerCase()}`} {...props}>
      {children}
    </div>
  )
}

/**
 * Wait for form validation errors to appear
 */
export async function waitForValidationErrors() {
  await waitFor(() => {
    const errors = screen.queryAllByRole('alert')
    expect(errors.length).toBeGreaterThan(0)
  })
}

/**
 * Fill form field and trigger all events
 */
export async function fillFormField(element: HTMLElement, value: string) {
  await act(async () => {
    element.focus()
    // Clear existing value
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = ''
    }
    // Type new value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value
    }
    element.dispatchEvent(new Event('change', { bubbles: true }))
    element.blur()
  })
}

/**
 * Common assertions for form tests
 */
export const formAssertions = {
  expectFieldError(fieldName: string, errorMessage: string | RegExp) {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i'))
    const error = field.parentElement?.querySelector('[role="alert"]') || 
                 screen.getByText(errorMessage)
    expect(error).toBeInTheDocument()
  },

  expectNoFieldError(fieldName: string) {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i'))
    const error = field.parentElement?.querySelector('[role="alert"]')
    expect(error).not.toBeInTheDocument()
  },

  expectSubmitDisabled() {
    const submitButton = screen.getByRole('button', { name: /submit|save|create|update/i })
    expect(submitButton).toBeDisabled()
  },

  expectSubmitEnabled() {
    const submitButton = screen.getByRole('button', { name: /submit|save|create|update/i })
    expect(submitButton).toBeEnabled()
  }
}

/**
 * Mock fetch API
 */
export function setupFetchMock() {
  const fetchMock = jest.fn()
  global.fetch = fetchMock
  
  // Default implementation
  fetchMock.mockImplementation((url: string) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ data: [], success: true }),
      text: async () => '',
      headers: new Headers()
    })
  })
  
  return fetchMock
}

/**
 * Clean up all mocks after tests
 */
export function cleanupMocks() {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}

// Re-export commonly used testing utilities
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'