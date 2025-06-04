import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { ItemService } from '@/lib/services/inventory/item.service'
import { UpdateItemInput } from '@/lib/services/inventory/item.service'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// GET /api/inventory/items/[id] - Get single item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    console.error('Error fetching item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    )
  }
}

// PUT /api/inventory/items/[id] - Update item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        (updateData as any)[field] = body[field]
      }
    })

    const itemService = new ItemService()
    const item = await itemService.updateItem(
      id,
      updateData,
      user.id
    )

    return NextResponse.json(item)
  } catch (error: any) {
    console.error('Error updating item:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('already exists') || 
        error.message?.includes('inactive') ||
        error.message?.includes('stock movements') ||
        error.message?.includes('must be')) {
      return NextResponse.json(
        { error: error.message },
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
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const itemService = new ItemService()
    await itemService.deleteItem(id, user.id)

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting item:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('existing stock') || 
        error.message?.includes('movement history')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}