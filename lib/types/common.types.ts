/**
 * Common Type Definitions
 * 
 * This file contains common types used throughout the application
 * to replace generic 'any' types with proper TypeScript types.
 */

import {
  User,
  Customer,
  Lead,
  SalesCase,
  Quotation,
  QuotationItem,
  SalesOrder,
  SalesOrderItem,
  Invoice,
  InvoiceItem,
  Payment,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  SupplierInvoice,
  SupplierInvoiceItem,
  SupplierPayment,
  InventoryItem,
  ItemCategory,
  StockMovement,
  Account,
  JournalEntry,
  JournalLine,
  TaxRate,
  TaxCategory,
  TaxExemption,
  UnitOfMeasure,
  Prisma
} from '@/lib/generated/prisma'

/**
 * Form Event Types
 */
export type FormChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>
export type ButtonClickEvent = React.MouseEvent<HTMLButtonElement>

/**
 * API Request/Response Types
 * @deprecated Use StandardApiResponse from '@/lib/types' instead
 * These types are kept for backwards compatibility
 */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  message?: string
  errors?: Record<string, string[]>
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// ApiClient response type (matches what apiClient actually returns)
export interface ApiClientResponse<T> {
  data?: T
  error?: string
  status: number
  ok: boolean
  errorDetails?: {
    code: string
    message: string
    field?: string
    context?: Record<string, unknown>
  }
}

// Re-export the new standard type for forward compatibility
export type { StandardApiResponse } from './index'

/**
 * Pagination Types
 */
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedData<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Filter Types
 */
export interface DateRange {
  from: Date | string
  to: Date | string
}

export interface CommonFilters {
  search?: string
  status?: string
  dateRange?: DateRange
  [key: string]: unknown
}

/**
 * Select Option Types
 * @deprecated Use SelectOption from '@/lib/types/ui.types' instead
 * This import ensures backwards compatibility
 */
export type { SelectOption } from './ui.types'

/**
 * Table Column Types
 */
export interface TableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: unknown, item: T) => React.ReactNode
}

/**
 * Form Field Error Types
 */
export interface FormErrors {
  [field: string]: string | string[]
}

/**
 * Line Item Types (common across quotations, orders, invoices)
 */
export interface BaseLineItem {
  id?: string
  lineNumber: number
  itemType: 'PRODUCT' | 'SERVICE'
  itemId?: string
  itemCode: string
  description: string
  quantity: number
  unitPrice: number
  discount?: number
  taxRate?: number
  taxRateId?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

export interface QuotationLineItem extends BaseLineItem {
  lineDescription?: string
  isLineHeader: boolean
  sortOrder: number
  internalDescription?: string
  cost?: number
  availabilityStatus?: string
  availableQuantity?: number
}

export interface OrderLineItem extends BaseLineItem {
  deliveryDate?: Date | string
  deliveredQuantity?: number
  remainingQuantity?: number
}

export interface InvoiceLineItem extends BaseLineItem {
  accountId?: string
  referencedItemId?: string
}

/**
 * Address Types
 */
export interface Address {
  street: string
  city: string
  state?: string
  country: string
  postalCode?: string
}

/**
 * Contact Types
 */
export interface Contact {
  name: string
  email: string
  phone?: string
  position?: string
}

/**
 * Financial Summary Types
 */
export interface FinancialSummary {
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  currency?: string
}

/**
 * Status Types
 */
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'
export type SalesCaseStatus = 'OPEN' | 'IN_PROGRESS' | 'WON' | 'LOST'

/**
 * User Session Types
 */
export interface UserSession {
  id: string
  username: string
  email: string
  role: string
  permissions?: string[]
}

/**
 * Dashboard Types
 */
export interface DashboardMetric {
  label: string
  value: number | string
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
}

export interface ChartData {
  labels: string[]
  datasets: ChartDataset[]
}

export interface ChartDataset {
  label: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  borderWidth?: number
}

/**
 * Notification Types
 */
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  timestamp: Date
  read?: boolean
}

/**
 * File Upload Types
 */
export interface FileUpload {
  file: File
  progress?: number
  status?: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

/**
 * Export Types
 */
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf'
  columns?: string[]
  filters?: CommonFilters
  filename?: string
}

/**
 * Audit Types
 */
export interface AuditEntry {
  id: string
  action: string
  entity: string
  entityId: string
  userId: string
  userName?: string
  timestamp: Date
  changes?: Record<string, { old: unknown; new: unknown }>
  metadata?: Record<string, unknown>
}

/**
 * Permission Types
 */
export interface Permission {
  resource: string
  action: string
  granted: boolean
}

/**
 * Settings Types
 */
export interface SystemSettings {
  companyName: string
  companyAddress: Address
  companyPhone: string
  companyEmail: string
  defaultCurrency: string
  dateFormat: string
  timeZone: string
  fiscalYearStart: string
}

/**
 * Report Types
 */
export interface ReportFilter {
  type: string
  dateRange?: DateRange
  groupBy?: string
  includeDetails?: boolean
  format?: 'summary' | 'detailed'
}

export interface ReportData {
  title: string
  generatedAt: Date
  filters: ReportFilter
  data: unknown[]
  summary?: Record<string, number | string>
}

/**
 * Type Guards
 */
export function isApiSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true
}

export function isApiErrorResponse<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false
}

/**
 * Utility Types
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type AsyncFunction<T = void> = (...args: unknown[]) => Promise<T>

export type ValidationResult = {
  isValid: boolean
  errors?: FormErrors
}

export type SortDirection = 'asc' | 'desc'

export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in'

export interface FilterCondition {
  field: string
  operator: FilterOperator
  value: unknown
}

export interface SortCondition {
  field: string
  direction: SortDirection
}

/**
 * Three-Way Matching Types
 */
export interface ThreeWayMatchResult {
  matched: boolean
  discrepancies?: {
    type: 'quantity' | 'price' | 'total'
    purchaseOrder: number
    goodsReceipt?: number
    supplierInvoice?: number
  }[]
}

/**
 * Inventory Types
 */
export interface StockLevel {
  itemId: string
  locationId?: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  lastUpdated: Date
}

export interface StockMovementRequest {
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  itemId: string
  quantity: number
  fromLocationId?: string
  toLocationId?: string
  referenceType?: string
  referenceId?: string
  notes?: string
}

/**
 * Tax Calculation Types
 */
export interface TaxCalculation {
  taxableAmount: number
  taxRate: number
  taxAmount: number
  taxRateId?: string
  exemptionId?: string
  exemptionReason?: string
}

/**
 * Currency Types
 */
export interface CurrencyInfo {
  code: string
  symbol: string
  name: string
  decimalPlaces: number
}

/**
 * Activity Log Types
 */
export interface ActivityLog {
  id: string
  type: string
  description: string
  userId: string
  entityType: string
  entityId: string
  timestamp: Date
  metadata?: Record<string, unknown>
}