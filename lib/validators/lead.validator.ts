import { LeadSource, LeadStatus } from "@/lib/types/shared-enums";
import { z } from 'zod'


// Create enum schemas from the constant objects
const leadSourceSchema = z.enum([
  'WEBSITE',
  'REFERRAL',
  'SOCIAL_MEDIA',
  'EMAIL_CAMPAIGN',
  'PHONE_CALL',
  'TRADE_SHOW',
  'PARTNER',
  'OTHER'
] as const)

const leadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATING',
  'CONVERTED',
  'LOST',
  'DISQUALIFIED'
] as const)

export const createLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  phone: z.string().optional().nullable(),
  company: z.string().max(255, 'Company name too long').optional().nullable(),
  jobTitle: z.string().max(100, 'Job title too long').optional().nullable(),
  source: leadSourceSchema,
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
})

export const updateLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long').optional(),
  email: z.string().email('Invalid email address').max(255, 'Email too long').optional(),
  phone: z.string().optional().nullable(),
  company: z.string().max(255, 'Company name too long').optional().nullable(),
  jobTitle: z.string().max(100, 'Job title too long').optional().nullable(),
  source: leadSourceSchema.optional(),
  status: leadStatusSchema.optional(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
})

export const leadListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: leadStatusSchema.optional(),
  source: leadSourceSchema.optional(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type LeadListQueryInput = z.infer<typeof leadListQuerySchema>