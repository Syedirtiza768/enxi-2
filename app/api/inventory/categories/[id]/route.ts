import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CategoryService, UpdateCategoryInput } from '@/lib/services/inventory/category.service'



// GET /api/inventory/categories/[id] - Get single category
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
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
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/inventory/categories/[id] - Update category
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
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
  } catch (error: unknown) {
    console.error('Error updating category:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('already exists') || 
        error instanceof Error ? error.message : String(error)?.includes('circular') ||
        error instanceof Error ? error.message : String(error)?.includes('child category') ||
        error instanceof Error ? error.message : String(error)?.includes('inactive')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
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
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
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

    const { id } = await params
    const categoryService = new CategoryService()
    await categoryService.deleteCategory(id, user.id)

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting category:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('child categories') || 
        error instanceof Error ? error.message : String(error)?.includes('associated items')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}