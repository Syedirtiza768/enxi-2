import { NextRequest, NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { UserService } from '@/lib/services/user.service'
import { Role } from '@/lib/generated/prisma'
import { z } from 'zod'

const userService = new UserService()

const updatePermissionSchema = z.object({
  permissionCode: z.string(),
  granted: z.boolean(),
})

/**
 * POST /api/roles/[role]/permissions - Update role permission
 */
export const POST = createProtectedHandler(
  async (request, { params }) => {
    try {
      const { role: roleParam } = await params
      const role = roleParam.toUpperCase() as Role
      
      // Validate role
      if (!Object.values(Role).includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        )
      }

      // Prevent modifying SUPER_ADMIN permissions
      if (role === Role.SUPER_ADMIN) {
        return NextResponse.json(
          { error: 'Cannot modify SUPER_ADMIN permissions' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { permissionCode, granted } = updatePermissionSchema.parse(body)

      const currentUser = request.user
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Update the role permission
      if (granted) {
        await userService.assignRolePermission(role, permissionCode, currentUser.id)
      } else {
        await userService.revokeRolePermission(role, permissionCode, currentUser.id)
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error updating role permission:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to update role permission' },
        { status: 500 }
      )
    }
  },
  { permissions: ['roles.permissions'] }
)