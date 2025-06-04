import { z } from 'zod'

// Sales case status enum
export const SalesCaseStatus = z.enum(['NEW', 'QUOTING', 'PO_RECEIVED', 'DELIVERED', 'CLOSED'])
export const SalesCaseResult = z.enum(['WON', 'LOST'])

// Sales case creation schema
export const createSalesCaseSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  estimatedValue: z.number().min(0, 'Estimated value must be non-negative').default(0),
  assignedTo: z.string().optional()
})

// Sales case update schema
export const updateSalesCaseSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  estimatedValue: z.number().min(0).optional(),
  assignedTo: z.string().nullable().optional()
})

// Sales case close schema
export const closeSalesCaseSchema = z.object({
  status: SalesCaseResult,
  actualValue: z.number().min(0, 'Actual value must be non-negative'),
  cost: z.number().min(0, 'Cost must be non-negative')
})

// Sales case assign schema
export const assignSalesCaseSchema = z.object({
  assignedTo: z.string().min(1, 'User ID is required')
})

// Status transition schema
export const transitionStatusSchema = z.object({
  status: SalesCaseStatus
})

// Expense schemas
export const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  category: z.string().min(1, 'Category is required'),
  expenseDate: z.string().datetime().optional(),
  needsApproval: z.boolean().default(false)
})

export const updateExpenseSchema = createExpenseSchema.partial()

export const approveExpenseSchema = z.object({
  approvedBy: z.string().min(1, 'Approver ID is required'),
  approvalNotes: z.string().optional()
})

export const rejectExpenseSchema = z.object({
  rejectedBy: z.string().min(1, 'Rejector ID is required'),
  rejectionReason: z.string().min(1, 'Rejection reason is required')
})

// Query schemas
export const salesCaseQuerySchema = z.object({
  customerId: z.string().optional(),
  status: SalesCaseStatus.optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'estimatedValue', 'actualValue', 'profitMargin']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

// Types
export type CreateSalesCaseData = z.infer<typeof createSalesCaseSchema>
export type UpdateSalesCaseData = z.infer<typeof updateSalesCaseSchema>
export type CloseSalesCaseData = z.infer<typeof closeSalesCaseSchema>
export type AssignSalesCaseData = z.infer<typeof assignSalesCaseSchema>
export type TransitionStatusData = z.infer<typeof transitionStatusSchema>
export type CreateExpenseData = z.infer<typeof createExpenseSchema>
export type UpdateExpenseData = z.infer<typeof updateExpenseSchema>
export type ApproveExpenseData = z.infer<typeof approveExpenseSchema>
export type RejectExpenseData = z.infer<typeof rejectExpenseSchema>
export type SalesCaseQuery = z.infer<typeof salesCaseQuerySchema>