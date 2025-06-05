import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { UserService } from '@/lib/services/user.service'
import { prisma } from '@/lib/db/prisma'
import { Role } from '@/lib/generated/prisma'
import bcrypt from 'bcryptjs'

describe('UserService Integration Tests', () => {
  let userService: UserService
  let testUserId: string
  let adminUserId: string

  beforeAll(async () => {
    userService = new UserService()

    // Create an admin user for testing
    const adminUser = await prisma.user.create({
      data: {
        username: 'testadmin',
        email: 'testadmin@test.com',
        password: await bcrypt.hash('Admin123!', 10),
        role: Role.ADMIN,
        isActive: true,
        profile: {
          create: {
            firstName: 'Test',
            lastName: 'Admin',
          },
        },
      },
    })
    adminUserId = adminUser.id
  })

  afterAll(async () => {
    try {
      // Clean up test data in correct order to avoid foreign key constraints
      await prisma.userSession.deleteMany({})
      await prisma.userPermission.deleteMany({})
      await prisma.auditLog.deleteMany({
        where: {
          user: {
            email: {
              contains: 'test',
            },
          },
        },
      })
      await prisma.userProfile.deleteMany({})
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test',
          },
        },
      })
} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
  })

  beforeEach(async () => {
    // Clean up sessions between tests
    await prisma.userSession.deleteMany({})
  })

  describe('User CRUD Operations', () => {
    it('should create a new user with profile', async () => {
      const createUserDto = {
        username: 'testuser1',
        email: 'testuser1@test.com',
        password: 'Password123!',
        role: Role.USER,
        firstName: 'Test',
        lastName: 'User',
        department: 'IT',
      }

      const user = await userService.createUser(createUserDto, adminUserId)
      testUserId = user.id

      expect(user).toBeDefined()
      expect(user.username).toBe(createUserDto.username)
      expect(user.email).toBe(createUserDto.email)
      expect(user.role).toBe(createUserDto.role)
      expect(user.isActive).toBe(true)
      expect(user.profile).toBeDefined()
      expect(user.profile?.firstName).toBe(createUserDto.firstName)
      expect(user.profile?.lastName).toBe(createUserDto.lastName)
      expect(user.profile?.department).toBe(createUserDto.department)
    })

    it('should update user information', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        department: 'Sales',
        jobTitle: 'Sales Manager',
      }

      const updatedUser = await userService.updateUser(testUserId, updateData, adminUserId)

      expect(updatedUser.profile?.firstName).toBe(updateData.firstName)
      expect(updatedUser.profile?.lastName).toBe(updateData.lastName)
      expect(updatedUser.profile?.department).toBe(updateData.department)
      expect(updatedUser.profile?.jobTitle).toBe(updateData.jobTitle)
    })

    it('should list users with pagination', async () => {
      // Create additional users
      await userService.createUser({
        username: 'testuser2',
        email: 'testuser2@test.com',
        password: 'Password123!',
        role: Role.SALES_REP,
      }, adminUserId)

      await userService.createUser({
        username: 'testuser3',
        email: 'testuser3@test.com',
        password: 'Password123!',
        role: Role.SALES_REP,
      }, adminUserId)

      const result = await userService.listUsers({
        page: 1,
        limit: 10,
        role: Role.SALES_REP,
      })

      expect(result.data.length).toBe(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
    })

    it('should deactivate a user', async () => {
      const user = await userService.createUser({
        username: 'deactivatetest',
        email: 'deactivate@test.com',
        password: 'Password123!',
        role: Role.USER,
      }, adminUserId)

      const deactivated = await userService.deactivateUser(user.id, adminUserId)

      expect(deactivated.isActive).toBe(false)

      // Should not be able to login
      await expect(userService.login({
        email: 'deactivate@test.com',
        password: 'Password123!',
      })).rejects.toThrow('Account is deactivated')
    })
  })

  describe('Authentication', () => {
    it('should authenticate user with correct credentials', async () => {
      const user = await userService.createUser({
        username: 'logintest',
        email: 'login@test.com',
        password: 'Password123!',
        role: Role.USER,
      }, adminUserId)

      const result = await userService.login({
        email: 'login@test.com',
        password: 'Password123!',
        ipAddress: '127.0.0.1',
      })

      expect(result.user.id).toBe(user.id)
      expect(result.session).toBeDefined()
      expect(result.session.token).toBeDefined()
      expect(result.session.expiresAt).toBeDefined()
    })

    it('should reject invalid credentials', async () => {
      await expect(userService.login({
        email: 'nonexistent@test.com',
        password: 'WrongPassword',
      })).rejects.toThrow('Invalid credentials')
    })

    it('should logout user', async () => {
      const loginResult = await userService.login({
        email: 'login@test.com',
        password: 'Password123!',
      })

      await userService.logout(loginResult.session.token)

      // Session should be invalid
      await expect(userService.validateSession(loginResult.session.token))
        .rejects.toThrow('Invalid session')
    })

    it('should validate active session', async () => {
      const loginResult = await userService.login({
        email: 'login@test.com',
        password: 'Password123!',
      })

      const session = await userService.validateSession(loginResult.session.token)

      expect(session.userId).toBe(loginResult.user.id)
      expect(session.token).toBe(loginResult.session.token)
    })
  })

  describe('Permissions', () => {
    it('should get user permissions based on role', async () => {
      const salesRep = await userService.createUser({
        username: 'salesrep',
        email: 'salesrep@test.com',
        password: 'Password123!',
        role: Role.SALES_REP,
      }, adminUserId)

      const permissions = await userService.getUserPermissions(salesRep.id)

      // Should have sales permissions
      expect(permissions).toContain('sales.create')
      expect(permissions).toContain('sales.read')
      expect(permissions).toContain('sales.update')
      
      // Should not have admin permissions
      expect(permissions).not.toContain('users.create')
      expect(permissions).not.toContain('accounting.delete')
    })

    it('should assign additional permission to user', async () => {
      const user = await userService.createUser({
        username: 'permtest',
        email: 'permtest@test.com',
        password: 'Password123!',
        role: Role.VIEWER,
      }, adminUserId)

      // Viewer should not have sales.create by default
      let permissions = await userService.getUserPermissions(user.id)
      expect(permissions).not.toContain('sales.create')

      // Assign the permission
      await userService.assignPermission(user.id, 'sales.create', adminUserId)

      // Should now have the permission
      permissions = await userService.getUserPermissions(user.id)
      expect(permissions).toContain('sales.create')
    })

    it('should revoke permission from user', async () => {
      const user = await userService.createUser({
        username: 'revoketest',
        email: 'revoketest@test.com',
        password: 'Password123!',
        role: Role.SALES_REP,
      }, adminUserId)

      // Should have sales.create by default
      let permissions = await userService.getUserPermissions(user.id)
      expect(permissions).toContain('sales.create')

      // Remove the permission (need to add it as revoked first)
      await prisma.userPermission.create({
        data: {
          userId: user.id,
          permissionId: (await prisma.permission.findFirst({ where: { code: 'sales.create' } }))!.id,
          granted: false,
        },
      })

      // Should no longer have the permission
      permissions = await userService.getUserPermissions(user.id)
      expect(permissions).not.toContain('sales.create')
    })
  })

  describe('Session Management', () => {
    it('should get active sessions for user', async () => {
      const user = await userService.createUser({
        username: 'sessiontest',
        email: 'sessiontest@test.com',
        password: 'Password123!',
        role: Role.USER,
      }, adminUserId)

      // Create multiple sessions
      await userService.login({
        email: 'sessiontest@test.com',
        password: 'Password123!',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
      })

      await userService.login({
        email: 'sessiontest@test.com',
        password: 'Password123!',
        ipAddress: '192.168.1.2',
        userAgent: 'Firefox',
      })

      const sessions = await userService.getUserSessions(user.id)

      expect(sessions.length).toBe(2)
      expect(sessions[0].ipAddress).toBeDefined()
      expect(sessions[0].userAgent).toBeDefined()
    })

    it('should revoke all sessions', async () => {
      const user = await userService.createUser({
        username: 'revokealltest',
        email: 'revokeall@test.com',
        password: 'Password123!',
        role: Role.USER,
      }, adminUserId)

      // Create sessions
      const session1 = await userService.login({
        email: 'revokeall@test.com',
        password: 'Password123!',
      })

      const session2 = await userService.login({
        email: 'revokeall@test.com',
        password: 'Password123!',
      })

      // Revoke all sessions
      await userService.revokeAllSessions(user.id, adminUserId)

      // Both sessions should be invalid
      await expect(userService.validateSession(session1.session.token))
        .rejects.toThrow('Invalid session')
      await expect(userService.validateSession(session2.session.token))
        .rejects.toThrow('Invalid session')
    })
  })

  describe('Password Management', () => {
    it('should reset user password', async () => {
      const user = await userService.createUser({
        username: 'resetpwd',
        email: 'resetpwd@test.com',
        password: 'OldPassword123!',
        role: Role.USER,
      }, adminUserId)

      // Reset password
      await userService.resetPassword(user.id, 'NewPassword123!', adminUserId)

      // Should not be able to login with old password
      await expect(userService.login({
        email: 'resetpwd@test.com',
        password: 'OldPassword123!',
      })).rejects.toThrow('Invalid credentials')

      // Should be able to login with new password
      const result = await userService.login({
        email: 'resetpwd@test.com',
        password: 'NewPassword123!',
      })

      expect(result.user.id).toBe(user.id)
    })

    it('should change own password', async () => {
      const user = await userService.createUser({
        username: 'changepwd',
        email: 'changepwd@test.com',
        password: 'CurrentPassword123!',
        role: Role.USER,
      }, adminUserId)

      // Change password
      await userService.changePassword(user.id, 'CurrentPassword123!', 'NewPassword123!')

      // Should be able to login with new password
      const result = await userService.login({
        email: 'changepwd@test.com',
        password: 'NewPassword123!',
      })

      expect(result.user.id).toBe(user.id)
    })

    it('should reject incorrect current password', async () => {
      const user = await userService.createUser({
        username: 'wrongpwd',
        email: 'wrongpwd@test.com',
        password: 'ActualPassword123!',
        role: Role.USER,
      }, adminUserId)

      await expect(userService.changePassword(
        user.id,
        'WrongPassword123!',
        'NewPassword123!'
      )).rejects.toThrow('Current password is incorrect')
    })
  })

  describe('Activity Monitoring', () => {
    it('should track user activity', async () => {
      const user = await userService.createUser({
        username: 'activitytest',
        email: 'activity@test.com',
        password: 'Password123!',
        role: Role.USER,
      }, adminUserId)

      // Perform some actions
      await userService.login({
        email: 'activity@test.com',
        password: 'Password123!',
      })

      await userService.updateUser(user.id, {
        department: 'Marketing',
      }, adminUserId)

      // Get activity
      const activity = await userService.getUserActivity(user.id, 30)

      expect(activity.length).toBeGreaterThan(0)
      expect(activity.some(a => a.action === 'LOGIN')).toBe(true)
    })
  })
})