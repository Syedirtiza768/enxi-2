import { NextRequest, NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { SalesTeamService } from '@/lib/services/sales-team.service'
import { z } from 'zod'

const salesTeamService = new SalesTeamService()

const assignCustomerSchema = z.object({
  customerId: z.string(),
  salespersonId: z.string(),
  notes: z.string().optional(),
})

/**
 * POST /api/sales-team/assign-customer - Assign a customer to a salesperson
 */
export const POST = createProtectedHandler(
  async (request) => {
    try {
      const body = await request.json()
      const { customerId, salespersonId, notes } = assignCustomerSchema.parse(body)
      const assignedBy = request.user!.id

      const result = await salesTeamService.assignCustomerToSalesperson(
        customerId,
        salespersonId,
        assignedBy,
        notes
      )

      return NextResponse.json(result)
    } catch (error) {
      console.error('Error assigning customer:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        )
      }

      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to assign customer' },
        { status: 500 }
      )
    }
  },
  { permissions: ['customers.update'] }
)