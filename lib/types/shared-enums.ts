// Shared enums that are used across the application
// These are re-exported from Prisma generated types to provide a stable import path

// Define AccountType as a constant since it's not an enum in the schema
export const AccountType = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE'
} as const

export type AccountType = typeof AccountType[keyof typeof AccountType]

// Define AccountStatus as a constant since it's not an enum in the schema
export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED'
} as const

export type AccountStatus = typeof AccountStatus[keyof typeof AccountStatus]

// Define JournalStatus as a constant since it's not an enum in the schema
export const JournalStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED'
} as const

export type JournalStatus = typeof JournalStatus[keyof typeof JournalStatus]

// These will be imported from Prisma when they are properly defined as enums in the schema
// For now, we'll comment them out to avoid import errors
// export {
//   QuotationStatus,
//   OrderStatus,
//   ShipmentStatus,
//   InvoiceType,
//   InvoiceStatus,
//   PaymentMethod,
//   ItemType,
//   MovementType,
//   ReservationStatus,
//   POStatus,
//   ReceiptStatus,
//   SupplierInvoiceStatus,
//   LocationType,
//   TransferStatus,
//   CountType,
//   CountStatus
// } from '@/lib/generated/prisma'

// Define TaxType as a constant since it's not an enum in the schema
export const TaxType = {
  SALES: 'SALES',
  PURCHASE: 'PURCHASE',
  BOTH: 'BOTH'
} as const

export type TaxType = typeof TaxType[keyof typeof TaxType]

// Define Role as a constant since it's not an enum in the schema
export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES_REP: 'SALES_REP',
  ACCOUNTANT: 'ACCOUNTANT',
  WAREHOUSE: 'WAREHOUSE',
  VIEWER: 'VIEWER',
  USER: 'USER'
} as const

export type Role = typeof Role[keyof typeof Role]

// Define LeadSource and LeadStatus as constants since they're not enums in the schema
export const LeadSource = {
  WEBSITE: 'WEBSITE',
  REFERRAL: 'REFERRAL',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  EMAIL_CAMPAIGN: 'EMAIL_CAMPAIGN',
  PHONE_CALL: 'PHONE_CALL',
  TRADE_SHOW: 'TRADE_SHOW',
  PARTNER: 'PARTNER',
  OTHER: 'OTHER'
} as const

export type LeadSource = typeof LeadSource[keyof typeof LeadSource]

export const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL_SENT: 'PROPOSAL_SENT',
  NEGOTIATING: 'NEGOTIATING',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
  DISQUALIFIED: 'DISQUALIFIED'
} as const

export type LeadStatus = typeof LeadStatus[keyof typeof LeadStatus]

// Define SalesCaseStatus and ExpenseStatus as constants since they're not enums in the schema
export const SalesCaseStatus = {
  OPEN: 'OPEN',
  WON: 'WON',
  LOST: 'LOST'
} as const

export type SalesCaseStatus = typeof SalesCaseStatus[keyof typeof SalesCaseStatus]

export const ExpenseStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID'
} as const

export type ExpenseStatus = typeof ExpenseStatus[keyof typeof ExpenseStatus]

// Define MovementType as a constant since it's not an enum in the schema
export const MovementType = {
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  TRANSFER: 'TRANSFER',
  ADJUSTMENT: 'ADJUSTMENT',
  OPENING: 'OPENING'
} as const

export type MovementType = typeof MovementType[keyof typeof MovementType]

// Define ReceiptStatus as a constant since it's not an enum in the schema
export const ReceiptStatus = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const

export type ReceiptStatus = typeof ReceiptStatus[keyof typeof ReceiptStatus]

// Type aliases for locally defined enums
export type AccountTypeEnum = AccountType
export type AccountStatusEnum = AccountStatus
export type JournalStatusEnum = JournalStatus

// Type aliases for locally defined enums
export type TaxTypeEnum = TaxType
export type RoleType = Role
export type LeadSourceType = LeadSource
export type LeadStatusType = LeadStatus
export type SalesCaseStatusEnum = SalesCaseStatus
export type ExpenseStatusEnum = ExpenseStatus