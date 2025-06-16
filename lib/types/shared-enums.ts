// Shared enums that are used across the application
// These are re-exported from Prisma generated types to provide a stable import path

export { 
  Role,
  LeadSource,
  LeadStatus,
  TaxType,
  AccountType,
  AccountStatus,
  JournalStatus,
  QuotationStatus,
  OrderStatus,
  ShipmentStatus,
  InvoiceType,
  InvoiceStatus,
  PaymentMethod,
  ItemType,
  MovementType,
  ReservationStatus,
  POStatus,
  ReceiptStatus,
  SupplierInvoiceStatus,
  LocationType,
  TransferStatus,
  CountType,
  CountStatus
} from '@/lib/generated/prisma'

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

// Re-export type aliases for consistency
export type {
  Role as RoleType,
  LeadSource as LeadSourceType,
  LeadStatus as LeadStatusType,
  TaxType as TaxTypeEnum,
  AccountType as AccountTypeEnum,
  AccountStatus as AccountStatusEnum,
  JournalStatus as JournalStatusEnum,
  SalesCaseStatus as SalesCaseStatusEnum,
  QuotationStatus as QuotationStatusEnum,
  OrderStatus as OrderStatusEnum,
  ShipmentStatus as ShipmentStatusEnum,
  InvoiceType as InvoiceTypeEnum,
  InvoiceStatus as InvoiceStatusEnum,
  PaymentMethod as PaymentMethodEnum,
  ExpenseStatus as ExpenseStatusEnum,
  ItemType as ItemTypeEnum,
  MovementType as MovementTypeEnum,
  ReservationStatus as ReservationStatusEnum,
  POStatus as POStatusEnum,
  ReceiptStatus as ReceiptStatusEnum,
  SupplierInvoiceStatus as SupplierInvoiceStatusEnum,
  LocationType as LocationTypeEnum,
  TransferStatus as TransferStatusEnum,
  CountType as CountTypeEnum,
  CountStatus as CountStatusEnum
} from '@/lib/generated/prisma'