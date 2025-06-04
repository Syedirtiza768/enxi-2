import { z } from 'zod'

// Customer creation schema
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  address: z.string().optional(),
  taxId: z.string().optional(),
  currency: z.string().default('USD'),
  creditLimit: z.number().min(0, 'Credit limit must be non-negative').default(0),
  paymentTerms: z.number().min(0, 'Payment terms must be non-negative').default(30),
  leadId: z.string().optional() // For lead conversion
})

// Customer update schema
export const updateCustomerSchema = createCustomerSchema.partial()

// Credit limit update schema
export const updateCreditLimitSchema = z.object({
  creditLimit: z.number().min(0, 'Credit limit must be non-negative')
})

// Customer query schema
export const customerQuerySchema = z.object({
  search: z.string().optional(),
  currency: z.string().optional(),
  industry: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'creditLimit', 'balance']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

// Types
export type CreateCustomerData = z.infer<typeof createCustomerSchema>
export type UpdateCustomerData = z.infer<typeof updateCustomerSchema>
export type UpdateCreditLimitData = z.infer<typeof updateCreditLimitSchema>
export type CustomerQuery = z.infer<typeof customerQuerySchema>