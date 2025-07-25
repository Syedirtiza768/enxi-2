import { NextRequest, NextResponse } from 'next/server'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { z } from 'zod'

const rejectExpenseSchema = z.object({
  reason: z.string()
})

const salesCaseService = new SalesCaseService()

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const { reason } = rejectExpenseSchema.parse(body)
    
    const expense = await salesCaseService.rejectExpense(resolvedParams.id, userId, reason)
    
    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error rejecting expense:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to reject expense' },
      { status: 500 }
    )
  }
}