import { NextRequest, NextResponse } from 'next/server'
import { taxService } from '@/lib/services/tax.service'
import { withAuth } from '@/lib/utils/auth'
import { TaxType } from '@/lib/types/shared-enums'

// GET /api/tax-rates
export async function GET(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const isActive = searchParams.get('isActive')
      const categoryId = searchParams.get('categoryId')
      const taxType = searchParams.get('taxType') as TaxType | null
      const effectiveDate = searchParams.get('effectiveDate')

      const filters = {
        isActive: isActive !== null ? isActive === 'true' : undefined,
        categoryId: categoryId || undefined,
        taxType: taxType || undefined,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined
      }

      const rates = await taxService.getTaxRates(filters)

      return NextResponse.json({
        success: true,
        data: rates
      })
    } catch (error: any) {
      console.error('Error fetching tax rates:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch tax rates' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'VIEWER'])
}

// POST /api/tax-rates
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      
      const {
        code,
        name,
        description,
        rate,
        categoryId,
        taxType,
        appliesTo,
        effectiveFrom,
        effectiveTo,
        isDefault,
        isCompound,
        collectedAccountId,
        paidAccountId
      } = body

      if (!code || !name || rate === undefined || !categoryId) {
        return NextResponse.json(
          { success: false, error: 'Code, name, rate, and categoryId are required' },
          { status: 400 }
        )
      }

      if (rate < 0 || rate > 100) {
        return NextResponse.json(
          { success: false, error: 'Tax rate must be between 0 and 100' },
          { status: 400 }
        )
      }

      const taxRate = await taxService.createTaxRate({
        code,
        name,
        description,
        rate,
        categoryId,
        taxType: taxType || TaxType.SALES,
        appliesTo: appliesTo || 'ALL',
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
        isDefault,
        isCompound,
        collectedAccountId,
        paidAccountId,
        createdBy: session.user.id
      })

      return NextResponse.json({
        success: true,
        data: taxRate
      }, { status: 201 })
    } catch (error: any) {
      console.error('Error creating tax rate:', error)
      
      if (error.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'Tax rate code already exists' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create tax rate' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'])
}