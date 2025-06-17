import { BaseService } from './base.service'
import { prisma } from '@/lib/db/prisma'
import { Role, Prisma } from '@/lib/generated/prisma'

export class SalesTeamService extends BaseService {
  constructor() {
    super('SalesTeamService')
  }

  /**
   * Assign a sales manager to a salesperson
   */
  async assignSalesManager(salespersonId: string, managerId: string, assignedBy: string) {
    return this.withLogging('assignSalesManager', async () => {
      // Validate salesperson
      const salesperson = await prisma.user.findUnique({
        where: { id: salespersonId },
        select: { id: true, role: true },
      })

      if (!salesperson) {
        throw new Error('Salesperson not found')
      }

      if (salesperson.role !== Role.SALES_REP) {
        throw new Error('User must have SALES_REP role')
      }

      // Validate manager
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, role: true },
      })

      if (!manager) {
        throw new Error('Manager not found')
      }

      if (manager.role !== Role.MANAGER) {
        throw new Error('Manager must have MANAGER role')
      }

      // Update salesperson's manager
      const updated = await prisma.user.update({
        where: { id: salespersonId },
        data: { managerId },
      })

      // Audit log
      await this.createAuditLog({
        userId: assignedBy,
        action: 'ASSIGN_MANAGER',
        entityType: 'User',
        entityId: salespersonId,
        metadata: { managerId },
      })

      return updated
    })
  }

  /**
   * Assign a customer to a salesperson or manager
   */
  async assignCustomerToSalesperson(
    customerId: string,
    salespersonId: string,
    assignedBy: string,
    notes?: string
  ) {
    return this.withLogging('assignCustomerToSalesperson', async () => {
      // Validate salesperson/manager
      const user = await prisma.user.findUnique({
        where: { id: salespersonId },
        select: { id: true, role: true },
      })

      if (!user) {
        throw new Error('User not found')
      }

      if (![Role.SALES_REP, Role.MANAGER].includes(user.role)) {
        throw new Error('User must have SALES_REP or MANAGER role')
      }

      // Validate customer
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, assignedToId: true },
      })

      if (!customer) {
        throw new Error('Customer not found')
      }

      // Update customer assignment
      const updated = await prisma.customer.update({
        where: { id: customerId },
        data: {
          assignedToId: salespersonId,
          assignedAt: new Date(),
          assignedBy,
          assignmentNotes: notes,
        },
      })

      // Audit log
      await this.createAuditLog({
        userId: assignedBy,
        action: 'ASSIGN_CUSTOMER',
        entityType: 'Customer',
        entityId: customerId,
        metadata: {
          previousAssignee: customer.assignedToId,
          newAssignee: salespersonId,
          notes,
        },
      })

      return updated
    })
  }

  /**
   * Get team hierarchy for a manager
   */
  async getTeamHierarchy(managerId: string) {
    return this.withLogging('getTeamHierarchy', async () => {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        include: {
          profile: true,
          managedUsers: {
            include: {
              profile: true,
              salesTeamMember: true,
              assignedCustomers: {
                select: {
                  id: true,
                  name: true,
                  customerNumber: true,
                },
              },
            },
          },
          salesTeamMember: true,
        },
      })

      if (!manager) {
        throw new Error('Manager not found')
      }

      if (manager.role !== Role.MANAGER) {
        throw new Error('User must have MANAGER role')
      }

      return {
        manager: {
          id: manager.id,
          username: manager.username,
          email: manager.email,
          name: manager.profile
            ? `${manager.profile.firstName || ''} ${manager.profile.lastName || ''}`.trim()
            : manager.username,
          salesTeamMember: manager.salesTeamMember,
        },
        teamMembers: manager.managedUsers.map((member) => ({
          id: member.id,
          username: member.username,
          email: member.email,
          name: member.profile
            ? `${member.profile.firstName || ''} ${member.profile.lastName || ''}`.trim()
            : member.username,
          salesTeamMember: member.salesTeamMember,
          customerCount: member.assignedCustomers.length,
          customers: member.assignedCustomers,
        })),
      }
    })
  }

  /**
   * Get all accessible customers for a user based on their role and team
   */
  async getAccessibleCustomers(userId: string, filters?: {
    search?: string
    status?: string
    limit?: number
    offset?: number
  }) {
    return this.withLogging('getAccessibleCustomers', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          managedUsers: {
            select: { id: true },
          },
        },
      })

      if (!user) {
        throw new Error('User not found')
      }

      const where: Prisma.CustomerWhereInput = {}

      // Build access control query based on role
      if (user.role === Role.SALES_REP) {
        // Salesperson can only see their assigned customers
        where.assignedToId = userId
      } else if (user.role === Role.MANAGER) {
        // Manager can see their own customers and their team's customers
        const teamMemberIds = user.managedUsers.map((u) => u.id)
        where.OR = [
          { assignedToId: userId },
          { assignedToId: { in: teamMemberIds } },
        ]
      }
      // Admins and other roles can see all customers (no where clause)

      // Apply filters
      if (filters?.search) {
        where.AND = [
          where.AND || {},
          {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
              { customerNumber: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        ]
      }

      if (filters?.status) {
        where.status = filters.status
      }

      const customers = await prisma.customer.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              username: true,
              email: true,
              profile: true,
            },
          },
        },
        take: filters?.limit,
        skip: filters?.offset,
        orderBy: { createdAt: 'desc' },
      })

      return customers
    })
  }

  /**
   * Check if a user can access a specific customer
   */
  async canAccessCustomer(userId: string, customerId: string): Promise<boolean> {
    return this.withLogging('canAccessCustomer', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          managedUsers: {
            select: { id: true },
          },
        },
      })

      if (!user) {
        return false
      }

      // Admins can access all customers
      if ([Role.ADMIN, Role.SUPER_ADMIN].includes(user.role)) {
        return true
      }

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { assignedToId: true },
      })

      if (!customer) {
        return false
      }

      // Check direct assignment
      if (customer.assignedToId === userId) {
        return true
      }

      // Check if customer is assigned to a team member
      if (user.role === Role.MANAGER) {
        const teamMemberIds = user.managedUsers.map((u) => u.id)
        return teamMemberIds.includes(customer.assignedToId || '')
      }

      return false
    })
  }

  /**
   * Get team performance metrics
   */
  async getTeamPerformance(managerId: string) {
    return this.withLogging('getTeamPerformance', async () => {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        include: {
          managedUsers: {
            include: {
              salesTeamMember: true,
            },
          },
          salesTeamMember: true,
        },
      })

      if (!manager || manager.role !== Role.MANAGER) {
        throw new Error('Manager not found or invalid role')
      }

      // Get manager's customer count
      const managerCustomerCount = await prisma.customer.count({
        where: { assignedToId: managerId },
      })

      // Get team members' performance
      const teamPerformance = await Promise.all(
        manager.managedUsers.map(async (member) => {
          const customerCount = await prisma.customer.count({
            where: { assignedToId: member.id },
          })

          return {
            userId: member.id,
            customerCount,
            currentMonthSales: member.salesTeamMember?.currentMonthSales || 0,
            yearToDateSales: member.salesTeamMember?.yearToDateSales || 0,
            salesTarget: member.salesTeamMember?.salesTarget || 0,
          }
        })
      )

      // Calculate totals
      const totalCurrentMonthSales = teamPerformance.reduce(
        (sum, member) => sum + member.currentMonthSales,
        manager.salesTeamMember?.currentMonthSales || 0
      )

      const totalYearToDateSales = teamPerformance.reduce(
        (sum, member) => sum + member.yearToDateSales,
        manager.salesTeamMember?.yearToDateSales || 0
      )

      const totalTarget = teamPerformance.reduce(
        (sum, member) => sum + member.salesTarget,
        manager.salesTeamMember?.salesTarget || 0
      )

      const totalCustomers = 
        managerCustomerCount + 
        teamPerformance.reduce((sum, member) => sum + member.customerCount, 0)

      return {
        manager: {
          customerCount: managerCustomerCount,
          currentMonthSales: manager.salesTeamMember?.currentMonthSales || 0,
          yearToDateSales: manager.salesTeamMember?.yearToDateSales || 0,
          salesTarget: manager.salesTeamMember?.salesTarget || 0,
        },
        teamMembers: teamPerformance,
        totalCurrentMonthSales,
        totalYearToDateSales,
        totalTarget,
        totalCustomers,
        targetAchievement: totalTarget > 0 ? (totalCurrentMonthSales / totalTarget) * 100 : 0,
      }
    })
  }

  /**
   * Update sales team member details
   */
  async updateSalesTeamMember(
    userId: string,
    data: {
      salesTarget?: number
      commission?: number
      territory?: string
      specialization?: string
      teamName?: string
      isTeamLead?: boolean
    },
    updatedBy: string
  ) {
    return this.withLogging('updateSalesTeamMember', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      })

      if (!user) {
        throw new Error('User not found')
      }

      if (![Role.SALES_REP, Role.MANAGER].includes(user.role)) {
        throw new Error('User must have SALES_REP or MANAGER role')
      }

      const salesTeamMember = await prisma.salesTeamMember.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          ...data,
        },
      })

      // Audit log
      await this.createAuditLog({
        userId: updatedBy,
        action: 'UPDATE_SALES_TEAM_MEMBER',
        entityType: 'SalesTeamMember',
        entityId: salesTeamMember.id,
        metadata: data,
      })

      return salesTeamMember
    })
  }

  /**
   * Get unassigned customers
   */
  async getUnassignedCustomers(filters?: {
    search?: string
    limit?: number
    offset?: number
  }) {
    return this.withLogging('getUnassignedCustomers', async () => {
      const where: Prisma.CustomerWhereInput = {
        assignedToId: null,
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { customerNumber: { contains: filters.search, mode: 'insensitive' } },
        ]
      }

      const customers = await prisma.customer.findMany({
        where,
        take: filters?.limit,
        skip: filters?.offset,
        orderBy: { createdAt: 'desc' },
      })

      return customers
    })
  }

  /**
   * Unassign a customer from a salesperson
   */
  async unassignCustomer(
    customerId: string,
    unassignedBy: string,
    reason?: string
  ) {
    return this.withLogging('unassignCustomer', async () => {
      // Validate customer
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, assignedToId: true, name: true },
      })

      if (!customer) {
        throw new Error('Customer not found')
      }

      if (!customer.assignedToId) {
        throw new Error('Customer is not currently assigned to anyone')
      }

      // Check permissions - user must be able to update this customer
      const user = await prisma.user.findUnique({
        where: { id: unassignedBy },
        include: {
          managedUsers: {
            select: { id: true },
          },
        },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Check if user has permission to unassign this customer
      const canUnassign = await this.canAccessCustomer(unassignedBy, customerId)
      
      if (!canUnassign && user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
        throw new Error('You do not have permission to unassign this customer')
      }

      const previousAssignee = customer.assignedToId

      // Update customer assignment
      const updated = await prisma.customer.update({
        where: { id: customerId },
        data: {
          assignedToId: null,
          assignedAt: null,
          assignedBy: null,
          assignmentNotes: null,
        },
      })

      // Audit log
      await this.createAuditLog({
        userId: unassignedBy,
        action: 'UNASSIGN_CUSTOMER',
        entityType: 'Customer',
        entityId: customerId,
        metadata: {
          previousAssignee,
          reason,
          customerName: customer.name,
        },
      })

      return updated
    })
  }

  private async createAuditLog(data: {
    userId: string
    action: string
    entityType: string
    entityId: string
    metadata?: Record<string, unknown>
  }) {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata || {},
      },
    })
  }
}