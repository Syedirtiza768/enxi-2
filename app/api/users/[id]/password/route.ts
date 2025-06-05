import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user.service'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { z } from 'zod'

const userService = new UserService()

// Validation schemas
const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

/**
 * PUT /api/users/[id]/password - Reset or change user password
 */
export const PUT = createProtectedHandler(
  async (request, { params }: { params: { id: string } }) => {
    try {
      const userId = params.id
      const body = await request.json()

      // Check if this is a password change (user changing their own) or reset (admin)
      const isOwnPassword = userId === request.user!.id
      const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(request.user!.role)

      if (isOwnPassword) {
        // User changing their own password - requires current password
        const { currentPassword, newPassword } = changePasswordSchema.parse(body)
        
        await userService.changePassword(userId, currentPassword, newPassword)
        
        return NextResponse.json({ 
          message: 'Password changed successfully' 
        })
      } else if (isAdmin) {
        // Admin resetting user password - only requires new password
        const { newPassword } = resetPasswordSchema.parse(body)
        
        await userService.resetPassword(userId, newPassword, request.user!.id)
        
        return NextResponse.json({ 
          message: 'Password reset successfully' 
        })
      } else {
        return NextResponse.json(
          { error: 'Forbidden - can only change your own password or reset as admin' },
          { status: 403 }
        )
      }
    } catch (error) {
      console.error('Error updating password:', error)
      
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }

        if (error.message === 'Current password is incorrect') {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          )
        }
      }

      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }
  },
  { permissions: ['users.update'] }
)