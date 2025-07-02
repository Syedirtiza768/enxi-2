import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getUserFromRequest } from '@/lib/utils/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id: customerId } = await params
    
    // Get customer to verify it exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    // Get all invoices for the customer
    const invoices = await prisma.invoice.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        number: true,
        date: true,
        total: true,
        balance: true,
        createdAt: true
      }
    })
    
    // Get all payments for the customer
    const payments = await prisma.payment.findMany({
      where: { customerId },
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        referenceNumber: true,
        paymentDate: true,
        amount: true,
        createdAt: true
      }
    })
    
    // Get all credit notes for the customer
    // TODO: Implement credit notes when the model is created
    const creditNotes: any[] = []
    
    // Combine and format all transactions
    const transactions = []
    let runningBalance = 0
    
    // Add invoices
    for (const invoice of invoices) {
      runningBalance += invoice.total
      transactions.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        date: invoice.date.toISOString(),
        reference: invoice.number,
        description: `Invoice ${invoice.number}`,
        debit: invoice.total,
        credit: 0,
        balance: runningBalance
      })
    }
    
    // Add payments
    for (const payment of payments) {
      runningBalance -= payment.amount
      transactions.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        date: payment.paymentDate.toISOString(),
        reference: payment.referenceNumber,
        description: `Payment ${payment.referenceNumber}`,
        debit: 0,
        credit: payment.amount,
        balance: runningBalance
      })
    }
    
    // Add credit notes
    for (const creditNote of creditNotes) {
      runningBalance -= creditNote.amount
      transactions.push({
        id: `credit-${creditNote.id}`,
        type: 'credit_note',
        date: creditNote.date.toISOString(),
        reference: creditNote.number,
        description: `Credit Note ${creditNote.number}`,
        debit: 0,
        credit: creditNote.amount,
        balance: runningBalance
      })
    }
    
    // Sort all transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    // Recalculate running balance from oldest to newest
    let calculatedBalance = 0
    for (let i = transactions.length - 1; i >= 0; i--) {
      calculatedBalance += transactions[i].debit - transactions[i].credit
      transactions[i].balance = calculatedBalance
    }
    
    return NextResponse.json({
      success: true,
      data: transactions
    })
    
  } catch (error) {
    console.error('Error fetching customer transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer transactions' },
      { status: 500 }
    )
  }
}