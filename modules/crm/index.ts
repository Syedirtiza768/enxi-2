/**
 * CRM Module - Customer Relationship Management functionality for Enxi ERP
 */

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  mobile?: string
  title?: string
  department?: string
  isPrimary: boolean
  customerId?: string
  supplierId?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Lead {
  id: string
  companyName: string
  contactName: string
  email: string
  phone?: string
  source: 'website' | 'referral' | 'cold_call' | 'trade_show' | 'advertisement' | 'other'
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'converted' | 'lost'
  rating: 'hot' | 'warm' | 'cold'
  estimatedValue?: number
  probability?: number
  notes?: string
  assignedTo?: string
  convertedDate?: Date
  convertedToCustomerId?: string
  lostReason?: string
  createdAt: Date
  updatedAt: Date
}

export interface Opportunity {
  id: string
  name: string
  customerId: string
  contactId?: string
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  amount: number
  probability: number
  expectedCloseDate: Date
  actualCloseDate?: Date
  source?: string
  campaignId?: string
  competitorInfo?: string
  notes?: string
  assignedTo: string
  createdAt: Date
  updatedAt: Date
}

export interface Activity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'task' | 'note'
  subject: string
  description?: string
  status: 'planned' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  dueDate?: Date
  completedDate?: Date
  duration?: number // in minutes
  relatedTo: string
  relatedType: 'lead' | 'customer' | 'opportunity' | 'contact'
  assignedTo: string
  createdBy: string
  createdAt: Date
}

export interface Campaign {
  id: string
  name: string
  type: 'email' | 'social' | 'webinar' | 'trade_show' | 'advertisement' | 'other'
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  startDate: Date
  endDate: Date
  budget?: number
  actualCost?: number
  expectedRevenue?: number
  actualRevenue?: number
  targetAudience?: string
  description?: string
  createdBy: string
  createdAt: Date
}

export interface CustomerSegment {
  id: string
  name: string
  description?: string
  criteria: SegmentCriteria[]
  customerCount: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SegmentCriteria {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between'
  value: any
}

// Utility functions
export const calculateLeadScore = (lead: Lead): number => {
  let score = 0
  
  // Rating score
  if (lead.rating === 'hot') score += 30
  else if (lead.rating === 'warm') score += 20
  else if (lead.rating === 'cold') score += 10
  
  // Status score
  if (lead.status === 'qualified') score += 20
  else if (lead.status === 'proposal') score += 30
  else if (lead.status === 'negotiation') score += 40
  
  // Value score
  if (lead.estimatedValue) {
    if (lead.estimatedValue > 100000) score += 30
    else if (lead.estimatedValue > 50000) score += 20
    else if (lead.estimatedValue > 10000) score += 10
  }
  
  return Math.min(score, 100)
}

export const calculateOpportunityValue = (opportunity: Opportunity): number => {
  return opportunity.amount * (opportunity.probability / 100)
}

export const getLeadConversionRate = (leads: Lead[]): number => {
  if (leads.length === 0) return 0
  
  const convertedLeads = leads.filter(lead => lead.status === 'converted')
  return (convertedLeads.length / leads.length) * 100
}

export const calculateCampaignROI = (campaign: Campaign): number => {
  if (!campaign.actualCost || campaign.actualCost === 0) return 0
  if (!campaign.actualRevenue) return 0
  
  return ((campaign.actualRevenue - campaign.actualCost) / campaign.actualCost) * 100
}

export const getDaysInStage = (
  opportunity: Opportunity,
  stageHistory: Array<{ stage: string; date: Date }>
): number => {
  const currentStageEntry = stageHistory.find(h => h.stage === opportunity.stage)
  if (!currentStageEntry) return 0
  
  const now = new Date()
  const daysDiff = Math.floor(
    (now.getTime() - currentStageEntry.date.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  return daysDiff
}

export const isActivityOverdue = (activity: Activity): boolean => {
  if (activity.status === 'completed' || activity.status === 'cancelled') return false
  if (!activity.dueDate) return false
  
  return new Date() > new Date(activity.dueDate)
}

export const getNextBestAction = (lead: Lead): string => {
  switch (lead.status) {
    case 'new':
      return 'Make initial contact'
    case 'contacted':
      return 'Qualify the lead'
    case 'qualified':
      return 'Send proposal'
    case 'proposal':
      return 'Follow up on proposal'
    case 'negotiation':
      return 'Close the deal'
    default:
      return 'Review lead status'
  }
}

export const formatContactName = (contact: Contact): string => {
  return `${contact.firstName} ${contact.lastName}`.trim()
}

// Export default for compatibility
export default {
  calculateLeadScore,
  calculateOpportunityValue,
  getLeadConversionRate,
  calculateCampaignROI,
  getDaysInStage,
  isActivityOverdue,
  getNextBestAction,
  formatContactName
}