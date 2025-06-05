import { NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { SalesTeamService } from '@/lib/services/sales-team.service'
import { z } from 'zod'

const salesTeamService = new SalesTeamService()

const assignManagerSchema = z.object({
  salespersonId: z.string(),
  managerId: z.string(),
})

/**
 * POST /api/sales-team/assign-manager - Assign a manager to a salesperson
 */
export const POST = createProtectedHandler(
  async (request) => {
    try {
      const body = await request.json()
      const { salespersonId, managerId } = assignManagerSchema.parse(body)
      const assignedBy = request.user!.id

      const result = await salesTeamService.assignSalesManager(
        salespersonId,
        managerId,
        assignedBy
      )

      return NextResponse.json(result)
    } catch (error) {
      console.error('Error assigning manager:', error)
      
      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to assign manager' },
        { status: 500 }
      )
    }
  },
  { permissions: ['users.update'] }
)