import { NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { UserService } from '@/lib/services/user.service'

const userService = new UserService()

/**
 * DELETE /api/users/[id]/permissions/[code] - Remove user-specific permission
 */
export const DELETE = createProtectedHandler(
  async (request, { params }) => {
    try {
      const { id: userId, code } = await params
      const permissionCode = decodeURIComponent(code)
      
      if (!userId || !permissionCode) {
        return NextResponse.json(
          { error: 'User ID and permission code are required' },
          { status: 400 }
        )
      }

      const currentUser = request.user
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Remove the user-specific permission (reverts to role permission)
      await userService.removeUserPermission(userId, permissionCode, currentUser.id)

      return NextResponse.json({ success: true })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  },
  { permissions: ['users.permissions'] }
)