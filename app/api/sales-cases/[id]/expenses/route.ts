import { NextRequest, NextResponse } from 'next/server'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { z } from 'zod'

const createExpenseSchema = z.object({
  expenseDate: z.string().datetime(),
  category: z.string(),
  description: z.string(),
  amount: z.number().positive(),
  currency: z.string().optional(),
  attachmentUrl: z.string().optional(),
  receiptNumber: z.string().optional(),
  vendor: z.string().optional(),
  accountId: z.string().optional()
})

const salesCaseService = new SalesCaseService()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expenses = await salesCaseService.getExpensesByCase(params.id)
    
    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error getting expenses:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to get expenses' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const data = createExpenseSchema.parse(body)
    
    const expense = await salesCaseService.createExpense({
      salesCaseId: params.id,
      expenseDate: new Date(data.expenseDate),
      category: data.category,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      attachmentUrl: data.attachmentUrl,
      receiptNumber: data.receiptNumber,
      vendor: data.vendor,
      accountId: data.accountId,
      createdBy: userId
    })
    
    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating expense:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}