import { BaseService } from './base.service'
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
import { Lead, Customer, Prisma } from "@prisma/client"
import { LeadStatus, LeadSource } from "@/lib/types/shared-enums"


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

export class LeadService extends BaseService {
  private auditService: AuditService
  private customerService: CustomerService

  constructor() {
    super('LeadService')
    this.auditService = new AuditService()
    this.customerService = new CustomerService()
  }
  
  async createLead(data: CreateLeadData, userId: string): Promise<LeadResponse> {
    return this.withLogging('createLead', async () => {
      console.warn('[LeadService] Creating lead with data:', data)
      console.warn('[LeadService] User ID:', userId)
      
      // Validate input data
      const validatedData = createLeadSchema.parse(data)
      
      // Use transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Check if lead with same email already exists
        const existingLead = await tx.lead.findFirst({
          where: { email: validatedData.email }
        })

        if (existingLead) {
          throw new Error('Lead with this email already exists')
        }
      
        const lead = await tx.lead.create({
          data: {
            ...validatedData,
            status: LeadStatus.NEW,
            createdBy: userId,
          },
        })

        // Log audit within transaction
        await this.auditService.logAction({
          userId,
          action: 'CREATE',
          entityType: 'Lead',
          entityId: lead.id,
          afterData: lead
        })

        return lead
      }, {
        maxWait: 5000, // 5 seconds max wait to connect
        timeout: 10000, // 10 seconds timeout for the transaction
      })

      console.warn('[LeadService] Lead created successfully:', result.id)
      return result
    })
  }

  async getLeads(query: LeadListQuery): Promise<LeadListResponse> {
    return this.withLogging('getLeads', async () => {
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
        })])

      return {
        data,
        total,
        page,
        limit,
      }
    })
  }

  async getLeadById(id: string): Promise<LeadWithDetails | null> {
    return this.withLogging('getLeadById', async () => {
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
    })
  }

  async findByEmail(email: string): Promise<LeadResponse[]> {
    return this.withLogging('findByEmail', async () => {
      const leads = await prisma.lead.findMany({
        where: { 
          email: email.toLowerCase()
        },
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

      return leads
    })
  }

  async updateLead(id: string, data: UpdateLeadData, userId: string): Promise<LeadResponse> {
    return this.withLogging('updateLead', async () => {
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
    })
  }

  async deleteLead(id: string, deletedBy: string): Promise<boolean> {
    return this.withLogging('deleteLead', async () => {
      const lead = await this.getLeadById(id)
    
      if (!lead) {
        throw new Error('Lead not found')
      }

      if (lead.status === LeadStatus.CONVERTED) {
        throw new Error('Cannot delete converted leads')
      }

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
    })
  }

  async convertLead(
    data: ConvertLeadInput & { convertedBy: string }
  ): Promise<{
    customer: Customer
    salesCase?: SalesCaseWithDetails
  }> {
    return this.withLogging('convertLead', async () => {
      const lead = await this.getLeadById(data.leadId)
    
    if (!lead) {
      throw new Error('Lead not found')
    }

    if (lead.status === LeadStatus.CONVERTED) {
      throw new Error('Lead has already been converted')
    }

    // Create customer first (outside transaction for better performance)
    const customer = await this.customerService.createCustomer({
      ...data.customerData,
      leadId: data.leadId,
      createdBy: data.convertedBy
    })

    try {
      // Use a shorter transaction just for the lead update
      await prisma.$transaction(async (tx) => {
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
      }, {
        maxWait: 5000, // 5 seconds max wait
        timeout: 10000, // 10 seconds timeout
      })

      // Create sales case if requested (outside transaction)
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

      // Log audit (outside transaction)
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
    } catch (error) {
      // If lead update fails, we need to handle the orphaned customer
      // For now, we'll just log the error and rethrow
      console.error('Failed to update lead status after customer creation:', error)
      throw new Error(`Lead conversion partially failed. Customer ${customer.id} was created but lead status update failed.`)
    }
    })
  }

  async updateLeadStatus(
    id: string,
    status: LeadStatus,
    updatedBy: string
  ): Promise<LeadResponse> {
    return this.withLogging('updateLeadStatus', async () => {
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
    })
  }

  async getLeadStats(): Promise<LeadStats> {
    return this.withLogging('getLeadStats', async () => {
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
    })
  }

  async getLeadMetrics(filters: {
    source?: LeadSource
    dateFrom?: Date
    dateTo?: Date
  } = {}): Promise<LeadMetrics> {
    return this.withLogging('getLeadMetrics', async () => {
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
    })
  }

  async getLeadTimeline(id: string): Promise<TimelineEvent[]> {
    return this.withLogging('getLeadTimeline', async () => {
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
    })
  }

  async bulkUpdateLeadStatus(
    leadIds: string[],
    status: LeadStatus,
    updatedBy: string
  ): Promise<number> {
    return this.withLogging('bulkUpdateLeadStatus', async () => {
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
    })
  }
}