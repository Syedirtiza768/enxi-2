import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user.service'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { z } from 'zod'
import { Role } from '@/lib/generated/prisma'

const userService = new UserService()

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
})

const listUsersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  department: z.string().optional(),
})

/**
 * GET /api/users - List users with pagination and filters
 */
export const GET = createProtectedHandler(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url)
      
      const params = listUsersSchema.parse({
        page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
        search: searchParams.get('search') || undefined,
        role: searchParams.get('role') as Role || undefined,
        isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
        department: searchParams.get('department') || undefined,
      })

      const result = await userService.listUsers(params)

      return NextResponse.json(result)
    } catch (error) {
      console.error('Error listing users:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: error.errors },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to list users' },
        { status: 500 }
      )
    }
  },
  { roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] }
)

/**
 * POST /api/users - Create a new user
 */
export const POST = createProtectedHandler(
  async (request) => {
    try {
      const body = await request.json()
      const data = createUserSchema.parse(body)

      const user = await userService.createUser(data, request.user!.id)

      // Remove password from response
      const { password, ...userResponse } = user as any
      
      return NextResponse.json(userResponse, { status: 201 })
    } catch (error) {
      console.error('Error creating user:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid user data', details: error.errors },
          { status: 400 }
        )
      }

      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          return NextResponse.json(
            { error: 'Username or email already exists' },
            { status: 409 }
          )
        }
      }

      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }
  },
  { roles: ['SUPER_ADMIN', 'ADMIN'] }
)