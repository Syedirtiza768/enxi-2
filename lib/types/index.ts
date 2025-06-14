/**
 * Central type exports for Enxi ERP
 * Import types from here instead of individual files
 */

// Re-export Prisma types
export * from '@/lib/generated/prisma'
export type { Prisma } from '@/lib/generated/prisma'

// Base types
export {
  ApiError,
  ValidationError,
  isApiError,
  isValidationError,
  hasProperty,
  type BaseEntity,
  type AuditableEntity,
  type FormState,
  type FormAction,
  type TableColumn,
  type TableProps,
  type FilterOption,
  type Filter,
  type SortOrder,
  type SearchParams,
  type CrudOperations,
  type StrictOmit,
  type RequireAtLeastOne,
  type DeepPartial,
} from './base.types'

// API response types (avoiding duplicates)
export {
  successResponse,
  errorResponse,
  parsePaginationParams,
  validationErrorResponse,
  ApiErrorCode,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type CreateResponse,
  type UpdateResponse,
  type DeleteResponse,
  type ListResponse,
  type GetResponse,
} from './api-responses.types'

// API types (avoiding duplicates with base.types)
export {
  LoginResponse,
  isApiResponse,
  isSuccessResponse,
  isErrorResponse,
} from './api.types'

// Common types
export * from './common.types'

// UI types
export * from './ui.types'

// Form types
export interface FormData<T = Record<string, unknown>> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
}

// Common business types
export interface DateRange {
  from: Date | string
  to: Date | string
}

export interface MoneyAmount {
  amount: number
  currency: string
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode?: string
  country: string
}

export interface ContactInfo {
  name: string
  email?: string
  phone?: string
  mobile?: string
}

// Status types
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived'

// Common interfaces for entities with relations
export interface WithTimestamps {
  createdAt: Date | string
  updatedAt: Date | string
}

export interface WithAudit extends WithTimestamps {
  createdBy: string
  updatedBy?: string
}

export interface WithSoftDelete {
  deletedAt?: Date | string | null
  deletedBy?: string | null
}

// Utility type for making all properties optional except specified keys
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

// Utility type for omitting multiple properties
export type OmitMultiple<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

// Type for form field validation
export type ValidationRule<T = unknown> = {
  required?: boolean | string
  min?: number | { value: number; message: string }
  max?: number | { value: number; message: string }
  pattern?: RegExp | { value: RegExp; message: string }
  validate?: (value: T) => boolean | string | Promise<boolean | string>
}

// Re-export commonly used enums with friendly names
export {
  AccountStatus,
  AccountType,
  AuditAction,
  CustomerStatus,
  EntityType,
  InvoiceStatus,
  InvoiceType,
  ItemType,
  JournalStatus,
  LeadSource,
  LeadStatus,
  LocationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  POStatus,
  QuotationStatus,
  ReceiptStatus,
  Role,
  SalesCaseStatus,
  ShipmentStatus,
  StockMovementType,
  SupplierInvoiceStatus,
  SupplierPaymentStatus,
  TaxType,
} from '@/lib/generated/prisma'