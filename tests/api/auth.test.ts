import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { POST as registerHandler } from '@/app/api/auth/register/route'
import { GET as profileHandler } from '@/app/api/auth/profile/route'
import { AuthService } from '@/lib/services/auth.service'

// Mock AuthService
jest.mock('@/lib/services/auth.service')

describe('Auth API Endpoints', () => {
  let mockAuthService: jest.Mocked<AuthService>

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthService = new AuthService() as jest.Mocked<AuthService>
    ;(AuthService as jest.Mock).mockImplementation(() => mockAuthService)
  })

  describe('POST /api/auth/login', () => {
    it('should return token for valid credentials', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN' as const,
      }
      const mockToken = 'mock.jwt.token'

      mockAuthService.validateUser = jest.fn().mockResolvedValue(mockUser)
      mockAuthService.generateToken = jest.fn().mockReturnValue(mockToken)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          password: 'password123',
        }),
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        token: mockToken,
        user: mockUser,
      })
      expect(mockAuthService.validateUser).toHaveBeenCalledWith('admin', 'password123')
      expect(mockAuthService.generateToken).toHaveBeenCalledWith(mockUser)
    })

    it('should return 401 for invalid credentials', async () => {
      mockAuthService.validateUser = jest.fn().mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          password: 'wrongpassword',
        }),
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({
        error: 'Invalid credentials',
      })
    })

    it('should return 400 for missing fields', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          // missing password
        }),
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('validation')
    })
  })

  describe('POST /api/auth/register', () => {
    it('should create new user successfully', async () => {
      const mockUser = {
        id: '2',
        username: 'newuser',
        email: 'newuser@example.com',
        role: 'USER' as const,
      }
      const mockToken = 'new.jwt.token'

      mockAuthService.createUser = jest.fn().mockResolvedValue(mockUser)
      mockAuthService.generateToken = jest.fn().mockReturnValue(mockToken)

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
          role: 'USER',
        }),
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual({
        token: mockToken,
        user: mockUser,
      })
    })

    it('should return 400 for existing username', async () => {
      mockAuthService.createUser = jest.fn().mockRejectedValue(
        new Error('Username already exists')
      )

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: 'existinguser',
          email: 'new@example.com',
          password: 'password123',
        }),
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Username already exists')
    })
  })

  describe('GET /api/auth/profile', () => {
    it('should return user profile for valid token', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN' as const,
      }

      mockAuthService.verifyToken = jest.fn().mockReturnValue(mockUser)
      mockAuthService.getUserById = jest.fn().mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/auth/profile', {
        headers: {
          authorization: 'Bearer valid.jwt.token',
        },
      })

      const response = await profileHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockUser)
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid.jwt.token')
      expect(mockAuthService.getUserById).toHaveBeenCalledWith(mockUser.id)
    })

    it('should return 401 for missing token', async () => {
      const request = new NextRequest('http://localhost/api/auth/profile')

      const response = await profileHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Missing authorization header')
    })

    it('should return 401 for invalid token', async () => {
      mockAuthService.verifyToken = jest.fn().mockReturnValue(null)

      const request = new NextRequest('http://localhost/api/auth/profile', {
        headers: {
          authorization: 'Bearer invalid.token',
        },
      })

      const response = await profileHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
    })
  })
})