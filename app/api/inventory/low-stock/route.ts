import { NextRequest, NextResponse } from 'next/server'
import { InventoryService } from '@/lib/services/inventory/inventory.service'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const inventoryService = new InventoryService()
    const lowStockItems = await inventoryService.getItemsNeedingReorder()
    
    return NextResponse.json(lowStockItems)
  } catch (error) {
    console.error('Error getting low stock items:', error)
    return NextResponse.json(
      { error: 'Failed to get low stock items' },
      { status: 500 }
    )
  }
}