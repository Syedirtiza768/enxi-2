import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { ItemService, UpdateItemInput } from '@/lib/services/inventory/item.service'



// GET /api/inventory/items/[id] - Get single item
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { id } = await params
    const itemService = new ItemService()
    const item = await itemService.getItem(id)

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(item)
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/inventory/items/[id] - Update item
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { id } = await params
    const body = await request.json()
    
    const updateData: UpdateItemInput = {}
    const fieldsToUpdate = [
      'code', 'name', 'description', 'categoryId', 'type',
      'unitOfMeasureId', 'trackInventory', 'minStockLevel',
      'maxStockLevel', 'reorderPoint', 'standardCost', 'listPrice',
      'inventoryAccountId', 'cogsAccountId', 'salesAccountId',
      'isActive', 'isSaleable', 'isPurchaseable'
    ]
    
    fieldsToUpdate.forEach(field => {
      if (body[field] !== undefined) {
        (updateData as Record<string, unknown>)[field] = body[field]
      }
    })

    const itemService = new ItemService()
    const item = await itemService.updateItem(
      id,
      updateData,
      session.user.id
    )

    return NextResponse.json(item)
  } catch (error: unknown) {
    console.error('Error updating item:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('already exists') || 
        error instanceof Error ? error.message : String(error)?.includes('inactive') ||
        error instanceof Error ? error.message : String(error)?.includes('stock movements') ||
        error instanceof Error ? error.message : String(error)?.includes('must be')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/items/[id] - Delete item
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { id } = await params
    const itemService = new ItemService()
    await itemService.deleteItem(id, session.user.id)

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting item:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('existing stock') || 
        error instanceof Error ? error.message : String(error)?.includes('movement history')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}