import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthService } from '@/lib/services/auth.service'
import { prisma } from '@/lib/db/prisma'

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

// Mock bcrypt
jest.mock('bcryptjs')

// Mock jwt
jest.mock('jsonwebtoken')

describe('AuthService', () => {
  let authService: AuthService
  
  beforeEach(() => {
    authService = new AuthService()
    jest.clearAllMocks()
  })

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        password: '$2a$10$hashedpassword',
        email: 'admin@example.com',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const result = await authService.validateUser('admin', 'password123')

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
      })
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'admin' },
      })
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password)
    })

    it('should return null if user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await authService.validateUser('nonexistent', 'password')

      expect(result).toBeNull()
      expect(bcrypt.compare).not.toHaveBeenCalled()
    })

    it('should return null if password is invalid', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        password: '$2a$10$hashedpassword',
        isActive: true,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const result = await authService.validateUser('admin', 'wrongpassword')

      expect(result).toBeNull()
    })

    it('should return null if user is inactive', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        password: '$2a$10$hashedpassword',
        isActive: false,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await authService.validateUser('admin', 'password123')

      expect(result).toBeNull()
      expect(bcrypt.compare).not.toHaveBeenCalled()
    })
  })

  describe('generateToken', () => {
    it('should generate a JWT token with user data', () => {
      const user = {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      }
      const mockToken = 'mock.jwt.token'

      ;(jwt.sign as jest.Mock).mockReturnValue(mockToken)

      const token = authService.generateToken(user)

      expect(token).toBe(mockToken)
      expect(jwt.sign).toHaveBeenCalledWith(
        user,
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '24h' }
      )
    })
  })

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const mockDecoded = {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      }

      ;(jwt.verify as jest.Mock).mockReturnValue(mockDecoded)

      const result = authService.verifyToken('valid.jwt.token')

      expect(result).toEqual(mockDecoded)
      expect(jwt.verify).toHaveBeenCalledWith(
        'valid.jwt.token',
        process.env.JWT_SECRET || 'default-secret'
      )
    })

    it('should return null for invalid token', () => {
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = authService.verifyToken('invalid.token')

      expect(result).toBeNull()
    })
  })

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'password123'
      const hashedPassword = '$2a$10$hashedpassword'

      ;(bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword)

      const result = await authService.hashPassword(password)

      expect(result).toBe(hashedPassword)
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10)
    })
  })

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        email: 'newuser@example.com',
        role: 'USER' as const,
      }
      const hashedPassword = '$2a$10$hashedpassword'
      const createdUser = {
        id: '2',
        ...userData,
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword)
      ;(prisma.user.create as jest.Mock).mockResolvedValue(createdUser)

      const result = await authService.createUser(userData)

      expect(result).toEqual({
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        role: createdUser.role,
      })
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          ...userData,
          password: hashedPassword,
        },
      })
    })

    it('should throw error if username already exists', async () => {
      const userData = {
        username: 'existinguser',
        password: 'password123',
        email: 'user@example.com',
        role: 'USER' as const,
      }

      ;(prisma.user.create as jest.Mock).mockRejectedValue(
        new Error('Unique constraint failed on the fields: (`username`)')
      )

      await expect(authService.createUser(userData)).rejects.toThrow(
        'Username already exists'
      )
    })
  })

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await authService.getUserById('1')

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
      })
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })

    it('should return null if user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await authService.getUserById('nonexistent')

      expect(result).toBeNull()
    })
  })
})