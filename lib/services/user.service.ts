import { BaseService } from './base.service'
import { prisma } from '@/lib/db/prisma'
import { Role, Prisma } from '@/lib/generated/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

interface CreateUserDto {
  username: string
  email: string
  password: string
  role: Role
  firstName?: string
  lastName?: string
  phone?: string
  department?: string
  jobTitle?: string
}

interface UpdateUserDto {
  username?: string
  email?: string
  role?: Role
  isActive?: boolean
  firstName?: string
  lastName?: string
  phone?: string
  department?: string
  jobTitle?: string
}

interface LoginDto {
  email: string
  password: string
  ipAddress?: string
  userAgent?: string
}

interface UserListParams {
  page?: number
  limit?: number
  search?: string
  role?: Role
  isActive?: boolean
  department?: string
}

export class UserService extends BaseService {
  constructor() {
    super('UserService')
  }

  // ==================== USER CRUD ====================

  async createUser(data: CreateUserDto, createdBy: string) {
    return this.withLogging('createUser', async () => {
      const hashedPassword = await bcrypt.hash(data.password, 10)

      const user = await prisma.user.create({
        data: {
          username: data.username,
          email: data.email,
          password: hashedPassword,
          role: data.role,
          isActive: true,
          profile: {
            create: {
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone,
              department: data.department,
              jobTitle: data.jobTitle,
            },
          },
        },
        include: { profile: true },
      })

      // Audit log
      await this.createAuditLog({
        userId: createdBy,
        action: 'CREATE',
        entityType: 'User',
        entityId: user.id,
        afterData: { id: user.id, email: user.email, role: user.role },
      })

      return user
    })
  }

  async updateUser(userId: string, data: UpdateUserDto, updatedBy: string) {
    return this.withLogging('updateUser', async () => {
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      })

      if (!existingUser) {
        throw new Error('User not found')
      }

      const result = await prisma.$transaction(async (tx) => {
        // Update user
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            username: data.username,
            email: data.email,
            role: data.role,
            isActive: data.isActive,
          },
          include: { profile: true },
        })

        // Update profile
        if (data.firstName !== undefined || data.lastName !== undefined || data.phone !== undefined || data.department !== undefined || data.jobTitle !== undefined) {
          await tx.userProfile.update({
            where: { userId },
            data: {
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone,
              department: data.department,
              jobTitle: data.jobTitle,
            },
          })
        }

        // Refetch user with updated profile
        return tx.user.findUnique({
          where: { id: userId },
          include: { profile: true },
        }) as any
      })

      // Audit log
      await this.createAuditLog({
        userId: updatedBy,
        action: 'UPDATE',
        entityType: 'User',
        entityId: userId,
        beforeData: existingUser,
        afterData: result,
      })

      return result
    })
  }

  async getUser(userId: string) {
    return this.withLogging('getUser', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          _count: {
            select: {
              sessions: true,
              userPermissions: true,
            },
          },
        },
      })

      if (!user) {
        throw new Error('User not found')
      }

      return user
    })
  }

  async listUsers(params: UserListParams) {
    return this.withLogging('listUsers', async () => {
      const { page = 1, limit = 20, search, role, isActive, department } = params

      const where: Prisma.UserWhereInput = {}

      if (search) {
        where.OR = [
          { username: { contains: search } },
          { email: { contains: search } },
          { profile: { firstName: { contains: search } } },
          { profile: { lastName: { contains: search } } },
        ]
      }

      if (role) where.role = role
      if (isActive !== undefined) where.isActive = isActive
      if (department) where.profile = { department }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            profile: true,
            _count: {
              select: { sessions: true },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ])

      return {
        data: users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    })
  }

  async deactivateUser(userId: string, deactivatedBy: string) {
    return this.withLogging('deactivateUser', async () => {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      })

      // Revoke all sessions
      await prisma.userSession.deleteMany({
        where: { userId },
      })

      // Audit log
      await this.createAuditLog({
        userId: deactivatedBy,
        action: 'UPDATE',
        entityType: 'User',
        entityId: userId,
        afterData: { isActive: false },
      })

      return user
    })
  }

  // ==================== AUTHENTICATION ====================

  async login(data: LoginDto) {
    return this.withLogging('login', async () => {
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: { profile: true },
      })

      if (!user) {
        throw new Error('Invalid credentials')
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated')
      }

      // Check if account is locked
      if (user.profile?.lockedUntil && user.profile.lockedUntil > new Date()) {
        throw new Error('Account is locked. Please try again later.')
      }

      const isValidPassword = await bcrypt.compare(data.password, user.password)

      if (!isValidPassword) {
        // Increment failed attempts
        await prisma.userProfile.update({
          where: { userId: user.id },
          data: {
            failedLoginAttempts: { increment: 1 },
            // Lock account after 5 failed attempts for 30 minutes
            lockedUntil: user.profile?.failedLoginAttempts && user.profile.failedLoginAttempts >= 4
              ? new Date(Date.now() + 30 * 60 * 1000)
              : undefined,
          },
        })
        throw new Error('Invalid credentials')
      }

      // Reset failed attempts and update last login
      await prisma.userProfile.update({
        where: { userId: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: data.ipAddress,
        },
      })

      // Create session
      const token = crypto.randomBytes(32).toString('hex')
      const session = await prisma.userSession.create({
        data: {
          userId: user.id,
          token,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      })

      // Audit log
      await this.createAuditLog({
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        metadata: { ipAddress: data.ipAddress },
      })

      return { user, session }
    })
  }

  async logout(sessionToken: string) {
    return this.withLogging('logout', async () => {
      const session = await prisma.userSession.findUnique({
        where: { token: sessionToken },
      })

      if (session) {
        await prisma.userSession.delete({
          where: { token: sessionToken },
        })

        // Audit log
        await this.createAuditLog({
          userId: session.userId,
          action: 'LOGOUT',
          entityType: 'User',
          entityId: session.userId,
        })
      }
    })
  }

  async validateSession(token: string) {
    return this.withLogging('validateSession', async () => {
      const session = await prisma.userSession.findUnique({
        where: { token },
        include: { user: true },
      })

      if (!session) {
        throw new Error('Invalid session')
      }

      if (session.expiresAt < new Date()) {
        await prisma.userSession.delete({ where: { token } })
        throw new Error('Session expired')
      }

      if (!session.user.isActive) {
        await prisma.userSession.delete({ where: { token } })
        throw new Error('Account is deactivated')
      }

      // Update last activity
      await prisma.userSession.update({
        where: { token },
        data: { lastActivity: new Date() },
      })

      return session
    })
  }

  // ==================== PERMISSIONS ====================

  async getUserPermissions(userId: string): Promise<string[]> {
    return this.withLogging('getUserPermissions', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Get role permissions
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role: user.role },
        include: { permission: true },
      })

      // Get user-specific permissions
      const userPermissions = await prisma.userPermission.findMany({
        where: { 
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: { permission: true },
      })

      // Combine permissions
      const permissions = new Set<string>()
      
      // Add role permissions
      rolePermissions.forEach(rp => permissions.add(rp.permission.code))
      
      // Add/remove user permissions
      userPermissions.forEach(up => {
        if (up.granted) {
          permissions.add(up.permission.code)
        } else {
          permissions.delete(up.permission.code)
        }
      })

      return Array.from(permissions)
    })
  }

  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId)
    return permissions.includes(permissionCode)
  }

  async assignPermission(userId: string, permissionCode: string, assignedBy: string, expiresAt?: Date) {
    return this.withLogging('assignPermission', async () => {
      const permission = await prisma.permission.findFirst({
        where: { code: permissionCode },
      })

      if (!permission) {
        throw new Error('Permission not found')
      }

      const userPermission = await prisma.userPermission.create({
        data: {
          userId,
          permissionId: permission.id,
          granted: true,
          expiresAt,
        },
      })

      // Audit log
      await this.createAuditLog({
        userId: assignedBy,
        action: 'GRANT_PERMISSION',
        entityType: 'UserPermission',
        entityId: userPermission.id,
        metadata: { userId, permissionCode, expiresAt },
      })

      return userPermission
    })
  }

  async revokePermission(userId: string, permissionCode: string, revokedBy: string) {
    return this.withLogging('revokePermission', async () => {
      const permission = await prisma.permission.findFirst({
        where: { code: permissionCode },
      })

      if (!permission) {
        throw new Error('Permission not found')
      }

      await prisma.userPermission.delete({
        where: {
          userId_permissionId: {
            userId,
            permissionId: permission.id,
          },
        },
      })

      // Audit log
      await this.createAuditLog({
        userId: revokedBy,
        action: 'REVOKE_PERMISSION',
        entityType: 'UserPermission',
        entityId: permission.id,
        metadata: { userId, permissionCode },
      })
    })
  }

  // ==================== SESSION MANAGEMENT ====================

  async getUserSessions(userId: string) {
    return this.withLogging('getUserSessions', async () => {
      return prisma.userSession.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastActivity: 'desc' },
      })
    })
  }

  async revokeSession(sessionId: string, revokedBy: string) {
    return this.withLogging('revokeSession', async () => {
      const session = await prisma.userSession.delete({
        where: { id: sessionId },
      })

      // Audit log
      await this.createAuditLog({
        userId: revokedBy,
        action: 'REVOKE_SESSION',
        entityType: 'UserSession',
        entityId: sessionId,
        metadata: { userId: session.userId },
      })
    })
  }

  async revokeAllSessions(userId: string, revokedBy: string) {
    return this.withLogging('revokeAllSessions', async () => {
      const result = await prisma.userSession.deleteMany({
        where: { userId },
      })

      // Audit log
      await this.createAuditLog({
        userId: revokedBy,
        action: 'REVOKE_ALL_SESSIONS',
        entityType: 'User',
        entityId: userId,
        metadata: { sessionsRevoked: result.count },
      })

      return result
    })
  }

  // ==================== PASSWORD MANAGEMENT ====================

  async resetPassword(userId: string, newPassword: string, resetBy: string) {
    return this.withLogging('resetPassword', async () => {
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      })

      // Revoke all sessions
      await prisma.userSession.deleteMany({
        where: { userId },
      })

      // Audit log
      await this.createAuditLog({
        userId: resetBy,
        action: 'RESET_PASSWORD',
        entityType: 'User',
        entityId: userId,
      })
    })
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    return this.withLogging('changePassword', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      const isValid = await bcrypt.compare(currentPassword, user.password)
      if (!isValid) {
        throw new Error('Current password is incorrect')
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      })

      // Audit log
      await this.createAuditLog({
        userId,
        action: 'CHANGE_PASSWORD',
        entityType: 'User',
        entityId: userId,
      })
    })
  }

  // ==================== ACTIVITY MONITORING ====================

  async getUserActivity(userId: string, days: number = 30) {
    return this.withLogging('getUserActivity', async () => {
      const since = new Date()
      since.setDate(since.getDate() - days)

      return prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: { gte: since },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      })
    })
  }

  async getSystemActivity(params: {
    action?: string
    entityType?: string
    userId?: string
    since?: Date
    limit?: number
  }) {
    return this.withLogging('getSystemActivity', async () => {
      const { action, entityType, userId, since, limit = 100 } = params

      const where: Prisma.AuditLogWhereInput = {}
      if (action) where.action = action
      if (entityType) where.entityType = entityType
      if (userId) where.userId = userId
      if (since) where.timestamp = { gte: since }

      return prisma.auditLog.findMany({
        where,
        include: { user: true },
        orderBy: { timestamp: 'desc' },
        take: limit,
      })
    })
  }

  // ==================== HELPER METHODS ====================

  private async createAuditLog(data: {
    userId: string
    action: string
    entityType: string
    entityId: string
    metadata?: any
    beforeData?: any
    afterData?: any
  }) {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata || undefined,
        beforeData: data.beforeData || undefined,
        afterData: data.afterData || undefined,
      },
    })
  }

  // ==================== ADDITIONAL PERMISSION METHODS ====================

  async getRolePermissions(userId: string): Promise<string[]> {
    return this.withLogging('getRolePermissions', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })

      if (!user) {
        throw new Error('User not found')
      }

      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role: user.role },
        include: { permission: true },
      })

      return rolePermissions.map(rp => rp.permission.code)
    })
  }

  async getIndividualPermissions(userId: string) {
    return this.withLogging('getIndividualPermissions', async () => {
      const userPermissions = await prisma.userPermission.findMany({
        where: { userId },
        include: { permission: true },
      })

      return userPermissions.map(up => ({
        id: up.id,
        permission: up.permission,
        granted: up.granted,
      }))
    })
  }

  async removeUserPermission(userId: string, permissionCode: string, actionByUserId: string) {
    return this.withLogging('removeUserPermission', async () => {
      // Find the permission
      const permission = await prisma.permission.findUnique({
        where: { code: permissionCode },
      })

      if (!permission) {
        throw new Error('Permission not found')
      }

      // Delete the user permission override
      await prisma.userPermission.deleteMany({
        where: {
          userId,
          permissionId: permission.id,
        },
      })

      // Audit log
      await this.createAuditLog({
        userId: actionByUserId,
        action: 'REMOVE_PERMISSION',
        entityType: 'UserPermission',
        entityId: userId,
        metadata: {
          targetUserId: userId,
          permission: permissionCode,
        },
      })
    })
  }

  async getPermissionsForRole(role: Role): Promise<string[]> {
    return this.withLogging('getPermissionsForRole', async () => {
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role },
        include: { permission: true },
      })

      return rolePermissions.map(rp => rp.permission.code)
    })
  }

  async assignRolePermission(role: Role, permissionCode: string, assignedBy: string) {
    return this.withLogging('assignRolePermission', async () => {
      const permission = await prisma.permission.findFirst({
        where: { code: permissionCode },
      })

      if (!permission) {
        throw new Error('Permission not found')
      }

      // Check if already exists
      const existing = await prisma.rolePermission.findUnique({
        where: {
          role_permissionId: {
            role,
            permissionId: permission.id,
          },
        },
      })

      if (existing) {
        return existing
      }

      const rolePermission = await prisma.rolePermission.create({
        data: {
          role,
          permissionId: permission.id,
        },
      })

      // Audit log
      await this.createAuditLog({
        userId: assignedBy,
        action: 'GRANT_ROLE_PERMISSION',
        entityType: 'RolePermission',
        entityId: rolePermission.id,
        metadata: { role, permissionCode },
      })

      return rolePermission
    })
  }

  async revokeRolePermission(role: Role, permissionCode: string, revokedBy: string) {
    return this.withLogging('revokeRolePermission', async () => {
      const permission = await prisma.permission.findFirst({
        where: { code: permissionCode },
      })

      if (!permission) {
        throw new Error('Permission not found')
      }

      await prisma.rolePermission.delete({
        where: {
          role_permissionId: {
            role,
            permissionId: permission.id,
          },
        },
      })

      // Audit log
      await this.createAuditLog({
        userId: revokedBy,
        action: 'REVOKE_ROLE_PERMISSION',
        entityType: 'RolePermission',
        entityId: permission.id,
        metadata: { role, permissionCode },
      })
    })
  }
}