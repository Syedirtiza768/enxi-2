import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { CategoryService, CreateCategoryInput } from '@/lib/services/inventory/category.service'

// GET /api/inventory/categories - Get all categories with filters
export async function GET(_request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const parentId = searchParams.get('parentId')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')
    const includeChildren = searchParams.get('includeChildren') === 'true'
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const categoryService = new CategoryService()
    const categories = await categoryService.getAllCategories({
      parentId: parentId === 'null' ? null : parentId || undefined,
      isActive: isActive ? isActive === 'true' : undefined,
      search: search || undefined,
      includeChildren,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json({
      data: categories,
      total: categories.length
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/categories - Create new category
export async function POST(_request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, name, description, parentId } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Code and name are required' },
        { status: 400 }
      )
    }

    const categoryData: CreateCategoryInput & { createdBy: string } = {
      code,
      name,
      description,
      parentId,
      createdBy: _user.id
    }

    const categoryService = new CategoryService()
    const category = await categoryService.createCategory(categoryData)

    return NextResponse.json(category, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating category:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('already exists')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 409 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found') || error instanceof Error ? error.message : String(error)?.includes('inactive')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}