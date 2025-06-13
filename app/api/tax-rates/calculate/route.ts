import { NextRequest, NextResponse } from 'next/server'
import { taxService } from '@/lib/services/tax.service'
import { withAuth } from '@/lib/utils/auth'

// POST /api/tax-rates/calculate
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      
      const {
        amount,
        taxRateId,
        customerId,
        supplierId,
        transactionDate,
        appliesTo,
        items
      } = body

      // Validate input
      if (items) {
        // Calculate taxes for multiple items
        if (!Array.isArray(items)) {
          return NextResponse.json(
            { success: false, error: 'Items must be an array' },
            { status: 400 }
          )
        }

        const result = await taxService.calculateTaxesForItems(
          items,
          customerId,
          supplierId,
          transactionDate ? new Date(transactionDate) : undefined
        )

        return NextResponse.json({
          success: true,
          data: result
        })
      } else {
        // Calculate tax for a single amount
        if (amount === undefined || amount < 0) {
          return NextResponse.json(
            { success: false, error: 'Valid amount is required' },
            { status: 400 }
          )
        }

        const result = await taxService.calculateTax({
          amount,
          taxRateId,
          customerId,
          supplierId,
          transactionDate: transactionDate ? new Date(transactionDate) : undefined,
          appliesTo
        })

        return NextResponse.json({
          success: true,
          data: result
        })
      }
    } catch (error: any) {
      console.error('Error calculating tax:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to calculate tax' },
        { status: 500 }
      )
    }
  })
}