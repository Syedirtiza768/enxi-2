import { NextRequest, NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { UserService } from '@/lib/services/user.service'
import { z } from 'zod'

const userService = new UserService()

const grantPermissionSchema = z.object({
  permissionCode: z.string(),
  granted: z.boolean(),
})

/**
 * GET /api/users/[id]/permissions - Get user's permissions
 */
export const GET = createProtectedHandler(
  async (request, { params }) => {
    try {
      const { id: userId } = await params
      
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        )
      }

      // Get user's permissions (including role and individual permissions)
      const userPermissions = await userService.getUserPermissions(userId)
      const rolePermissions = await userService.getRolePermissions(userId)
      const individualPermissions = await userService.getIndividualPermissions(userId)

      return NextResponse.json({
        userPermissions: individualPermissions,
        rolePermissions,
        allPermissions: userPermissions,
      })
    } catch (error) {
      console.error('Error fetching user permissions:', error)
      
      return NextResponse.json(
        { error: 'Failed to fetch user permissions' },
        { status: 500 }
      )
    }
  },
  { permissions: ['users.read'] }
)

/**
 * POST /api/users/[id]/permissions - Grant or revoke permission
 */
export const POST = createProtectedHandler(
  async (request, { params }) => {
    try {
      const { id: userId } = await params
      
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        )
      }

      const body = await request.json()
      const { permissionCode, granted } = grantPermissionSchema.parse(body)

      const currentUser = request.user
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Grant or revoke the permission
      if (granted) {
        await userService.assignPermission(userId, permissionCode, currentUser.id)
      } else {
        await userService.revokePermission(userId, permissionCode, currentUser.id)
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error updating user permission:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to update permission' },
        { status: 500 }
      )
    }
  },
  { permissions: ['users.permissions'] }
)