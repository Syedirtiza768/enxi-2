import React, { ReactElement, ReactNode } from 'react'
import { render as rtlRender, RenderOptions, waitFor, screen, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import userEvent from '@testing-library/user-event'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
}))

// Create test providers wrapper
interface TestProvidersProps {
  children: ReactNode
  session?: any
  queryClient?: QueryClient
}

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      gcTime: 0,
    },
  },
})

const defaultSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ADMIN',
  },
  expires: '2025-12-31',
}

export const TestProviders: React.FC<TestProvidersProps> = ({
  children,
  session = defaultSession,
  queryClient = createTestQueryClient(),
}) => {
  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}

// Enhanced render with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: any
  queryClient?: QueryClient
}

export function render(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { session, queryClient, ...renderOptions } = options || {}
  
  const result = rtlRender(ui, {
    wrapper: ({ children }) => (
      <TestProviders session={session} queryClient={queryClient}>
        {children}
      </TestProviders>
    ),
    ...renderOptions,
  })
  
  return {
    ...result,
    user: userEvent.setup(),
  }
}

/**
 * Enhanced render function that waits for async loading to complete
 */
export async function renderAndWaitForLoad(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  const result = rtlRender(ui, options)
  
  // Wait for any loading indicators to disappear
  await waitFor(() => {
    const loadingElements = screen.queryAllByText(/loading/i)
    const spinners = screen.queryAllByTestId(/spinner|loader/i)
    expect(loadingElements.length + spinners.length).toBe(0)
  }, { timeout: 5000 })
  
  return result
}

/**
 * Wait for form to be ready (no loading states)
 */
export async function waitForFormReady() {
  await waitFor(() => {
    // Check for various loading indicators
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId(/spinner/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId(/loader/i)).not.toBeInTheDocument()
  })
}

/**
 * Mock successful form submission
 */
export async function submitForm(buttonText: string | RegExp = /submit/i) {
  const submitButton = screen.getByRole('button', { name: buttonText })
  
  await act(async () => {
    submitButton.click()
  })
}

/**
 * Fill form field with proper async handling
 */
export async function fillFormField(
  label: string | RegExp,
  value: string
) {
  const input = screen.getByLabelText(label)
  
  await act(async () => {
    input.focus()
    input.blur() // Clear any existing value
    input.focus()
    await userEvent.type(input, value)
  })
}

/**
 * Select option from dropdown
 */
export async function selectOption(
  label: string | RegExp,
  optionText: string
) {
  const select = screen.getByLabelText(label)
  
  await act(async () => {
    await userEvent.selectOptions(select, optionText)
  })
}

/**
 * Assert form validation error
 */
export function expectValidationError(message: string | RegExp) {
  const error = screen.getByText(message)
  expect(error).toBeInTheDocument()
  expect(error).toHaveClass(/error|invalid|danger/i)
}

/**
 * Setup common form test mocks
 */
export function setupFormMocks() {
  // Mock scrollIntoView
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  
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
}

// Re-export userEvent for convenience
import userEvent from '@testing-library/user-event'
export { userEvent }

// Re-export everything from testing library
export * from '@testing-library/react'