import { NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/permissions - List all available permissions
 */
export const GET = createProtectedHandler(
  async (_request) => {
    try {
      const { searchParams } = new URL(_request.url)
      const moduleParam = searchParams.get('module')

      const where = moduleParam ? { module: moduleParam } : {}

      const permissions = await prisma.permission.findMany({
        where,
        orderBy: [
          { module: 'asc' },
          { action: 'asc' },
        ],
      })

      // Group permissions by module
      const groupedPermissions = permissions.reduce((acc, permission) => {
        if (!acc[permission.module]) {
          acc[permission.module] = []
        }
        acc[permission.module].push(permission)
        return acc
      }, {} as Record<string, typeof permissions>)

      return NextResponse.json({
        permissions,
        groupedPermissions,
        modules: Object.keys(groupedPermissions),
      })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  },
  { roles: ['SUPER_ADMIN', 'ADMIN'] }
)