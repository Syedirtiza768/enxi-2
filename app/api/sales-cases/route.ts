import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { SalesCaseStatus } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db/prisma'

// GET /api/sales-cases - List all sales cases with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
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

    const limit = searchParams.get('limit')
    if (limit) options.limit = parseInt(limit)

    const offset = searchParams.get('offset')
    if (offset) options.offset = parseInt(offset)

    // Apply role-based visibility rules
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
    // SUPER_ADMIN, ADMIN can see all sales cases (no restrictions)

    const salesCases = await salesCaseService.getAllSalesCases(options)

    return NextResponse.json({
      success: true,
      data: salesCases
    })
  } catch (error) {
    console.error('Error fetching sales cases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales cases' },
      { status: 500 }
    )
  }
}

// POST /api/sales-cases - Create new sales case
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
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
  } catch (error: any) {
    console.error('Error creating sales case:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create sales case' },
      { status: 500 }
    )
  }
}