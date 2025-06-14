import { NextRequest, NextResponse } from 'next/server'
import { taxService } from '@/lib/services/tax.service'
import { withAuth } from '@/lib/utils/auth'

// PUT /api/tax-exemptions/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const {
        entityType,
        entityId,
        taxRateId,
        exemptionNumber,
        reason,
        effectiveFrom,
        effectiveTo,
        attachmentUrl,
        isActive
      } = body

      const updates: any = {}
      if (entityType !== undefined) updates.entityType = entityType
      if (entityId !== undefined) updates.entityId = entityId
      if (taxRateId !== undefined) updates.taxRateId = taxRateId
      if (exemptionNumber !== undefined) updates.exemptionNumber = exemptionNumber
      if (reason !== undefined) updates.reason = reason
      if (effectiveFrom !== undefined) updates.effectiveFrom = new Date(effectiveFrom)
      if (effectiveTo !== undefined) updates.effectiveTo = new Date(effectiveTo)
      if (attachmentUrl !== undefined) updates.attachmentUrl = attachmentUrl
      if (isActive !== undefined) updates.isActive = isActive

      const exemption = await taxService.updateTaxExemption(params.id, updates)

      return NextResponse.json({
        success: true,
        data: exemption
      })
    } catch (error: any) {
      console.error('Error updating tax exemption:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update tax exemption' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'])
}