import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { CategoryService } from '@/lib/services/inventory/category.service'
import { UpdateCategoryInput } from '@/lib/services/inventory/category.service'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// GET /api/inventory/categories/[id] - Get single category
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const categoryService = new CategoryService()
    const category = await categoryService.getCategory(id)

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}

// PUT /api/inventory/categories/[id] - Update category
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { code, name, description, parentId, isActive } = body

    const updateData: UpdateCategoryInput = {}
    if (code !== undefined) updateData.code = code
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (parentId !== undefined) updateData.parentId = parentId
    if (isActive !== undefined) updateData.isActive = isActive

    const categoryService = new CategoryService()
    const category = await categoryService.updateCategory(
      id,
      updateData,
      user.id
    )

    return NextResponse.json(category)
  } catch (error: any) {
    console.error('Error updating category:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('already exists') || 
        error.message?.includes('circular') ||
        error.message?.includes('child category') ||
        error.message?.includes('inactive')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/categories/[id] - Delete category
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const categoryService = new CategoryService()
    await categoryService.deleteCategory(id, user.id)

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('child categories') || 
        error.message?.includes('associated items')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}