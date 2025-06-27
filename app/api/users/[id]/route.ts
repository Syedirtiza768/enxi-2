import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user.service'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { z } from 'zod'
// Role values: SUPER_ADMIN, ADMIN, MANAGER, SALES_REP, ACCOUNTANT, WAREHOUSE, VIEWER, USER

const userService = new UserService()

// Validation schemas
const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'ACCOUNTANT', 'WAREHOUSE', 'VIEWER', 'USER']).optional(),
  isActive: z.boolean().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
})

/**
 * GET /api/users/[id] - Get user details
 */
export const GET = createProtectedHandler(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: userId } = await params

      const user = await userService.getUser(userId)

      // Remove password from response
      const { password: _password, ...userResponse } = user as Record<string, unknown> & { password: string }
      
      return NextResponse.json(userResponse)
    } catch (error) {
      console.error('Error getting user:', error);
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 500 }
      )
    }
  },
  { permissions: ['users.read'] }
)

/**
 * PUT /api/users/[id] - Update user
 */
export const PUT = createProtectedHandler(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: userId } = await params
      const body = await request.json()
      const data = updateUserSchema.parse(body)

      const user = await userService.updateUser(userId, data, request.user!.id)

      // Remove password from response
      const { password: _password, ...userResponse } = user as Record<string, unknown> & { password: string }
      
      return NextResponse.json(userResponse)
    } catch (error) {
      console.error('Error updating user:', error);
      
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }

        if (error.message.includes('Unique constraint')) {
          return NextResponse.json(
            { error: 'Username or email already exists' },
            { status: 409 }
          )
        }
      }

      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }
  },
  { permissions: ['users.update'] }
)

/**
 * DELETE /api/users/[id] - Deactivate user
 */
export const DELETE = createProtectedHandler(
  async (request, { params }: { params: { id: string } }) => {
    try {
      const userId = params.id

      // Prevent self-deactivation
      if (userId === request.user!.id) {
        return NextResponse.json(
          { error: 'Cannot deactivate your own account' },
          { status: 400 }
        )
      }

      await userService.deactivateUser(userId, request.user!.id)
      
      return NextResponse.json({ message: 'User deactivated successfully' })
    } catch (error) {
      console.error('Error deactivating user:', error);
      return NextResponse.json(
        { error: 'Failed to deactivate user' },
        { status: 500 }
      )
    }
  },
  { permissions: ['users.delete'] }
)