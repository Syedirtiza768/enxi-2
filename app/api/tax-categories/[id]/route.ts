import { NextRequest, NextResponse } from 'next/server'
import { taxService } from '@/lib/services/tax.service'
import { withAuth } from '@/lib/utils/auth'

// GET /api/tax-categories/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (session) => {
    try {
      const category = await taxService.getTaxCategoryById(params.id)
      
      if (!category) {
        return NextResponse.json(
          { success: false, error: 'Tax category not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: category
      })
    } catch (error: any) {
      console.error('Error fetching tax category:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch tax category' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'VIEWER'])
}

// PUT /api/tax-categories/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const { code, name, description, isDefault, isActive } = body

      const updates: any = {}
      if (code !== undefined) updates.code = code
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (isDefault !== undefined) updates.isDefault = isDefault
      if (isActive !== undefined) updates.isActive = isActive

      const category = await taxService.updateTaxCategory(params.id, updates)

      return NextResponse.json({
        success: true,
        data: category
      })
    } catch (error: any) {
      console.error('Error updating tax category:', error)
      
      if (error.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'Tax category code already exists' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update tax category' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'])
}