import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { ItemService, CreateItemInput } from '@/lib/services/inventory/item.service'
// import { ItemType } from '@/lib/generated/prisma'

// GET /api/inventory/items - Get all items with filters
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // Temporarily using hardcoded session for development
    const user = session.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get('categoryId')
    const type = searchParams.get('type') as string | null
    const isActive = searchParams.get('isActive')
    const isSaleable = searchParams.get('isSaleable')
    const isPurchaseable = searchParams.get('isPurchaseable')
    const trackInventory = searchParams.get('trackInventory')
    const search = searchParams.get('search')
    const belowMinStock = searchParams.get('belowMinStock')
    const belowReorderPoint = searchParams.get('belowReorderPoint')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const itemService = new ItemService()
    const items = await itemService.getAllItems({
      categoryId: categoryId || undefined,
      type: type || undefined,
      isActive: isActive ? isActive === 'true' : undefined,
      isSaleable: isSaleable ? isSaleable === 'true' : undefined,
      isPurchaseable: isPurchaseable ? isPurchaseable === 'true' : undefined,
      trackInventory: trackInventory ? trackInventory === 'true' : undefined,
      search: search || undefined,
      belowMinStock: belowMinStock === 'true',
      belowReorderPoint: belowReorderPoint === 'true',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json({
      data: items,
      total: items.length
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/items - Create new item
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // Temporarily using hardcoded session for development
    const user = session.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      code,
      name,
      description,
      categoryId,
      type,
      unitOfMeasureId,
      trackInventory,
      minStockLevel,
      maxStockLevel,
      reorderPoint,
      standardCost,
      listPrice,
      inventoryAccountId,
      cogsAccountId,
      salesAccountId,
      isSaleable,
      isPurchaseable
    } = body

    if (!code || !name || !categoryId || !unitOfMeasureId) {
      return NextResponse.json(
        { error: 'Code, name, category, and unit of measure are required' },
        { status: 400 }
      )
    }

    const itemData: CreateItemInput & { createdBy: string } = {
      code,
      name,
      description,
      categoryId,
      type: type || 'PRODUCT',
      unitOfMeasureId,
      trackInventory: trackInventory ?? true,
      minStockLevel: minStockLevel || 0,
      maxStockLevel: maxStockLevel || 0,
      reorderPoint: reorderPoint || 0,
      standardCost: standardCost || 0,
      listPrice: listPrice || 0,
      inventoryAccountId,
      cogsAccountId,
      salesAccountId,
      isSaleable: isSaleable ?? true,
      isPurchaseable: isPurchaseable ?? true,
      createdBy: session.user.id
    }

    const itemService = new ItemService()
    const item = await itemService.createItem(itemData)

    return NextResponse.json(item, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating item:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('already exists')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 409 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found') || 
        error instanceof Error ? error.message : String(error)?.includes('inactive') ||
        error instanceof Error ? error.message : String(error)?.includes('must be')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    )
  }
}