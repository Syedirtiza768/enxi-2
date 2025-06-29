import { NextRequest, NextResponse } from 'next/server'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { z } from 'zod'

const updateExpenseSchema = z.object({
  expenseDate: z.string().datetime().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  attachmentUrl: z.string().optional(),
  receiptNumber: z.string().optional(),
  vendor: z.string().optional(),
  accountId: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED']).optional()
})

const salesCaseService = new SalesCaseService()

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const data = updateExpenseSchema.parse(body)
    
    const updateData: unknown = { ...data, updatedBy: userId }
    if (data.expenseDate) {
      updateData.expenseDate = new Date(data.expenseDate)
    }
    
    const expense = await salesCaseService.updateExpense(resolvedParams.id, updateData)
    
    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error updating expense:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    await salesCaseService.deleteExpense(resolvedParams.id, userId)
    
    return NextResponse.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    )
  }
}