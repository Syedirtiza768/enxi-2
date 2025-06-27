import { NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'

/**
 * GET /api/sales-team - Get sales team hierarchy and unassigned customers
 */
export const GET = createProtectedHandler(
  async (request) => {
    try {
      // Lazy load the service to avoid module issues
      const { SalesTeamService } = await import('@/lib/services/sales-team.service')
      const salesTeamService = new SalesTeamService()
      
      const { searchParams } = new URL(request.url)
      const view = searchParams.get('view') || 'hierarchy'
      const userId = request.user!.id
      const userRole = request.user!.role

      console.log('Sales team GET request:', {
        userId,
        userRole,
        view,
        search: searchParams.get('search')
      });

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
      if (userRole === 'MANAGER') {
        const hierarchy = await salesTeamService.getTeamHierarchy(userId)
        return NextResponse.json(hierarchy)
      }
      
      // Not a manager, return empty hierarchy (no error)
      return NextResponse.json({
        manager: null,
        teamMembers: [],
      })
    } catch (error) {
      console.error('Error in sales-team GET handler:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  { permissions: ['sales_team.read'] }
)