import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getUserFromRequest } from '@/lib/utils/auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)

    const { itemIds } = await request.json()

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Invalid item IDs' }, { status: 400 })
    }

    // Get inventory balances for all items
    const inventoryBalances = await prisma.inventoryBalance.findMany({
      where: {
        itemId: {
          in: itemIds
        }
      },
      select: {
        itemId: true,
        availableQuantity: true,
        reservedQuantity: true,
        onOrderQuantity: true,
        locationId: true
      }
    })

    // Aggregate availability by item
    const availability: Record<string, { available: number; reserved: number; onOrder: number }> = {}
    
    itemIds.forEach(itemId => {
      availability[itemId] = {
        available: 0,
        reserved: 0,
        onOrder: 0
      }
    })

    inventoryBalances.forEach(balance => {
      if (availability[balance.itemId]) {
        availability[balance.itemId].available += balance.availableQuantity
        availability[balance.itemId].reserved += balance.reservedQuantity
        availability[balance.itemId].onOrder += balance.onOrderQuantity
      }
    })

    return NextResponse.json(availability)
  } catch (error) {
    console.error('Error checking inventory availability:', error)
    return NextResponse.json(
      { error: 'Failed to check inventory availability' },
      { status: 500 }
    )
  }
}