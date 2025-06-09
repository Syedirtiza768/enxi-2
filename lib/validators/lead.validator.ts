import { z } from 'zod'
import { LeadSource, LeadStatus } from '@/lib/generated/prisma'

export const createLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  phone: z.string().optional().nullable(),
  company: z.string().max(255, 'Company name too long').optional().nullable(),
  jobTitle: z.string().max(100, 'Job title too long').optional().nullable(),
  source: z.nativeEnum(LeadSource),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
})

export const updateLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long').optional(),
  email: z.string().email('Invalid email address').max(255, 'Email too long').optional(),
  phone: z.string().optional().nullable(),
  company: z.string().max(255, 'Company name too long').optional().nullable(),
  jobTitle: z.string().max(100, 'Job title too long').optional().nullable(),
  source: z.nativeEnum(LeadSource).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
})

export const leadListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.nativeEnum(LeadSource).optional(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type LeadListQueryInput = z.infer<typeof leadListQuerySchema>