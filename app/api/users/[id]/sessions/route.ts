import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user.service'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'

const userService = new UserService()

/**
 * GET /api/users/[id]/sessions - Get user's active sessions
 */
export const GET = createProtectedHandler(
  async (request, { params }: { params: { id: string } }) => {
    try {
      const userId = params.id

      // Users can only view their own sessions unless they're admin
      if (userId !== request.user!.id && !['SUPER_ADMIN', 'ADMIN'].includes(request.user!.role)) {
        return NextResponse.json(
          { error: 'Forbidden - can only view your own sessions' },
          { status: 403 }
        )
      }

      const sessions = await userService.getUserSessions(userId)
      
      return NextResponse.json({ sessions })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  },
  { permissions: ['users.read'] }
)

/**
 * DELETE /api/users/[id]/sessions - Revoke all user sessions
 */
export const DELETE = createProtectedHandler(
  async (request, { params }: { params: { id: string } }) => {
    try {
      const userId = params.id

      // Users can revoke their own sessions, admins can revoke any
      if (userId !== request.user!.id && !['SUPER_ADMIN', 'ADMIN'].includes(request.user!.role)) {
        return NextResponse.json(
          { error: 'Forbidden - can only revoke your own sessions' },
          { status: 403 }
        )
      }

      const result = await userService.revokeAllSessions(userId, request.user!.id)
      
      return NextResponse.json({ 
        message: 'All sessions revoked successfully',
        sessionsRevoked: result.count
      })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  },
  { permissions: ['users.update'] }
)