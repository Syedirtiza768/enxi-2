import { NextRequest, NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { SalesTeamService } from '@/lib/services/sales-team.service'

const salesTeamService = new SalesTeamService()

/**
 * GET /api/sales-team - Get sales team hierarchy and unassigned customers
 */
export const GET = createProtectedHandler(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url)
      const view = searchParams.get('view') || 'hierarchy'
      const userId = request.user!.id

      if (view === 'unassigned') {
        // Get unassigned customers
        const customers = await salesTeamService.getUnassignedCustomers({
          search: searchParams.get('search') || undefined,
          limit: parseInt(searchParams.get('limit') || '50'),
          offset: parseInt(searchParams.get('offset') || '0'),
        })

        return NextResponse.json({ customers })
      }

      // Check if user is a manager before trying to get hierarchy
      if (request.user?.role === 'MANAGER') {
        const hierarchy = await salesTeamService.getTeamHierarchy(userId)
        return NextResponse.json(hierarchy)
      }
      
      // Not a manager, return empty hierarchy (no error)
      return NextResponse.json({
        manager: null,
        teamMembers: [],
      })
    } catch (error) {
      console.error('Error in sales team route:', error)

      return NextResponse.json(
        { error: 'Failed to fetch sales team data' },
        { status: 500 }
      )
    }
  },
  { permissions: ['sales.read'] }
)