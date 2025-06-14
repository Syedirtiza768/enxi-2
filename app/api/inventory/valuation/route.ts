import { NextRequest, NextResponse } from 'next/server'
import { InventoryService } from '@/lib/services/inventory/inventory.service'
import { z } from 'zod'

const inventoryValuationSchema = z.object({
  itemId: z.string().optional()
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const { searchParams } = new URL(request.url)
    const itemIdParam = searchParams.get('itemId')
    
    const data = inventoryValuationSchema.parse({
      itemId: itemIdParam || undefined
    })
    
    const inventoryService = new InventoryService()
    const valuation = await inventoryService.getStockValuation(data.itemId)
    
    return NextResponse.json(valuation)
  } catch (error) {
    console.error('Error getting inventory valuation:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to get inventory valuation' },
      { status: 500 }
    )
  }
}