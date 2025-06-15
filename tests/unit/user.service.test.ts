import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { UserService } from '@/lib/services/user.service'
import { Role } from '@/lib/generated/prisma'
import * as bcrypt from 'bcryptjs'

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  userProfile: {
    create: jest.fn(),
    update: jest.fn(),
  },
  userSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  permission: {
    findMany: jest.fn(),
  },
  rolePermission: {
    findMany: jest.fn(),
  },
  userPermission: {
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
}

jest.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}))

jest.mock('bcryptjs')

describe('UserService', () => {
  let userService: UserService
  const mockUserId = 'user123'

  beforeEach(() => {
    jest.clearAllMocks()
    userService = new UserService()
  })

  describe('User CRUD Operations', () => {
    it('should create a new user with profile', async () => {
      const createUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: Role.USER,
        firstName: 'Test',
        lastName: 'User',
        department: 'IT',
      }

      const hashedPassword = 'hashedPassword123'
      ;(bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword)

      const createdUser = {
        id: 'user123',
        username: createUserDto.username,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role,
        isActive: true,
      }

      mockPrisma.user.create.mockResolvedValue({
        ...createdUser,
        profile: {
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          department: createUserDto.department,
        },
      })

      const result = await userService.createUser(createUserDto, mockUserId)

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          username: createUserDto.username,
          email: createUserDto.email,
          password: hashedPassword,
          role: createUserDto.role,
          isActive: true,
          profile: {
            create: {
              firstName: createUserDto.firstName,
              lastName: createUserDto.lastName,
              department: createUserDto.department,
              jobTitle: undefined,
              phone: undefined,
            },
          },
        },
        include: { profile: true },
      })
      expect(result).toEqual(expect.objectContaining({
        username: createUserDto.username,
        email: createUserDto.email,
      }))
    })

    it('should update user information', async () => {
      const updateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
        department: 'Sales',
        isActive: false,
      }

      const updatedUser = {
        id: 'user456',
        username: 'existinguser',
        email: 'existing@example.com',
        isActive: false,
        profile: {
          firstName: updateUserDto.firstName,
          lastName: updateUserDto.lastName,
          department: updateUserDto.department,
        },
      }

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const prismaInTransaction = {
          user: {
            update: jest.fn().mockResolvedValue(updatedUser),
          },
          userProfile: {
            update: jest.fn(),
          },
        }
        return fn(prismaInTransaction)
      })

      const result = await userService.updateUser('user456', updateUserDto, mockUserId)

      expect(result).toEqual(updatedUser)
    })

    it('should list users with pagination and filters', async () => {
      const users = [
        { id: '1', username: 'user1', email: 'user1@example.com', role: Role.USER },
        { id: '2', username: 'user2', email: 'user2@example.com', role: Role.ADMIN },
      ]

      mockPrisma.user.findMany.mockResolvedValue(users)
      mockPrisma.user.count.mockResolvedValue(2)

      const result = await userService.listUsers({
        page: 1,
        limit: 10,
        role: Role.USER,
        isActive: true,
      })

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: Role.USER,
          isActive: true,
        },
        include: {
          profile: true,
          _count: {
            select: { sessions: true },
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })

      expect(result).toEqual({
        data: users,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })
  })

  describe('Authentication', () => {
    it('should authenticate user with correct credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      }

      const user = {
        id: 'user123',
        email: loginDto.email,
        password: 'hashedPassword',
        isActive: true,
        role: Role.USER,
        profile: { id: 'profile123' },
      }

      mockPrisma.user.findUnique.mockResolvedValue(user)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const session = {
        id: 'session123',
        token: 'token123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

      mockPrisma.userSession.create.mockResolvedValue(session)

      const result = await userService.login(loginDto)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        include: { profile: true },
      })
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, user.password)
      expect(result).toEqual({
        user,
        session,
      })
    })

    it('should reject invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }

      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(userService.login(loginDto)).rejects.toThrow('Invalid credentials')
    })

    it('should reject inactive users', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      }

      const user = {
        id: 'user123',
        email: loginDto.email,
        password: 'hashedPassword',
        isActive: false,
      }

      mockPrisma.user.findUnique.mockResolvedValue(user)

      await expect(userService.login(loginDto)).rejects.toThrow('Account is deactivated')
    })

    it('should logout user by invalidating session', async () => {
      const sessionToken = 'token123'

      await userService.logout(sessionToken)

      expect(mockPrisma.userSession.delete).toHaveBeenCalledWith({
        where: { token: sessionToken },
      })
    })
  })

  describe('Permissions', () => {
    it('should get user permissions including role permissions', async () => {
      const userId = 'user123'
      const user = {
        id: userId,
        role: Role.SALES_REP,
      }

      const rolePermissions = [
        { permission: { code: 'sales.create' } },
        { permission: { code: 'sales.read' } },
      ]

      const userPermissions = [
        { permission: { code: 'reports.export' }, granted: true },
        { permission: { code: 'users.read' }, granted: false },
      ]

      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockPrisma.rolePermission.findMany.mockResolvedValue(rolePermissions)
      mockPrisma.userPermission.findMany.mockResolvedValue(userPermissions)

      const result = await userService.getUserPermissions(userId)

      expect(result).toEqual(['sales.create', 'sales.read', 'reports.export'])
    })

    it('should check if user has specific permission', async () => {
      jest.spyOn(userService, 'getUserPermissions').mockResolvedValue([
        'sales.create',
        'sales.read',
        'inventory.read'])

      const hasPermission = await userService.hasPermission('user123', 'sales.create')
      const doesNotHavePermission = await userService.hasPermission('user123', 'sales.delete')

      expect(hasPermission).toBe(true)
      expect(doesNotHavePermission).toBe(false)
    })

    it('should assign permission to user', async () => {
      const userId = 'user123'
      const permissionCode = 'reports.export'

      const permission = { id: 'perm123', code: permissionCode }
      mockPrisma.permission.findMany.mockResolvedValue([permission])

      await userService.assignPermission(userId, permissionCode, mockUserId)

      expect(mockPrisma.userPermission.create).toHaveBeenCalledWith({
        data: {
          userId,
          permissionId: permission.id,
          granted: true,
        },
      })
    })

    it('should revoke permission from user', async () => {
      const userId = 'user123'
      const permissionCode = 'reports.export'

      const permission = { id: 'perm123', code: permissionCode }
      mockPrisma.permission.findMany.mockResolvedValue([permission])

      await userService.revokePermission(userId, permissionCode, mockUserId)

      expect(mockPrisma.userPermission.delete).toHaveBeenCalledWith({
        where: {
          userId_permissionId: {
            userId,
            permissionId: permission.id,
          },
        },
      })
    })
  })

  describe('Session Management', () => {
    it('should get active sessions for user', async () => {
      const userId = 'user123'
      const sessions = [
        {
          id: 'session1',
          token: 'token1',
          ipAddress: '192.168.1.1',
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      ]

      mockPrisma.userSession.findMany.mockResolvedValue(sessions)

      const result = await userService.getUserSessions(userId)

      expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { lastActivity: 'desc' },
      })
      expect(result).toEqual(sessions)
    })

    it('should revoke all user sessions', async () => {
      const userId = 'user123'

      await userService.revokeAllSessions(userId, mockUserId)

      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      })
    })

    it('should validate session token', async () => {
      const token = 'validtoken123'
      const session = {
        id: 'session123',
        userId: 'user123',
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: {
          id: 'user123',
          isActive: true,
        },
      }

      mockPrisma.userSession.findUnique.mockResolvedValue(session)
      mockPrisma.userSession.update.mockResolvedValue(session)

      const result = await userService.validateSession(token)

      expect(result).toEqual(session)
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { token },
        data: { lastActivity: expect.any(Date) },
      })
    })

    it('should reject expired session', async () => {
      const token = 'expiredtoken123'
      const session = {
        id: 'session123',
        userId: 'user123',
        token,
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: {
          id: 'user123',
          isActive: true,
        },
      }

      mockPrisma.userSession.findUnique.mockResolvedValue(session)

      await expect(userService.validateSession(token)).rejects.toThrow('Session expired')
    })
  })

  describe('Password Management', () => {
    it('should reset user password', async () => {
      const userId = 'user123'
      const newPassword = 'newPassword123'
      const hashedPassword = 'hashedNewPassword'

      ;(bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword)

      await userService.resetPassword(userId, newPassword, mockUserId)

      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: hashedPassword },
      })
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      })
    })

    it('should change own password', async () => {
      const userId = 'user123'
      const currentPassword = 'currentPassword'
      const newPassword = 'newPassword123'
      const hashedNewPassword = 'hashedNewPassword'

      const user = {
        id: userId,
        password: 'hashedCurrentPassword',
      }

      mockPrisma.user.findUnique.mockResolvedValue(user)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue(hashedNewPassword)

      await userService.changePassword(userId, currentPassword, newPassword)

      expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, user.password)
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: hashedNewPassword },
      })
    })

    it('should reject incorrect current password', async () => {
      const userId = 'user123'
      const currentPassword = 'wrongPassword'
      const newPassword = 'newPassword123'

      const user = {
        id: userId,
        password: 'hashedCurrentPassword',
      }

      mockPrisma.user.findUnique.mockResolvedValue(user)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(
        userService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow('Current password is incorrect')
    })
  })
})