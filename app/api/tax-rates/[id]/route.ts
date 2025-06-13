import { NextRequest, NextResponse } from 'next/server'
import { taxService } from '@/lib/services/tax.service'
import { withAuth } from '@/lib/utils/auth'

// GET /api/tax-rates/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (session) => {
    try {
      const rate = await taxService.getTaxRateById(params.id)
      
      if (!rate) {
        return NextResponse.json(
          { success: false, error: 'Tax rate not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: rate
      })
    } catch (error: any) {
      console.error('Error fetching tax rate:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch tax rate' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'VIEWER'])
}

// PUT /api/tax-rates/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        isActive,
        isDefault,
        isCompound,
        collectedAccountId,
        paidAccountId
      } = body

      const updates: any = {}
      if (code !== undefined) updates.code = code
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (rate !== undefined) {
        if (rate < 0 || rate > 100) {
          return NextResponse.json(
            { success: false, error: 'Tax rate must be between 0 and 100' },
            { status: 400 }
          )
        }
        updates.rate = rate
      }
      if (categoryId !== undefined) updates.categoryId = categoryId
      if (taxType !== undefined) updates.taxType = taxType
      if (appliesTo !== undefined) updates.appliesTo = appliesTo
      if (effectiveFrom !== undefined) updates.effectiveFrom = new Date(effectiveFrom)
      if (effectiveTo !== undefined) updates.effectiveTo = new Date(effectiveTo)
      if (isActive !== undefined) updates.isActive = isActive
      if (isDefault !== undefined) updates.isDefault = isDefault
      if (isCompound !== undefined) updates.isCompound = isCompound
      if (collectedAccountId !== undefined) updates.collectedAccountId = collectedAccountId
      if (paidAccountId !== undefined) updates.paidAccountId = paidAccountId

      const updatedRate = await taxService.updateTaxRate(params.id, updates)

      return NextResponse.json({
        success: true,
        data: updatedRate
      })
    } catch (error: any) {
      console.error('Error updating tax rate:', error)
      
      if (error.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'Tax rate code already exists' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update tax rate' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'])
}