/**
 * Base type definitions for Enxi ERP
 * These types provide a foundation for type safety across the application
 */

// API Response Types
export type ApiResponse<T> = {
  data: T
  error?: string
  status: number
}

export type ApiErrorResponse = {
  error: string
  status: number
  details?: Record<string, unknown>
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Utility Types
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

// Common Entity Types
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface AuditableEntity extends BaseEntity {
  updatedBy?: string
  deletedAt?: Date | null
  deletedBy?: string | null
}

// Form Types
export type FormState<T> = {
  data: T
  errors: Partial<Record<keyof T, string>>
  isSubmitting: boolean
  isDirty: boolean
}

export type FormAction<T> =
  | { type: 'SET_FIELD'; field: keyof T; value: T[keyof T] }
  | { type: 'SET_ERROR'; field: keyof T; error: string }
  | { type: 'CLEAR_ERROR'; field: keyof T }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'RESET'; data?: T }

// Table Types
export interface TableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: unknown, row: T) => React.ReactNode
}

export interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyMessage?: string
}

// Filter Types
export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface Filter {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in'
  value: unknown
}

export interface SortOrder {
  field: string
  direction: 'asc' | 'desc'
}

// Request Types
export interface SearchParams {
  search?: string
  filters?: Filter[]
  sort?: SortOrder
  page?: number
  pageSize?: number
  dateFrom?: string
  dateTo?: string
}

// Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Type Guards
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj
}

// Generic CRUD Types
export interface CrudOperations<T, CreateInput, UpdateInput> {
  create: (data: CreateInput) => Promise<T>
  read: (id: string) => Promise<T | null>
  update: (id: string, data: UpdateInput) => Promise<T>
  delete: (id: string) => Promise<void>
  list: (params?: SearchParams) => Promise<PaginatedResponse<T>>
}

// Re-export commonly used types
export type { Prisma } from "@prisma/client"