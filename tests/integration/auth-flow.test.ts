import { prisma } from '@/lib/db/prisma'
import { AuthService } from '@/lib/services/auth.service'
import { AuditService } from '@/lib/services/audit.service'
import bcrypt from 'bcryptjs'

describe('Authentication Flow Integration', () => {
  const authService = new AuthService()
  const auditService = new AuditService()
  
  beforeEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({})
    await prisma.user.deleteMany({
      where: { username: { not: 'admin' } }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should complete full authentication flow', async () => {
    // 1. Create a new user
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'USER' as const,
    }

    const newUser = await authService.createUser(userData)
    expect(newUser).toHaveProperty('id')
    expect(newUser.username).toBe(userData.username)
    expect(newUser.email).toBe(userData.email)
    expect(newUser.role).toBe(userData.role)

    // 2. Verify password was hashed
    const dbUser = await prisma.user.findUnique({
      where: { id: newUser.id }
    })
    expect(dbUser?.password).not.toBe(userData.password)
    const isPasswordValid = await bcrypt.compare(userData.password, dbUser!.password)
    expect(isPasswordValid).toBe(true)

    // 3. Validate user can login
    const validatedUser = await authService.validateUser(userData.username, userData.password)
    expect(validatedUser).not.toBeNull()
    expect(validatedUser?.id).toBe(newUser.id)

    // 4. Generate and verify token
    const token = authService.generateToken(validatedUser!)
    expect(token).toBeTruthy()
    
    const decoded = authService.verifyToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded?.id).toBe(newUser.id)
    expect(decoded?.username).toBe(userData.username)

    // 5. Test invalid login
    const invalidUser = await authService.validateUser(userData.username, 'wrongpassword')
    expect(invalidUser).toBeNull()

    // 6. Test inactive user
    await prisma.user.update({
      where: { id: newUser.id },
      data: { isActive: false }
    })
    
    const inactiveUser = await authService.validateUser(userData.username, userData.password)
    expect(inactiveUser).toBeNull()
  })

  it('should create audit logs for authentication events', async () => {
    const testUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })
    
    expect(testUser).not.toBeNull()

    // Log a successful login
    await auditService.logAction({
      userId: testUser!.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: testUser!.id,
      metadata: { success: true, username: 'admin' },
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    })

    // Log a failed login (using existing user ID since foreign key constraint exists)
    await auditService.logAction({
      userId: testUser!.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: 'admin',
      metadata: { success: false, reason: 'Invalid credentials' },
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    })

    // Verify audit logs were created
    const logs = await auditService.getAuditLogs(
      { action: 'LOGIN' },
      { page: 1, limit: 10 }
    )

    expect(logs.total).toBeGreaterThanOrEqual(2)
    expect(logs.data).toContainEqual(
      expect.objectContaining({
        action: 'LOGIN',
        entityType: 'User',
        metadata: expect.objectContaining({ success: true }),
      })
    )
    expect(logs.data).toContainEqual(
      expect.objectContaining({
        action: 'LOGIN',
        entityType: 'User',
        metadata: expect.objectContaining({ success: false }),
      })
    )
  })

  it('should track user modifications with audit trail', async () => {
    const testUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: testUser!.id },
      data: { email: 'newemail@example.com' }
    })

    // Manually log the update (in real app, this would be automatic via Prisma extension)
    await auditService.logAction({
      userId: testUser!.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: testUser!.id,
      beforeData: { email: testUser!.email },
      afterData: { email: updatedUser.email },
    })

    // Get entity history
    const history = await auditService.getEntityHistory('User', testUser!.id)
    
    const updateLog = history.find(log => log.action === 'UPDATE')
    expect(updateLog).toBeDefined()
    expect(updateLog?.beforeData).toEqual({ email: 'admin@example.com' })
    expect(updateLog?.afterData).toEqual({ email: 'newemail@example.com' })

    // Restore original email
    await prisma.user.update({
      where: { id: testUser!.id },
      data: { email: 'admin@example.com' }
    })
  })

  it('should generate accurate audit reports', async () => {
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    // Create some test audit logs
    const testUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    await Promise.all([
      auditService.logAction({
        userId: testUser!.id,
        action: 'CREATE',
        entityType: 'Lead',
        entityId: 'lead-1',
      }),
      auditService.logAction({
        userId: testUser!.id,
        action: 'UPDATE',
        entityType: 'Lead',
        entityId: 'lead-1',
      }),
      auditService.logAction({
        userId: testUser!.id,
        action: 'READ',
        entityType: 'Dashboard',
        entityId: 'main',
      })])

    const report = await auditService.generateAuditReport(startDate, endDate)
    
    expect(report.totalActions).toBeGreaterThanOrEqual(3)
    expect(report.actionBreakdown).toHaveProperty('CREATE')
    expect(report.actionBreakdown).toHaveProperty('UPDATE')
    expect(report.actionBreakdown).toHaveProperty('READ')
    expect(report.entityBreakdown).toHaveProperty('Lead')
    expect(report.entityBreakdown).toHaveProperty('Dashboard')
    expect(report.userBreakdown).toHaveProperty(testUser!.id)
  })
})