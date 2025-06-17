import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CategoryService } from '@/lib/services/inventory/category.service'

// GET /api/inventory/categories/tree - Get category hierarchy tree
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Try to get authenticated user, but provide fallback for development
    let user: { id: string; role?: string } | null = null
    
    try {
      user = await getUserFromRequest(request)
    } catch (authError) {
      // In development, allow unauthenticated access with limited permissions
      if (process.env.NODE_ENV === 'development') {
        console.warn('Auth failed in development mode, using fallback user')
        user = { id: 'dev-user', role: 'VIEWER' }
      } else {
        // In production, auth is required
        throw authError
      }
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