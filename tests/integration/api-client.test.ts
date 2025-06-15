/**
 * Integration tests for API Client with MSW mocking
 */
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { apiClient, apiClient  } from '@/lib/api/client'
import { LeadStats } from '@/lib/types/lead.types'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
})

// Mock window.location
const mockLocation = {
  href: '',
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

// MSW server setup
const server = setupServer(
  // Authenticated endpoint
  rest.get('/api/leads/stats', (req, res, ctx) => {
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({ error: 'Unauthorized' })
      )
    }
    
    const mockStats: LeadStats = {
      NEW: 5,
      CONTACTED: 3,
      QUALIFIED: 2,
      PROPOSAL_SENT: 1,
      NEGOTIATING: 1,
      CONVERTED: 2,
      LOST: 1,
      DISQUALIFIED: 0,
    }
    
    return res(ctx.json(mockStats))
  }),

  // Login endpoint (no auth required)
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        token: 'mock-jwt-token',
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          role: 'USER',
        },
      })
    )
  }),

  // Protected endpoint that returns different data based on auth
  rest.get('/api/leads', (req, res, ctx) => {
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader) {
      return res(
        ctx.status(401),
        ctx.json({ error: 'Authentication required' })
      )
    }
    
    return res(
      ctx.json({
        data: [
          {
            id: 'lead-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            status: 'NEW',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      })
    )
  })
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  jest.clearAllMocks()
  localStorageMock.getItem.mockReturnValue(null)
  document.cookie = ''
  mockLocation.href = ''
})
afterAll(() => server.close())

describe('API Client', () => {
  describe('Authentication Header Injection', () => {
    it('should automatically add Bearer token from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('test-token-123')
      
      const response = await apiClient('/api/leads/stats')
      
      expect(response.ok).toBe(true)
      expect(response?.data).toEqual({
        NEW: 5,
        CONTACTED: 3,
        QUALIFIED: 2,
        PROPOSAL_SENT: 1,
        NEGOTIATING: 1,
        CONVERTED: 2,
        LOST: 1,
        DISQUALIFIED: 0,
      })
    })

    it('should automatically add Bearer token from cookie when localStorage is empty', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      document.cookie = 'auth-token=cookie-token-456; path=/'
      
      const response = await apiClient('/api/leads/stats')
      
      expect(response.ok).toBe(true)
      expect(response?.data).toBeDefined()
    })

    it('should handle requests without skipAuth flag by adding auth headers', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token')
      
      const response = await apiClient('/api/leads')
      
      expect(response.ok).toBe(true)
      expect(response?.data).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
      })
    })

    it('should skip auth when skipAuth flag is true', async () => {
      const response = await apiClient('/api/auth/login', 
        { username: 'test', password: 'test' }, 
        { skipAuth: true }
      )
      
      expect(response.ok).toBe(true)
      expect(response?.data).toEqual({
        token: 'mock-jwt-token',
        user: expect.any(Object),
      })
    })
  })

  describe('401 Unauthorized Handling', () => {
    it('should handle 401 responses and redirect to login', async () => {
      localStorageMock.getItem.mockReturnValue(null) // No token
      
      const response = await apiClient('/api/leads/stats')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
      expect(response.error).toBe('Authentication required. Redirecting to login...')
      
      // Verify tokens are cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
      expect(document.cookie).toContain('auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT')
      
      // Verify redirect happens
      expect(mockLocation.href).toBe('/login')
    })

    it('should clear tokens on 401 even when localStorage had a token', async () => {
      localStorageMock.getItem.mockReturnValue('expired-token')
      
      // Mock server to return 401 for this specific token
      server.use(
        rest.get('/api/leads/stats', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({ error: 'Token expired' })
          )
        })
      )
      
      const response = await apiClient('/api/leads/stats')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
    })
  })

  describe('Error Handling', () => {
    it('should handle 500 server errors gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token')
      
      server.use(
        rest.get('/api/leads/stats', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Internal server error' })
          )
        })
      )
      
      const response = await apiClient('/api/leads/stats')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
      expect(response.error).toBe('Internal server error')
    })

    it('should handle network errors', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token')
      
      server.use(
        rest.get('/api/leads/stats', (req, res) => {
          return res.networkError('Network connection failed')
        })
      )
      
      const response = await apiClient('/api/leads/stats')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(0)
      expect(response.error).toContain('Network error occurred')
    })
  })

  describe('HTTP Methods', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('valid-token')
    })

    it('should handle GET requests correctly', async () => {
      const response = await apiClient('/api/leads/stats')
      
      expect(response.ok).toBe(true)
      expect(response?.data).toBeDefined()
    })

    it('should handle POST requests with data', async () => {
      server.use(
        rest.post('/api/leads', (req, res, ctx) => {
          return res(
            ctx.status(201),
            ctx.json({ id: 'new-lead-123', ...req.body })
          )
        })
      )
      
      const leadData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        source: 'WEBSITE',
      }
      
      const response = await apiClient('/api/leads', leadData)
      
      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)
      expect(response?.data).toEqual({
        id: 'new-lead-123',
        ...leadData,
      })
    })

    it('should handle PUT requests correctly', async () => {
      server.use(
        rest.put('/api/leads/lead-123', (req, res, ctx) => {
          return res(
            ctx.json({ id: 'lead-123', ...req.body })
          )
        })
      )
      
      const updateData = { status: 'CONTACTED' }
      const response = await apiClient('/api/leads/lead-123', updateData)
      
      expect(response.ok).toBe(true)
      expect(response?.data).toEqual({
        id: 'lead-123',
        ...updateData,
      })
    })

    it('should handle DELETE requests correctly', async () => {
      server.use(
        rest.delete('/api/leads/lead-123', (req, res, ctx) => {
          return res(
            ctx.json({ success: true })
          )
        })
      )
      
      const response = await apiClient('/api/leads/lead-123')
      
      expect(response.ok).toBe(true)
      expect(response?.data).toEqual({ success: true })
    })
  })

  describe('Type Safety', () => {
    it('should provide typed responses for GET requests', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token')
      
      const response = await api.get<LeadStats>('/api/leads/stats')
      
      if (response.ok && response?.data) {
        // TypeScript should infer the correct type here
        expect(typeof response?.data.NEW).toBe('number')
        expect(typeof response?.data.CONTACTED).toBe('number')
        expect(typeof response?.data.QUALIFIED).toBe('number')
      }
    })

    it('should handle error responses with proper typing', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const response = await api.get<LeadStats>('/api/leads/stats')
      
      expect(response.ok).toBe(false)
      expect(typeof response.error).toBe('string')
      expect(response?.data).toBeUndefined()
    })
  })
})