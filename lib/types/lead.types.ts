import { LeadSource, LeadStatus } from "@/lib/types/shared-enums";


export interface CreateLeadData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  jobTitle?: string
  source: LeadSource
  notes?: string
}

export interface UpdateLeadData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  jobTitle?: string
  source?: LeadSource
  status?: LeadStatus
  notes?: string
}

export interface LeadResponse {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  company: string | null
  jobTitle: string | null
  source: LeadSource
  status: LeadStatus
  notes: string | null
  createdBy: string
  updatedBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface LeadListQuery {
  page: number
  limit: number
  search?: string
  status?: LeadStatus
  source?: LeadSource
}

export interface LeadListResponse {
  data: LeadResponse[]
  total: number
  page: number
  limit: number
}

export interface LeadStats {
  NEW: number
  CONTACTED: number
  QUALIFIED: number
  PROPOSAL_SENT: number
  NEGOTIATING: number
  CONVERTED: number
  LOST: number
  DISQUALIFIED: number
}