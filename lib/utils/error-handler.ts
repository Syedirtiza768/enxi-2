/**
 * Centralized Error Handling System
 * Provides standardized error handling, logging, and response formatting
 */

import { NextResponse } from 'next/server'
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '../generated/prisma/runtime/library'
import { ZodError } from 'zod'

// Error categories for better classification
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  SYSTEM = 'SYSTEM'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Standardized error response format
export interface ErrorResponse {
  error: string
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  code?: string
  details?: any
  timestamp: string
  requestId?: string
  suggestions?: string[]
}

// Custom application errors
export class AppError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory = ErrorCategory.SYSTEM,
    public severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    public code?: string,
    public details?: any,
    public suggestions?: string[]
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Business logic specific errors
export class BusinessLogicError extends AppError {
  constructor(message: string, code?: string, details?: any, suggestions?: string[]) {
    super(message, ErrorCategory.BUSINESS_LOGIC, ErrorSeverity.MEDIUM, code, details, suggestions)
    this.name = 'BusinessLogicError'
  }
}

// Authentication specific errors
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code?: string) {
    super(message, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, code)
    this.name = 'AuthenticationError'
  }
}

// Authorization specific errors
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', code?: string) {
    super(message, ErrorCategory.AUTHORIZATION, ErrorSeverity.HIGH, code)
    this.name = 'AuthorizationError'
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler
  
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }
  
  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Log error with context information
   */
  private logError(error: Error, context?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context
    }
    
    // In production, you might want to use a proper logging service
    console.error('🔴 Error logged:', JSON.stringify(logData, null, 2))
  }
  
  /**
   * Parse Prisma errors into standardized format
   */
  private parsePrismaError(error: PrismaClientKnownRequestError): ErrorResponse {
    const requestId = this.generateRequestId()
    
    switch (error.code) {
      case 'P2002':
        return {
          error: 'Unique constraint violation',
          message: `A record with this ${error.meta?.target} already exists`,
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          code: error.code,
          details: error.meta,
          timestamp: new Date().toISOString(),
          requestId,
          suggestions: ['Check if the record already exists', 'Use a different unique value']
        }
        
      case 'P2025':
        return {
          error: 'Record not found',
          message: 'The requested record could not be found',
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          code: error.code,
          details: error.meta,
          timestamp: new Date().toISOString(),
          requestId,
          suggestions: ['Verify the record ID is correct', 'Check if the record was deleted']
        }
        
      case 'P2003':
        return {
          error: 'Foreign key constraint violation',
          message: 'The operation failed due to a foreign key constraint',
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.HIGH,
          code: error.code,
          details: error.meta,
          timestamp: new Date().toISOString(),
          requestId,
          suggestions: ['Ensure referenced records exist', 'Create dependent records first']
        }
        
      case 'P2014':
        return {
          error: 'Invalid relation',
          message: 'The change you are trying to make would violate the required relation',
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.HIGH,
          code: error.code,
          details: error.meta,
          timestamp: new Date().toISOString(),
          requestId,
          suggestions: ['Check data relationships', 'Ensure required fields are provided']
        }
        
      default:
        return {
          error: 'Database operation failed',
          message: error.message,
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.HIGH,
          code: error.code,
          details: error.meta,
          timestamp: new Date().toISOString(),
          requestId
        }
    }
  }
  
  /**
   * Parse Zod validation errors
   */
  private parseZodError(error: ZodError): ErrorResponse {
    const issues = error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    }))
    
    return {
      error: 'Validation failed',
      message: 'The provided data does not meet the required format',
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      details: { issues },
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
      suggestions: [
        'Check the data format',
        'Ensure all required fields are provided',
        'Verify data types match expectations'
      ]
    }
  }
  
  /**
   * Convert any error to standardized ErrorResponse
   */
  public parseError(error: unknown, context?: any): ErrorResponse {
    this.logError(error as Error, context)
    
    // Handle our custom AppError
    if (error instanceof AppError) {
      return {
        error: error.name,
        message: error.message,
        category: error.category,
        severity: error.severity,
        code: error.code,
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        suggestions: error.suggestions
      }
    }
    
    // Handle Prisma errors
    if (error instanceof PrismaClientKnownRequestError) {
      return this.parsePrismaError(error)
    }
    
    if (error instanceof PrismaClientValidationError) {
      return {
        error: 'Database validation error',
        message: 'Invalid data provided to database operation',
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        details: { originalError: error.message },
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        suggestions: ['Check the data structure', 'Ensure all required fields are provided']
      }
    }
    
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return this.parseZodError(error)
    }
    
    // Handle standard JavaScript errors
    if (error instanceof Error) {
      return {
        error: error.name || 'Unknown Error',
        message: error.message || 'An unexpected error occurred',
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      }
    }
    
    // Handle unknown error types
    return {
      error: 'Unknown Error',
      message: 'An unexpected error occurred',
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      details: { originalError: String(error) },
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    }
  }
  
  /**
   * Create Next.js response from error
   */
  public createErrorResponse(error: unknown, context?: any): NextResponse {
    const errorResponse = this.parseError(error, context)
    
    // Map severity to HTTP status codes
    const statusCode = this.getHttpStatusCode(errorResponse)
    
    return NextResponse.json(errorResponse, { status: statusCode })
  }
  
  /**
   * Get appropriate HTTP status code based on error category and severity
   */
  private getHttpStatusCode(errorResponse: ErrorResponse): number {
    switch (errorResponse.category) {
      case ErrorCategory.AUTHENTICATION:
        return 401
        
      case ErrorCategory.AUTHORIZATION:
        return 403
        
      case ErrorCategory.VALIDATION:
        return 400
        
      case ErrorCategory.DATABASE:
        if (errorResponse.code === 'P2025') return 404
        if (errorResponse.code === 'P2002') return 409
        return 400
        
      case ErrorCategory.BUSINESS_LOGIC:
        return 422
        
      case ErrorCategory.EXTERNAL_SERVICE:
        return 502
        
      default:
        return errorResponse.severity === ErrorSeverity.CRITICAL ? 500 : 400
    }
  }
}

// Singleton instance
export const errorHandler = ErrorHandler.getInstance()

// Utility functions for common error scenarios
export const handleApiError = (error: unknown, context?: any) => {
  return errorHandler.createErrorResponse(error, context)
}

export const throwBusinessLogicError = (message: string, code?: string, details?: any, suggestions?: string[]) => {
  throw new BusinessLogicError(message, code, details, suggestions)
}

export const throwAuthenticationError = (message?: string, code?: string) => {
  throw new AuthenticationError(message, code)
}

export const throwAuthorizationError = (message?: string, code?: string) => {
  throw new AuthorizationError(message, code)
}