import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { FinancialDashboardService } from '@/lib/services/reporting/financial-dashboard.service'
import { InventoryAnalyticsService } from '@/lib/services/reporting/inventory-analytics.service'
import { SalesAnalyticsService } from '@/lib/services/reporting/sales-analytics.service'
import { z } from 'zod'

const dashboardMetricsSchema = z.object({
  asOfDate: z.string().nullable().optional(),
  includeInventory: z.string().nullable().optional(),
  includeSales: z.string().nullable().optional()
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    const { searchParams } = new URL(request.url)
    const asOfDateParam = searchParams.get('asOfDate')
    const includeInventoryParam = searchParams.get('includeInventory')
    const includeSalesParam = searchParams.get('includeSales')
    
    const data = dashboardMetricsSchema.parse({
      asOfDate: asOfDateParam,
      includeInventory: includeInventoryParam,
      includeSales: includeSalesParam
    })
    
    const asOfDate = data.asOfDate ? new Date(data.asOfDate) : new Date()
    const includeInventory = data.includeInventory === 'true'
    const includeSales = data.includeSales === 'true'

    // Initialize services
    const dashboardService = new FinancialDashboardService()
    const inventoryService = new InventoryAnalyticsService()
    const salesService = new SalesAnalyticsService()

    // Get metrics in parallel
    const [
      dashboardMetrics,
      inventoryMetrics,
      salesMetrics
    ] = await Promise.all([
      dashboardService.getDashboardMetrics(asOfDate),
      includeInventory ? inventoryService.getInventoryMetrics() : null,
      includeSales ? salesService.getSalesMetrics(
        new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 1),
        asOfDate
      ) : null
    ])

    const response = {
      financial: dashboardMetrics,
      ...(inventoryMetrics && { inventory: inventoryMetrics }),
      ...(salesMetrics && { sales: salesMetrics }),
      asOfDate: asOfDate.toISOString()
    }
    
    return NextResponse.json({ data: response })
  } catch (error) {
    console.error('Error getting dashboard metrics:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get dashboard metrics' },
      { status: 500 }
    )
  }
}