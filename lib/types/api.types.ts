/**
 * Centralized API Type Definitions
 * 
 * All API responses must follow these interfaces to ensure type safety
 */

/**
 * Standard API Response wrapper
 */
// ApiResponse moved to common.types.ts to avoid duplication
export type { ApiResponse } from './common.types'

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

/**
 * API Error types
 */
export interface ApiError extends Error {
  status: number
  statusText: string
  code?: string
}

/**
 * Auth response types
 */
export interface LoginResponse {
  token: string
  user: {
    id: string
    username: string
    email: string
    role: string
  }
}

/**
 * User profile response
 */
export interface UserProfile {
  id: string
  username: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

/**
 * Type guard for API responses
 */
export function isApiResponse<T>(response: unknown): response is ApiResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    typeof response.status === 'number' &&
    typeof response.ok === 'boolean'
  )
}

/**
 * Type guard for successful API responses
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.ok && response?.data !== undefined
}

/**
 * Type guard for error responses
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { error: string } {
  return !response.ok && response.error !== undefined
}