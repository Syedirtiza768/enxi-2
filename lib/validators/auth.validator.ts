import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'ACCOUNTANT', 'WAREHOUSE', 'VIEWER', 'USER']).default('USER'),
})

export const userResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'ACCOUNTANT', 'WAREHOUSE', 'VIEWER', 'USER']),
  isActive: z.boolean(),
})

export const tokenResponseSchema = z.object({
  token: z.string(),
  user: userResponseSchema,
})

export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UserResponse = z.infer<typeof userResponseSchema>
export type TokenResponse = z.infer<typeof tokenResponseSchema>