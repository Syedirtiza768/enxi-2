import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { CustomerService } from './customer.service'
import { SalesCaseWithDetails } from './sales-case.service'

export interface TimelineEvent {
  type: string
  action: string
  timestamp: Date
  data?: Record<string, unknown>
  userId?: string
  description?: string
}
import { 
  CreateLeadData, 
  UpdateLeadData, 
  LeadResponse, 
  LeadListQuery, 
  LeadListResponse, 
  LeadStats 
} from '@/lib/types/lead.types'
import { 
  createLeadSchema, 
  updateLeadSchema, 
  leadListQuerySchema 
} from '@/lib/validators/lead.validator'
import { 
  Lead,
  LeadStatus,
  LeadSource,
  Customer,
  Prisma
} from '@/lib/generated/prisma'

export interface ConvertLeadInput {
  leadId: string
  customerData: {
    name: string
    email: string
    phone?: string
    industry?: string
    website?: string
    address?: string
    taxId?: string
    currency?: string
    creditLimit?: number
    paymentTerms?: number
  }
  createSalesCase?: boolean
  salesCaseTitle?: string
}

export interface LeadWithDetails extends Lead {
  creator: {
    id: string
    username: string
    email: string
  }
  customer?: Customer | null
}

export interface LeadMetrics {
  totalLeads: number
  newLeads: number
  contactedLeads: number
  qualifiedLeads: number
  convertedLeads: number
  lostLeads: number
  conversionRate: number
  averageConversionTime: number
}

export class LeadService {
  private auditService: AuditService
  private customerService: CustomerService

  constructor() {
    this.auditService = new AuditService()
    this.customerService = new CustomerService()
  }
  
  async createLead(data: CreateLeadData, userId: string): Promise<LeadResponse> {
    try {
      console.warn('[LeadService] Creating lead with data:', data)
      console.warn('[LeadService] User ID:', userId)
      
      // Validate input data
      const validatedData = createLeadSchema.parse(data)
      
      // Check if lead with same email already exists
      const existingLead = await prisma.lead.findFirst({
        where: { email: validatedData.email }
      })

      if (existingLead) {
        throw new Error('Lead with this email already exists')
      }
    
      const lead = await prisma.lead.create({
        data: {
          ...validatedData,
          status: LeadStatus.NEW,
          createdBy: userId,
        },
      })

      await this.auditService.logAction({
        userId,
        action: 'CREATE',
        entityType: 'Lead',
        entityId: lead.id,
        afterData: lead
      })

      return lead
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  }

  async getLeads(query: LeadListQuery): Promise<LeadListResponse> {
    try {
      const validatedQuery = leadListQuerySchema.parse(query)
      const { page, limit, search, status, source } = validatedQuery
      
      const skip = (page - 1) * limit
    
    // Build where clause  
    const where: Prisma.LeadWhereInput = {}
    
    if (status) {
      where.status = status
    }
    
    if (source) {
      where.source = source
    }
    
    if (search) {
      // SQLite doesn't support case-insensitive mode, so we use contains directly
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ]
    }

      const [data, total] = await Promise.all([
        prisma.lead.findMany({
          skip,
          take: limit,
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: { createdAt: 'desc' },
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            customer: true
          }
        }),
        prisma.lead.count({
          where: Object.keys(where).length > 0 ? where : undefined,
        }),
      ])

      return {
        data,
        total,
        page,
        limit,
      }
    } catch (error) {
      console.error('Error getting leads:', error);
      throw error;
    }
  }

  async getLeadById(id: string): Promise<LeadWithDetails | null> {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        customer: true
      }
    })

    return lead
  }

  async updateLead(id: string, data: UpdateLeadData, userId: string): Promise<LeadResponse> {
    // Validate input data
    const validatedData = updateLeadSchema.parse(data)
    
    const existingLead = await this.getLeadById(id)
    if (!existingLead) {
      throw new Error('Lead not found')
    }

    if (existingLead.status === LeadStatus.CONVERTED) {
      throw new Error('Cannot update converted leads')
    }

    // Check email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingLead.email) {
      const emailExists = await prisma.lead.findFirst({
        where: { 
          email: validatedData.email,
          id: { not: id }
        }
      })

      if (emailExists) {
        throw new Error('Lead with this email already exists')
      }
    }
    
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...validatedData,
        updatedBy: userId,
      },
    })

    await this.auditService.logAction({
      userId,
      action: 'UPDATE',
      entityType: 'Lead',
      entityId: id,
      beforeData: existingLead,
      afterData: lead
    })

    return lead
  }

  async deleteLead(id: string, deletedBy: string): Promise<boolean> {
    const lead = await this.getLeadById(id)
    
    if (!lead) {
      throw new Error('Lead not found')
    }

    if (lead.status === LeadStatus.CONVERTED) {
      throw new Error('Cannot delete converted leads')
    }

    try {
      await prisma.lead.delete({
        where: { id },
      })

      await this.auditService.logAction({
        userId: deletedBy,
        action: 'DELETE',
        entityType: 'Lead',
        entityId: id,
        beforeData: lead
      })

      return true
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw error;
    }
  }

  async convertLead(
    data: ConvertLeadInput & { convertedBy: string }
  ): Promise<{
    customer: Customer
    salesCase?: SalesCaseWithDetails
  }> {
    const lead = await this.getLeadById(data.leadId)
    
    if (!lead) {
      throw new Error('Lead not found')
    }

    if (lead.status === LeadStatus.CONVERTED) {
      throw new Error('Lead has already been converted')
    }

    return await prisma.$transaction(async (tx) => {
      // Create customer
      const customer = await this.customerService.createCustomer({
        ...data.customerData,
        leadId: data.leadId,
        createdBy: data.convertedBy
      })

      // Update lead status
      await tx.lead.update({
        where: { id: data.leadId },
        data: {
          status: LeadStatus.CONVERTED,
          customer: {
            connect: { id: customer.id }
          }
        }
      })

      // Create sales case if requested
      let salesCase
      if (data.createSalesCase) {
        const { SalesCaseService } = await import('./sales-case.service')
        const salesCaseService = new SalesCaseService()
        
        salesCase = await salesCaseService.createSalesCase({
          customerId: customer.id,
          title: data.salesCaseTitle || `Initial opportunity for ${customer.name}`,
          description: `Converted from lead: ${lead.firstName} ${lead.lastName}`,
          createdBy: data.convertedBy
        })
      }

      await this.auditService.logAction({
        userId: data.convertedBy,
        action: 'CONVERT',
        entityType: 'Lead',
        entityId: data.leadId,
        metadata: {
          customerId: customer.id,
          salesCaseId: salesCase?.id
        }
      })

      return { customer, salesCase }
    })
  }

  async updateLeadStatus(
    id: string,
    status: LeadStatus,
    updatedBy: string
  ): Promise<LeadResponse> {
    const lead = await this.getLeadById(id)
    
    if (!lead) {
      throw new Error('Lead not found')
    }

    if (lead.status === LeadStatus.CONVERTED) {
      throw new Error('Cannot change status of converted leads')
    }

    if (status === LeadStatus.CONVERTED) {
      throw new Error('Use convertLead method to convert leads to customers')
    }

    return this.updateLead(id, { status }, updatedBy)
  }

  async getLeadStats(): Promise<LeadStats> {
    const stats = await prisma.lead.groupBy({
      by: ['status'],
      _count: true,
    })

    // Initialize all statuses with 0
    const result: LeadStats = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      PROPOSAL_SENT: 0,
      NEGOTIATING: 0,
      CONVERTED: 0,
      LOST: 0,
      DISQUALIFIED: 0,
    }

    // Fill in actual counts
    stats.forEach((stat: { status: LeadStatus; _count: number }) => {
      result[stat.status as keyof LeadStats] = stat._count
    })

    return result
  }

  async getLeadMetrics(filters: {
    source?: LeadSource
    dateFrom?: Date
    dateTo?: Date
  } = {}): Promise<LeadMetrics> {
    const where: Prisma.LeadWhereInput = {}

    if (filters.source) {
      where.source = filters.source
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
      if (filters.dateTo) where.createdAt.lte = filters.dateTo
    }

    const [
      totalLeads,
      newLeads,
      contactedLeads,
      qualifiedLeads,
      convertedLeads,
      lostLeads,
      conversionTimes
    ] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, status: LeadStatus.NEW } }),
      prisma.lead.count({ where: { ...where, status: LeadStatus.CONTACTED } }),
      prisma.lead.count({ where: { ...where, status: LeadStatus.QUALIFIED } }),
      prisma.lead.count({ where: { ...where, status: LeadStatus.CONVERTED } }),
      prisma.lead.count({ 
        where: { 
          ...where, 
          status: { in: [LeadStatus.LOST, LeadStatus.DISQUALIFIED] } 
        } 
      }),
      prisma.lead.findMany({
        where: { 
          ...where, 
          status: LeadStatus.CONVERTED,
          customer: { isNot: null }
        },
        select: {
          createdAt: true,
          customer: {
            select: { createdAt: true }
          }
        }
      })
    ])

    // Calculate average conversion time
    let averageConversionTime = 0
    if (conversionTimes.length > 0) {
      const totalTime = conversionTimes.reduce((sum, lead) => {
        if (lead.customer) {
          const timeDiff = lead.customer.createdAt.getTime() - lead.createdAt.getTime()
          return sum + timeDiff
        }
        return sum
      }, 0)
      averageConversionTime = totalTime / conversionTimes.length / (1000 * 60 * 60 * 24) // Convert to days
    }

    const totalProcessed = convertedLeads + lostLeads
    const conversionRate = totalProcessed > 0 ? (convertedLeads / totalProcessed) * 100 : 0

    return {
      totalLeads,
      newLeads,
      contactedLeads,
      qualifiedLeads,
      convertedLeads,
      lostLeads,
      conversionRate,
      averageConversionTime
    }
  }

  async getLeadTimeline(id: string): Promise<TimelineEvent[]> {
    const lead = await this.getLeadById(id)
    if (!lead) {
      throw new Error('Lead not found')
    }

    // Get audit logs
    const auditLogs = await this.auditService.getEntityHistory('Lead', id)

    // Get related customer and sales cases if converted
    let customerEvents: TimelineEvent[] = []
    if (lead.customer) {
      const salesCases = await prisma.salesCase.findMany({
        where: { customerId: lead.customer.id },
        orderBy: { createdAt: 'asc' }
      })

      customerEvents = [
        {
          type: 'conversion',
          action: 'CONVERTED_TO_CUSTOMER',
          timestamp: lead.customer.createdAt,
          data: { 
            customerId: lead.customer.id,
            customerName: lead.customer.name 
          }
        },
        ...salesCases.map(sc => ({
          type: 'sales_case',
          action: 'SALES_CASE_CREATED',
          timestamp: sc.createdAt,
          data: {
            salesCaseId: sc.id,
            caseNumber: sc.caseNumber,
            title: sc.title
          }
        }))
      ]
    }

    // Combine and sort timeline
    const timeline = [
      ...auditLogs.map(log => ({
        type: 'audit',
        action: log.action,
        timestamp: log.timestamp,
        userId: log.userId,
        data: log
      })),
      ...customerEvents
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return timeline
  }

  async bulkUpdateLeadStatus(
    leadIds: string[],
    status: LeadStatus,
    updatedBy: string
  ): Promise<number> {
    // Validate all leads exist and are not converted
    const leads = await prisma.lead.findMany({
      where: { 
        id: { in: leadIds },
        status: { not: LeadStatus.CONVERTED }
      }
    })

    if (leads.length !== leadIds.length) {
      throw new Error('Some leads not found or already converted')
    }

    if (status === LeadStatus.CONVERTED) {
      throw new Error('Cannot bulk convert leads. Use convertLead for individual conversions')
    }

    const result = await prisma.lead.updateMany({
      where: { 
        id: { in: leadIds },
        status: { not: LeadStatus.CONVERTED }
      },
      data: {
        status,
        updatedBy
      }
    })

    // Log bulk update
    await this.auditService.logAction({
      userId: updatedBy,
      action: 'BULK_UPDATE',
      entityType: 'Lead',
      entityId: leadIds.join(','),
      metadata: {
        leadCount: result.count,
        newStatus: status
      }
    })

    return result.count
  }
}