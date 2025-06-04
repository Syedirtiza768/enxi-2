import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { CategoryService } from '@/lib/services/inventory/category.service'

// GET /api/inventory/categories/tree - Get category hierarchy tree
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categoryService = new CategoryService()
    const categoryTree = await categoryService.getCategoryTree()

    return NextResponse.json({
      data: categoryTree,
      total: categoryTree.length
    })
  } catch (error) {
    console.error('Error fetching category tree:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category tree' },
      { status: 500 }
    )
  }
}