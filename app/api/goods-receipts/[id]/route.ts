import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { ReceiptStatus } from '@/lib/generated/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/goods-receipts/[id] - Get specific goods receipt
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    const { id } = await params
    
    const goodsReceipt = await prisma.goodsReceipt.findUnique({
      where: { id: id },
      include: {
        purchaseOrder: {
          include: {
            supplier: true
          }
        },
        items: {
          include: {
            purchaseOrderItem: true,
            item: true
          }
        }
      }
    })

    if (!goodsReceipt) {
      return NextResponse.json(
        { error: 'Goods receipt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: goodsReceipt
    })
  } catch (error) {
    console.error('Error fetching goods receipt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goods receipt' },
      { status: 500 }
    )
  }
}

// PUT /api/goods-receipts/[id] - Update goods receipt
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    const { id } = await params
    const body = await request.json()
    
    const updateSchema = z.object({
      receiptDate: z.string().datetime().optional(),
      deliveryNote: z.string().optional(),
      condition: z.string().optional(),
      notes: z.string().optional(),
      status: z.nativeEnum(ReceiptStatus).optional()
    })
    
    const data = updateSchema.parse(body)
    
    // Check if goods receipt exists
    const existingReceipt = await prisma.goodsReceipt.findUnique({
      where: { id: id }
    })
    
    if (!existingReceipt) {
      return NextResponse.json(
        { error: 'Goods receipt not found' },
        { status: 404 }
      )
    }
    
    // Only allow updates if status is PENDING
    if (existingReceipt.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Cannot update completed or rejected receipts' },
        { status: 400 }
      )
    }
    
    // Update goods receipt
    const updatedReceipt = await prisma.goodsReceipt.update({
      where: { id: id },
      data: {
        ...data,
        receiptDate: data.receiptDate ? new Date(data.receiptDate) : undefined,
        updatedAt: new Date()
      },
      include: {
        purchaseOrder: true,
        items: true
      }
    })
    
    // If status changed to COMPLETED, update inventory
    if (data.status === 'COMPLETED' && existingReceipt.status === 'PENDING') {
      // Get receipt items
      const receiptItems = await prisma.goodsReceiptItem.findMany({
        where: { goodsReceiptId: id }
      })
      
      // Create stock movements for each item
      for (const item of receiptItems) {
        await prisma.stockMovement.create({
          data: {
            movementNumber: `REC-${updatedReceipt.receiptNumber}-${item.id}`,
            itemId: item.itemId,
            movementType: 'STOCK_IN',
            movementDate: new Date(),
            quantity: item.quantityReceived,
            unitCost: item.unitCost,
            totalCost: item.quantityReceived * item.unitCost,
            unitOfMeasureId: 'default-uom', // Should get from item
            referenceType: 'PURCHASE',
            referenceId: updatedReceipt.purchaseOrderId,
            referenceNumber: updatedReceipt.receiptNumber,
            goodsReceiptId: id,
            notes: `Goods receipt ${updatedReceipt.receiptNumber}`,
            createdBy: user.id,
            approvedBy: user.id,
            approvedAt: new Date()
          }
        })
        
        // Update purchase order item received quantity
        await prisma.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: {
            quantityReceived: {
              increment: item.quantityReceived
            }
          }
        })
      }
      
      // Update purchase order status
      await prisma.purchaseOrder.update({
        where: { id: updatedReceipt.purchaseOrderId },
        data: {
          receivedAmount: {
            increment: receiptItems.reduce((sum, item) => sum + (item.quantityReceived * item.unitCost), 0)
          },
          status: 'PARTIAL_RECEIVED' // Should check if fully received
        }
      })
    }
    
    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entityType: 'GoodsReceipt',
        entityId: id,
        beforeData: existingReceipt,
        afterData: updatedReceipt
      }
    })
    
    return NextResponse.json({
      success: true,
      data: updatedReceipt
    })
  } catch (error) {
    console.error('Error updating goods receipt:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update goods receipt' },
      { status: 500 }
    )
  }
}

// DELETE /api/goods-receipts/[id] - Delete goods receipt
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    const { id } = await params
    
    // Check if goods receipt exists
    const existingReceipt = await prisma.goodsReceipt.findUnique({
      where: { id: id },
      include: {
        stockMovements: true
      }
    })
    
    if (!existingReceipt) {
      return NextResponse.json(
        { error: 'Goods receipt not found' },
        { status: 404 }
      )
    }
    
    // Only allow deletion if status is PENDING
    if (existingReceipt.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Cannot delete completed or rejected receipts' },
        { status: 400 }
      )
    }
    
    // Check if there are any stock movements
    if (existingReceipt.stockMovements.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete receipt with stock movements' },
        { status: 400 }
      )
    }
    
    // Delete the goods receipt (cascade will delete items)
    await prisma.goodsReceipt.delete({
      where: { id: id }
    })
    
    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        entityType: 'GoodsReceipt',
        entityId: id,
        beforeData: existingReceipt,
        metadata: {
          reason: 'Receipt cancelled'
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Goods receipt deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting goods receipt:', error)
    
    return NextResponse.json(
      { error: 'Failed to delete goods receipt' },
      { status: 500 }
    )
  }
}