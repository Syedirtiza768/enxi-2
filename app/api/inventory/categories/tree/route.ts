import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { CategoryService } from '@/lib/services/inventory/category.service'

// GET /api/inventory/categories/tree - Get category hierarchy tree
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
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
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}