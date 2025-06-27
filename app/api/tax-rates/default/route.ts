import { NextRequest, NextResponse } from 'next/server'
import { taxService } from '@/lib/services/tax.service'
import { withAuth } from '@/lib/utils/auth'
import { TaxType } from '@/lib/types/shared-enums'

// GET /api/tax-rates/default
export async function GET(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const taxType = searchParams.get('taxType') as TaxType | null

      const defaultRate = await taxService.getDefaultTaxRate(taxType || TaxType.SALES)

      if (!defaultRate) {
        return NextResponse.json({
          success: true,
          data: null,
          message: 'No default tax rate configured'
        })
      }

      return NextResponse.json({
        success: true,
        data: defaultRate
      })
    } catch (error: any) {
      console.error('Error fetching default tax rate:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch default tax rate' },
        { status: 500 }
      )
    }
  })
}