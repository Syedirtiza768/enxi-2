import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { SalesCaseStatus } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db/prisma'

// GET /api/sales-cases - List all sales cases with filtering
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const salesCaseService = new SalesCaseService()
    const searchParams = request.nextUrl.searchParams
    
    const options: {
      customerId?: string
      status?: SalesCaseStatus
      assignedTo?: string
      search?: string
      dateFrom?: Date
      dateTo?: Date
      limit?: number
      offset?: number
    } = {}

    const customerId = searchParams.get('customerId')
    if (customerId) options.customerId = customerId

    const status = searchParams.get('status')
    if (status && Object.values(SalesCaseStatus).includes(status as SalesCaseStatus)) {
      options.status = status as SalesCaseStatus
    }

    const assignedTo = searchParams.get('assignedTo')
    if (assignedTo) options.assignedTo = assignedTo

    const search = searchParams.get('search')
    if (search) options.search = search

    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) options.dateFrom = new Date(dateFrom)

    const dateTo = searchParams.get('dateTo')
    if (dateTo) options.dateTo = new Date(dateTo)

    // Pagination support
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    
    if (limit) {
      options.limit = parseInt(limit)
    } else {
      options.limit = 20 // Default limit
    }
    
    if (page) {
      const pageNum = parseInt(page)
      options.offset = (pageNum - 1) * (options.limit || 20)
    } else {
      const offset = searchParams.get('offset')
      if (offset) options.offset = parseInt(offset)
    }

    // Apply role-based visibility rules
    if (user.role === 'SALES_REP') {
      // Sales reps can only see their own sales cases
      options.assignedTo = session.user.id
    } else if (user.role === 'MANAGER') {
      // Managers can see their team's sales cases
      // If no specific assignedTo is provided, we'll let the service handle team filtering
      if (!options.assignedTo) {
        // Get team members under this manager
        const teamMembers = await prisma.user.findMany({
          where: { managerId: session.user.id },
          select: { id: true }
        })
        
        // Include the manager themselves and their team members
        const teamIds = [session.user.id, ...teamMembers.map(m => m.id)]
        options.assignedTo = teamIds.length > 1 ? teamIds.join(',') : session.user.id
      }
    }
    // SUPER_ADMIN, ADMIN can see all sales cases (no restrictions)

    const salesCases = await salesCaseService.getAllSalesCases(options)
    
    // Get total count for pagination
    const totalCount = await prisma.salesCase.count({
      where: {
        ...(options.customerId && { customerId: options.customerId }),
        ...(options.status && { status: options.status }),
        ...(options.assignedTo && !options.assignedTo.includes(',') && { assignedTo: options.assignedTo }),
        ...(options.assignedTo && options.assignedTo.includes(',') && { 
          assignedTo: { in: options.assignedTo.split(',') } 
        }),
        ...(options.search && {
          OR: [
            { caseNumber: { contains: options.search } },
            { title: { contains: options.search } },
            { description: { contains: options.search } },
            { customer: { name: { contains: options.search } } }
          ]
        }),
        ...(options.dateFrom && { createdAt: { gte: options.dateFrom } }),
        ...(options.dateTo && { createdAt: { lte: options.dateTo } })
      }
    })
    
    const currentPage = page ? parseInt(page) : Math.floor((options.offset || 0) / (options.limit || 20)) + 1
    const totalPages = Math.ceil(totalCount / (options.limit || 20))

    return NextResponse.json({
      success: true,
      data: salesCases,
      total: totalCount,
      page: currentPage,
      totalPages,
      limit: options.limit || 20
    })
} catch (error) {
    console.error('Error in GET /api/sales-cases:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// POST /api/sales-cases - Create new sales case
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const body = await request.json()
    
    const { customerId, title, description, estimatedValue, assignedTo } = body

    // Validate required fields
    if (!customerId || !title) {
      return NextResponse.json(
        { error: 'Customer ID and title are required' },
        { status: 400 }
      )
    }

    const salesCaseService = new SalesCaseService()
    const salesCase = await salesCaseService.createSalesCase({
      customerId,
      title,
      description,
      estimatedValue,
      assignedTo,
      createdBy: session.user.id
    })

    return NextResponse.json({
      success: true,
      data: salesCase
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating sales case:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create sales case' },
      { status: 500 }
    )
  }
}