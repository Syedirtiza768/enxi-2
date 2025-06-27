import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { ItemService, CreateItemInput } from '@/lib/services/inventory/item.service'
import { prisma } from '@/lib/db/prisma'
// import { ItemType } from "@prisma/client"

// GET /api/inventory/items - Get all items with filters
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Try to get the first user in the system for development
    const firstUser = await prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true }
    })
    
    const session = { user: { id: firstUser?.id || 'system' } }
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
    // Try to get the first user in the system for development
    const firstUser = await prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true }
    })
    
    const session = { user: { id: firstUser?.id || 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // Temporarily using hardcoded session for development
    const user = session.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received request body:', JSON.stringify(body, null, 2))
    
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
    
    console.log('Extracted values - categoryId:', categoryId, 'unitOfMeasureId:', unitOfMeasureId)
    console.log('CategoryId type:', typeof categoryId, 'value:', categoryId)
    console.log('UnitOfMeasureId type:', typeof unitOfMeasureId, 'value:', unitOfMeasureId)

    if (!code || !name || !categoryId || !unitOfMeasureId || categoryId === '' || unitOfMeasureId === '') {
      return NextResponse.json(
        { error: 'Code, name, category, and unit of measure are required' },
        { status: 400 }
      )
    }
    
    // Validate that category exists
    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId }
    })
    
    if (!categoryExists) {
      console.error('Category not found with ID:', categoryId)
      const allCategories = await prisma.category.findMany({
        select: { id: true, name: true }
      })
      console.log('Available categories:', allCategories)
      return NextResponse.json(
        { error: `Category with ID '${categoryId}' not found` },
        { status: 400 }
      )
    }
    
    // Validate that unit of measure exists
    const uomExists = await prisma.unitOfMeasure.findUnique({
      where: { id: unitOfMeasureId }
    })
    
    if (!uomExists) {
      console.error('Unit of Measure not found with ID:', unitOfMeasureId)
      const allUOMs = await prisma.unitOfMeasure.findMany({
        select: { id: true, name: true }
      })
      console.log('Available units of measure:', allUOMs)
      return NextResponse.json(
        { error: `Unit of Measure with ID '${unitOfMeasureId}' not found` },
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
    
    // Get the error message
    let errorMessage = 'Failed to create item'
    let errorDetails = ''
    
    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.stack || ''
      console.error('Error stack:', error.stack)
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error)
    }
    
    console.error('Error message:', errorMessage)
    console.error('Error details:', errorDetails)
    
    // Check for Prisma foreign key constraint errors
    if (errorMessage.includes('Foreign key constraint') || errorMessage.includes('foreign key constraint')) {
      return NextResponse.json(
        { 
          error: 'Foreign key constraint error: Please ensure all selected values (category, unit of measure) are valid.',
          details: errorMessage 
        },
        { status: 400 }
      )
    }
    
    if (errorMessage.includes('already exists')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 409 }
      )
    }
    
    if (errorMessage.includes('not found') || 
        errorMessage.includes('inactive') ||
        errorMessage.includes('must be')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        message: 'Failed to create item',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
}