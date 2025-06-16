import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { prisma } from '@/lib/db/prisma'
import { SalesCaseStatus } from '@/lib/types/shared-enums'

// GET /api/sales-cases - List all sales cases with filtering
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('GET /api/sales-cases - Request received');
    
    // Try to get authenticated user, but provide fallback for development
    let user: { id: string; role?: string } | null = null
    
    try {
      user = await getUserFromRequest(request)
    } catch (authError) {
      // In development, allow unauthenticated access with limited permissions
      if (process.env.NODE_ENV === 'development') {
        console.warn('Auth failed in development mode, using fallback user:', authError)
        user = { id: 'dev-user', role: 'VIEWER' }
      } else {
        // In production, auth is required
        throw authError
      }
    }
    
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

    // Apply role-based visibility rules only if user has a role
    if (user && user.role) {
      if (user.role === 'SALES_REP') {
        // Sales reps can only see their own sales cases
        options.assignedTo = user.id
      } else if (user.role === 'MANAGER') {
        // Managers can see their team's sales cases
        // If no specific assignedTo is provided, we'll let the service handle team filtering
        if (!options.assignedTo) {
          // Get team members under this manager
          const teamMembers = await prisma.user.findMany({
            where: { managerId: user.id },
            select: { id: true }
          })
          
          // Include the manager themselves and their team members
          const teamIds = [user.id, ...teamMembers.map(m => m.id)]
          options.assignedTo = teamIds.length > 1 ? teamIds.join(',') : user.id
        }
      }
      // SUPER_ADMIN, ADMIN, VIEWER can see all sales cases (no restrictions)
    }

    console.log('Fetching sales cases with options:', options);
    const salesCases = await salesCaseService.getAllSalesCases(options)
    console.log(`Found ${salesCases.length} sales cases`);
    
    // Get total count for pagination
    console.log('Getting total count for pagination');
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
    
    // Provide more detailed error information in development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      )
    }
    
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
    // Try to get authenticated user, but provide fallback for development
    let user: { id: string; role?: string } | null = null
    
    try {
      user = await getUserFromRequest(request)
    } catch (authError) {
      // In development, allow unauthenticated access with limited permissions
      if (process.env.NODE_ENV === 'development') {
        console.warn('Auth failed in development mode, using fallback user')
        user = { id: 'dev-user', role: 'VIEWER' }
      } else {
        // In production, auth is required
        throw authError
      }
    }
    
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
      createdBy: user.id
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