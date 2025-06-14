import { NextRequest, NextResponse } from 'next/server'
import { taxService } from '@/lib/services/tax.service'
import { withAuth } from '@/lib/utils/auth'

// GET /api/tax-rates/validate
export async function GET(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (session) => {
    try {
      const result = await taxService.validateTaxConfiguration()

      return NextResponse.json({
        success: true,
        data: result
      })
    } catch (error: any) {
      console.error('Error validating tax configuration:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to validate tax configuration' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'])
}