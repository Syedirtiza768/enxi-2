import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SalesCaseService } from '@/lib/services/sales-case.service'

// GET /api/sales-cases/metrics - Get sales case metrics
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    const salesCaseService = new SalesCaseService()
    const searchParams = request.nextUrl.searchParams
    
    const options: {
      customerId?: string
      assignedTo?: string
      dateFrom?: Date
      dateTo?: Date
    } = {}

    const customerId = searchParams.get('customerId')
    if (customerId) options.customerId = customerId

    const assignedTo = searchParams.get('assignedTo')
    if (assignedTo) options.assignedTo = assignedTo

    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) options.dateFrom = new Date(dateFrom)

    const dateTo = searchParams.get('dateTo')
    if (dateTo) options.dateTo = new Date(dateTo)

    const metrics = await salesCaseService.getSalesCaseMetrics(options)

    return NextResponse.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error('Error fetching sales case metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales case metrics' },
      { status: 500 }
    )
  }
}