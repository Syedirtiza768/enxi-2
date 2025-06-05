import { NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { SalesTeamService } from '@/lib/services/sales-team.service'
import { Role } from '@/lib/generated/prisma'

const salesTeamService = new SalesTeamService()

/**
 * GET /api/sales-team/performance - Get team performance metrics
 */
export const GET = createProtectedHandler(
  async (request) => {
    try {
      const userId = request.user!.id
      const userRole = request.user!.role

      // Only managers can view team performance
      if (userRole !== Role.MANAGER && userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
        return NextResponse.json(
          { error: 'Only managers can view team performance' },
          { status: 403 }
        )
      }

      const performance = await salesTeamService.getTeamPerformance(userId)
      return NextResponse.json(performance)
    } catch (error) {
      console.error('Error fetching team performance:', error)
      
      return NextResponse.json(
        { error: 'Failed to fetch team performance' },
        { status: 500 }
      )
    }
  },
  { permissions: ['reports.sales'] }
)