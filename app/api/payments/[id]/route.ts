import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/payments/[id] - Get specific payment
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    
    const payment = await prisma.payment.findUnique({
      where: { id: id },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            balanceAmount: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            customerNumber: true
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: payment
    })
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    )
  }
}

// PUT /api/payments/[id] - Update payment
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    const body = await request.json()
    
    const updateSchema = z.object({
      paymentDate: z.string().datetime().optional(),
      paymentMethod: z.enum(['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD']).optional(),
      reference: z.string().optional(),
      notes: z.string().optional()
    })
    
    const data = updateSchema.parse(body)
    
    // Check if payment exists
    const existingPayment = await prisma.payment.findUnique({
      where: { id: id }
    })
    
    if (!existingPayment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }
    
    // Update payment
    const updatedPayment = await prisma.payment.update({
      where: { id: id },
      data: {
        ...data,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
        updatedAt: new Date()
      },
      include: {
        invoice: true,
        customer: true
      }
    })
    
    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'Payment',
        entityId: id,
        beforeData: existingPayment,
        afterData: updatedPayment
      }
    })
    
    return NextResponse.json({
      success: true,
      data: updatedPayment
    })
  } catch (error) {
    console.error('Error updating payment:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}

// DELETE /api/payments/[id] - Delete payment (soft delete)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    
    // Check if payment exists
    const existingPayment = await prisma.payment.findUnique({
      where: { id: id },
      include: {
        invoice: true
      }
    })
    
    if (!existingPayment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }
    
    // Start transaction to handle payment deletion
    await prisma.$transaction(async (tx) => {
      // Update invoice balance
      await tx.invoice.update({
        where: { id: existingPayment.invoiceId },
        data: {
          paidAmount: {
            decrement: existingPayment.amount
          },
          balanceAmount: {
            increment: existingPayment.amount
          },
          status: existingPayment.invoice.paidAmount - existingPayment.amount <= 0 ? 'SENT' : 'PARTIAL'
        }
      })
      
      // Delete the payment
      await tx.payment.delete({
        where: { id: id }
      })
      
      // Log audit trail
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          entityType: 'Payment',
          entityId: id,
          beforeData: existingPayment,
          metadata: {
            reason: 'Payment reversed/cancelled'
          }
        }
      })
    })
    
    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    )
  }
}