/**
 * Standardized API response types for Enxi ERP
 */

import { NextResponse } from 'next/server'

// Success response types
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  meta?: {
    total?: number
    page?: number
    pageSize?: number
    hasMore?: boolean
  }
}

// Error response types
export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: Record<string, unknown>
  validationErrors?: Record<string, string | string[]>
}

// Union type for all API responses
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// Helper functions to create responses
export function successResponse<T>(
  data: T,
  meta?: ApiSuccessResponse<T>['meta'],
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data, meta }, { status })
}

export function errorResponse(
  error: string,
  status = 500,
  details?: Partial<ApiErrorResponse>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({
    success: false,
    error,
    ...details,
  }, { status })
}

// Pagination helpers
export interface PaginationParams {
  page?: number
  pageSize?: number
  limit?: number
  offset?: number
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '50')

  return {
    limit: Math.min(limit, 100), // Max 100 items
    offset: Math.max(offset, 0),
    page: Math.max(page, 1),
    pageSize: Math.min(pageSize, 100),
  }
}

// Common error codes
export enum ApiErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Business logic errors
  INSUFFICIENT_INVENTORY = 'INSUFFICIENT_INVENTORY',
  CREDIT_LIMIT_EXCEEDED = 'CREDIT_LIMIT_EXCEEDED',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

// Type guards
export function isApiSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true
}

export function isApiErrorResponse(
  response: ApiResponse
): response is ApiErrorResponse {
  return response.success === false
}

// Validation error helpers
export function validationErrorResponse(
  errors: Record<string, string | string[]>,
  message = 'Validation failed'
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 400, {
    code: ApiErrorCode.VALIDATION_ERROR,
    validationErrors: errors,
  })
}

// Standard CRUD response types
export interface CreateResponse<T> extends ApiSuccessResponse<T> {
  data: T
}

export interface UpdateResponse<T> extends ApiSuccessResponse<T> {
  data: T
}

export interface DeleteResponse extends ApiSuccessResponse<void> {
  data: void
}

export interface ListResponse<T> extends ApiSuccessResponse<T[]> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    hasMore: boolean
  }
}

export interface GetResponse<T> extends ApiSuccessResponse<T> {
  data: T
}