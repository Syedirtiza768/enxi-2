import { NextRequest, NextResponse } from 'next/server'
import { taxService } from '@/lib/services/tax.service'
import { withAuth } from '@/lib/utils/auth'
import { TaxCategory } from '@/lib/generated/prisma'

// GET /api/tax-categories
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const isActive = searchParams.get('isActive')

      const filters = {
        isActive: isActive !== null ? isActive === 'true' : undefined
      }

      const categories = await taxService.getTaxCategories(filters)

      return NextResponse.json({
        success: true,
        data: categories
      })
    } catch (error: any) {
      console.error('Error fetching tax categories:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch tax categories' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'])
}

// POST /api/tax-categories
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      
      const { code, name, description, isDefault } = body

      if (!code || !name) {
        return NextResponse.json(
          { success: false, error: 'Code and name are required' },
          { status: 400 }
        )
      }

      const category = await taxService.createTaxCategory({
        code,
        name,
        description,
        isDefault,
        createdBy: session.user.id
      })

      return NextResponse.json({
        success: true,
        data: category
      }, { status: 201 })
    } catch (error: any) {
      console.error('Error creating tax category:', error)
      
      if (error.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'Tax category code already exists' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create tax category' },
        { status: 500 }
      )
    }
  }, ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'])
}