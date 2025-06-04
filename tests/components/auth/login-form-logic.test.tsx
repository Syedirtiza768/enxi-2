/**
 * Login Form Logic Tests
 * Tests the form logic without complex UI dependencies
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loginSchema } from '@/lib/validators/auth.validator'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
    }
  },
}))

// Simple test component that mimics login form logic
function SimpleLoginForm({ onSubmit }: { onSubmit: (data: any) => Promise<void> }) {
  const [loading, setLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [apiError, setApiError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})
    setApiError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    }

    try {
      // Validate with Zod
      const validatedData = loginSchema.parse(data)
      setLoading(true)
      await onSubmit(validatedData)
    } catch (error: any) {
      if (error.errors) {
        // Zod validation errors
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0]] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        setApiError(error.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      <div>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          disabled={loading}
          data-testid="username-input"
        />
        {errors.username && (
          <span data-testid="username-error">{errors.username}</span>
        )}
      </div>
      
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          disabled={loading}
          data-testid="password-input"
        />
        {errors.password && (
          <span data-testid="password-error">{errors.password}</span>
        )}
      </div>
      
      {apiError && (
        <div data-testid="api-error">{apiError}</div>
      )}
      
      <button type="submit" disabled={loading} data-testid="submit-button">
        {loading ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  )
}

describe('Login Form Logic', () => {
  it('should render form elements', () => {
    const mockSubmit = jest.fn()
    render(<SimpleLoginForm onSubmit={mockSubmit} />)

    expect(screen.getByTestId('username-input')).toBeInTheDocument()
    expect(screen.getByTestId('password-input')).toBeInTheDocument()
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    const mockSubmit = jest.fn()
    const user = userEvent.setup()
    
    render(<SimpleLoginForm onSubmit={mockSubmit} />)

    const submitButton = screen.getByTestId('submit-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('username-error')).toHaveTextContent(
        'Username must be at least 3 characters'
      )
      expect(screen.getByTestId('password-error')).toHaveTextContent(
        'Password must be at least 6 characters'
      )
    })

    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('should submit form with valid data', async () => {
    const mockSubmit = jest.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    
    render(<SimpleLoginForm onSubmit={mockSubmit} />)

    const usernameInput = screen.getByTestId('username-input')
    const passwordInput = screen.getByTestId('password-input')
    const submitButton = screen.getByTestId('submit-button')

    await user.type(usernameInput, 'admin')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123'
      })
    })
  })

  it('should show loading state during submission', async () => {
    const mockSubmit = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    )
    const user = userEvent.setup()
    
    render(<SimpleLoginForm onSubmit={mockSubmit} />)

    const usernameInput = screen.getByTestId('username-input')
    const passwordInput = screen.getByTestId('password-input')
    const submitButton = screen.getByTestId('submit-button')

    await user.type(usernameInput, 'admin')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveTextContent('Logging in...')

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
      expect(submitButton).toHaveTextContent('Log in')
    })
  })

  it('should show API error on submission failure', async () => {
    const mockSubmit = jest.fn().mockRejectedValue(new Error('Invalid credentials'))
    const user = userEvent.setup()
    
    render(<SimpleLoginForm onSubmit={mockSubmit} />)

    const usernameInput = screen.getByTestId('username-input')
    const passwordInput = screen.getByTestId('password-input')
    const submitButton = screen.getByTestId('submit-button')

    await user.type(usernameInput, 'admin')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('api-error')).toHaveTextContent('Invalid credentials')
    })
  })

  it('should validate username length', async () => {
    const mockSubmit = jest.fn()
    const user = userEvent.setup()
    
    render(<SimpleLoginForm onSubmit={mockSubmit} />)

    const usernameInput = screen.getByTestId('username-input')
    const passwordInput = screen.getByTestId('password-input')
    const submitButton = screen.getByTestId('submit-button')

    await user.type(usernameInput, 'ab') // Too short
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('username-error')).toHaveTextContent(
        'Username must be at least 3 characters'
      )
    })

    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('should validate password length', async () => {
    const mockSubmit = jest.fn()
    const user = userEvent.setup()
    
    render(<SimpleLoginForm onSubmit={mockSubmit} />)

    const usernameInput = screen.getByTestId('username-input')
    const passwordInput = screen.getByTestId('password-input')
    const submitButton = screen.getByTestId('submit-button')

    await user.type(usernameInput, 'admin')
    await user.type(passwordInput, '123') // Too short
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('password-error')).toHaveTextContent(
        'Password must be at least 6 characters'
      )
    })

    expect(mockSubmit).not.toHaveBeenCalled()
  })
})