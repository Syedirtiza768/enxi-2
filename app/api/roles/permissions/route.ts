import { NextRequest, NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { UserService } from '@/lib/services/user.service'
import { Role } from '@/lib/generated/prisma'

const userService = new UserService()

/**
 * GET /api/roles/permissions - Get all role permissions
 */
export const GET = createProtectedHandler(
  async (request) => {
    try {
      // Get all role permissions
      const rolePermissions: Record<Role, string[]> = {} as Record<Role, string[]>
      
      // Fetch permissions for each role
      for (const role of Object.values(Role)) {
        rolePermissions[role] = await userService.getPermissionsForRole(role)
      }

      return NextResponse.json(rolePermissions)
    } catch (error) {
      console.error('Error fetching role permissions:', error)
      
      return NextResponse.json(
        { error: 'Failed to fetch role permissions' },
        { status: 500 }
      )
    }
  },
  { roles: ['SUPER_ADMIN', 'ADMIN'] }
)