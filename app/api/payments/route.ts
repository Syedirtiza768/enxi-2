import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereCondition = customerId ? {
      customerId: customerId
    } : {}

    const payments = await prisma.payment.findMany({
      where: whereCondition,
      include: {
        invoice: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      },
      take: limit,
      skip: offset
    })

    return NextResponse.json({
      success: true,
      data: payments,
      count: payments.length
    })

} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(_request: NextRequest) {
  try {
    const body = await request.json()
    const {
      invoiceId,
      customerId,
      amount,
      paymentMethod,
      notes,
      paymentDate,
      reference,
      createdBy
    } = body

    // Validate required fields
    if (!invoiceId || !amount || !paymentMethod || !createdBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'invoiceId, amount, paymentMethod, and createdBy are required'
        },
        { status: 400 }
      )
    }

    // Get the invoice to validate it exists and get customer info
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true
      }
    })

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invoice not found'
        },
        { status: 404 }
      )
    }

    // Check if payment amount is valid
    if (amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment amount must be positive'
        },
        { status: 400 }
      )
    }

    // Check if payment doesn't exceed remaining balance
    const existingPayments = await prisma.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true }
    })

    const totalPaid = existingPayments._sum.amount || 0
    const remainingBalance = invoice.totalAmount - totalPaid

    if (amount > remainingBalance) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment amount exceeds remaining balance',
          details: `Remaining balance: $${remainingBalance.toFixed(2)}`
        },
        { status: 400 }
      )
    }

    // Generate payment number
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    const paymentNumber = `PAY-${timestamp}-${random}`

    // Create the payment
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        invoiceId,
        customerId: customerId || invoice.customerId,
        amount,
        paymentMethod,
        notes: notes || `Payment for ${invoice.invoiceNumber}`,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        reference,
        createdBy
      },
      include: {
        invoice: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Update invoice paid amount and balance
    const newTotalPaid = totalPaid + amount
    const newBalance = invoice.totalAmount - newTotalPaid
    
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newTotalPaid,
        balanceAmount: newBalance,
        status: newBalance <= 0.01 ? 'PAID' : invoice.status === 'DRAFT' ? 'SENT' : invoice.status
      }
    })

    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Payment recorded successfully'
    })

} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}