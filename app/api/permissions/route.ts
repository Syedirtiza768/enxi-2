import { NextRequest, NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/permissions - List all available permissions
 */
export const GET = createProtectedHandler(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url)
      const module = searchParams.get('module')

      const where = module ? { module } : {}

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
      console.error('Error listing permissions:', error)
      
      return NextResponse.json(
        { error: 'Failed to list permissions' },
        { status: 500 }
      )
    }
  },
  { roles: ['SUPER_ADMIN', 'ADMIN'] }
)