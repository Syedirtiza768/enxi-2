import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { ItemService } from '@/lib/services/inventory/item.service'

// GET /api/inventory/reports/stock-summary - Get stock summary report
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get('categoryId')
    const belowMinStock = searchParams.get('belowMinStock')
    const belowReorderPoint = searchParams.get('belowReorderPoint')
    const zeroStock = searchParams.get('zeroStock')

    const itemService = new ItemService()
    const stockSummaries = await itemService.getAllStockSummaries({
      categoryId: categoryId || undefined,
      belowMinStock: belowMinStock === 'true',
      belowReorderPoint: belowReorderPoint === 'true',
      zeroStock: zeroStock === 'true'
    })

    // Calculate totals
    const totals = stockSummaries.reduce((acc, summary) => ({
      totalItems: acc.totalItems + 1,
      totalStock: acc.totalStock + summary.totalStock,
      totalValue: acc.totalValue + summary.totalValue,
      itemsBelowMinStock: acc.itemsBelowMinStock + (summary.belowMinStock ? 1 : 0),
      itemsBelowReorderPoint: acc.itemsBelowReorderPoint + (summary.belowReorderPoint ? 1 : 0),
      itemsWithZeroStock: acc.itemsWithZeroStock + (summary.totalStock === 0 ? 1 : 0)
    }), {
      totalItems: 0,
      totalStock: 0,
      totalValue: 0,
      itemsBelowMinStock: 0,
      itemsBelowReorderPoint: 0,
      itemsWithZeroStock: 0
    })

    return NextResponse.json({
      summaries: stockSummaries,
      totals
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}