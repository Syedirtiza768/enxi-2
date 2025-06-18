import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'

// GET /api/inventory/reports/expiring-lots - Get expiring stock lots
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const daysAhead = searchParams.get('daysAhead')

    const stockMovementService = new StockMovementService()
    const expiringLots = await stockMovementService.getExpiringLots(
      daysAhead ? parseInt(daysAhead) : 30
    )

    // Group by expiry status
    const now = new Date()
    const expired = expiringLots.filter(lot => 
      lot.expiryDate && new Date(lot.expiryDate) < now
    )
    const expiringToday = expiringLots.filter(lot => {
      if (!lot.expiryDate) return false
      const expiryDate = new Date(lot.expiryDate)
      return expiryDate.toDateString() === now.toDateString()
    })
    const expiringThisWeek = expiringLots.filter(lot => {
      if (!lot.expiryDate) return false
      const expiryDate = new Date(lot.expiryDate)
      const weekFromNow = new Date(now)
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      return expiryDate > now && expiryDate <= weekFromNow
    })
    const expiringLater = expiringLots.filter(lot => {
      if (!lot.expiryDate) return false
      const expiryDate = new Date(lot.expiryDate)
      const weekFromNow = new Date(now)
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      return expiryDate > weekFromNow
    })

    return NextResponse.json({
      lots: expiringLots,
      summary: {
        total: expiringLots.length,
        expired: expired.length,
        expiringToday: expiringToday.length,
        expiringThisWeek: expiringThisWeek.length,
        expiringLater: expiringLater.length
      }
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}