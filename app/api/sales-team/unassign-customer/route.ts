import { NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { SalesTeamService } from '@/lib/services/sales-team.service'
import { z } from 'zod'

const salesTeamService = new SalesTeamService()

const unassignCustomerSchema = z.object({
  customerId: z.string(),
  reason: z.string().optional(),
})

/**
 * POST /api/sales-team/unassign-customer - Unassign a customer from a salesperson
 */
export const POST = createProtectedHandler(
  async (request) => {
    try {
      const body = await request.json()
      const { customerId, reason } = unassignCustomerSchema.parse(body)
      const unassignedBy = request.user!.id

      const result = await salesTeamService.unassignCustomer(
        customerId,
        unassignedBy,
        reason
      )

      return NextResponse.json(result)
    } catch (error) {
      console.error('Error unassigning customer:', error)
      
      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to unassign customer' },
        { status: 500 }
      )
    }
  },
  { permissions: ['customers.update'] }
)