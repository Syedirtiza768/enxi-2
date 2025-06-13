import { NextRequest, NextResponse } from 'next/server'
import { taxService } from '@/lib/services/tax.service'
import { withAuth } from '@/lib/utils/auth'

// GET /api/tax-exemptions
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const entityType = searchParams.get('entityType') as 'CUSTOMER' | 'SUPPLIER' | null
      const entityId = searchParams.get('entityId')
      const effectiveDate = searchParams.get('effectiveDate')

      if (!entityType || !entityId) {
        return NextResponse.json(
          { success: false, error: 'Entity type and ID are required' },
          { status: 400 }
        )
      }

      const exemptions = await taxService.getExemptions(
        entityType,
        entityId,
        effectiveDate ? new Date(effectiveDate) : undefined
      )

      return NextResponse.json({
        success: true,
        data: exemptions
      })
    } catch (error: any) {
      console.error('Error fetching tax exemptions:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch tax exemptions' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'])
}

// POST /api/tax-exemptions
export async function POST(request: NextRequest) {
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
        attachmentUrl
      } = body

      if (!entityType || !entityId) {
        return NextResponse.json(
          { success: false, error: 'Entity type and ID are required' },
          { status: 400 }
        )
      }

      if (entityType !== 'CUSTOMER' && entityType !== 'SUPPLIER') {
        return NextResponse.json(
          { success: false, error: 'Entity type must be CUSTOMER or SUPPLIER' },
          { status: 400 }
        )
      }

      const exemption = await taxService.createTaxExemption({
        entityType,
        entityId,
        taxRateId,
        exemptionNumber,
        reason,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
        attachmentUrl,
        createdBy: session.user.id
      })

      return NextResponse.json({
        success: true,
        data: exemption
      }, { status: 201 })
    } catch (error: any) {
      console.error('Error creating tax exemption:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create tax exemption' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'])
}