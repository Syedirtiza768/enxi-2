import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@/lib/generated/prisma';

export interface ErrorResponse {
  error: string;
  message?: string;
  code?: string;
  requestId?: string;
  timestamp: string;
  details?: unknown;
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  route?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorReport {
  id: string;
  error: Error;
  context: ErrorContext;
  resolved: boolean;
  occurrenceCount: number;
  firstOccurrence: string;
  lastOccurrence: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

class GlobalErrorHandler {
  private errorReports: Map<string, ErrorReport> = new Map();
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) return;

    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(new Error(event.reason), {
          route: window.location.pathname,
          timestamp: new Date().toISOString(),
          additionalData: { type: 'unhandledRejection' }
        });
      });

      // Handle general JavaScript errors
      window.addEventListener('error', (event) => {
        this.handleError(event.error || new Error(event.message), {
          route: window.location.pathname,
          timestamp: new Date().toISOString(),
          additionalData: { 
            type: 'windowError',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        });
      });
    }

    // Handle Node.js unhandled rejections (server-side)
    if (typeof process !== 'undefined') {
      process.on('unhandledRejection', (reason, promise) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.handleError(error, {
          timestamp: new Date().toISOString(),
          additionalData: { 
            type: 'unhandledRejection',
            promise: promise.toString()
          }
        });
      });

      process.on('uncaughtException', (error) => {
        this.handleError(error, {
          timestamp: new Date().toISOString(),
          additionalData: { type: 'uncaughtException' }
        });
      });
    }

    this.isInitialized = true;
    console.warn('Global error handler initialized');
  }

  async handleError(error: Error, context: Partial<ErrorContext> = {}): Promise<ErrorReport> {
    const fullContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      ...context
    };

    // Generate error ID based on error message and stack
    const errorId = this.generateErrorId(error);

    // Check if this error has been seen before
    let report = this.errorReports.get(errorId);

    if (report) {
      // Update existing report
      report.occurrenceCount++;
      report.lastOccurrence = fullContext.timestamp;
      report.context = fullContext; // Update with latest context
    } else {
      // Create new report
      report = {
        id: errorId,
        error,
        context: fullContext,
        resolved: false,
        occurrenceCount: 1,
        firstOccurrence: fullContext.timestamp,
        lastOccurrence: fullContext.timestamp
      };

      this.errorReports.set(errorId, report);
    }

    // Log the error with full context
    console.error('Global error captured', {
      errorId: report.id,
      occurrenceCount: report.occurrenceCount,
      ...fullContext
    });

    return report;
  }

  private generateErrorId(error: Error): string {
    const message = error.message || 'Unknown error';
    const stack = error.stack || '';
    
    // Create a hash-like ID from error characteristics
    const errorSignature = `${error.constructor.name}-${message}-${stack.split('\n')[1] || ''}`;
    return btoa(errorSignature).substring(0, 16);
  }

  private escalateError(report: ErrorReport): void {
    console.error('Critical error escalated', {
      errorId: report.id,
      occurrenceCount: report.occurrenceCount
    });
  }

  getErrorReports(filters?: {
    resolved?: boolean;
    minOccurrences?: number;
  }): ErrorReport[] {
    let reports = Array.from(this.errorReports.values());

    if (filters) {
      if (filters.resolved !== undefined) {
        reports = reports.filter(r => r.resolved === filters.resolved);
      }
      if (filters.minOccurrences) {
        reports = reports.filter(r => r.occurrenceCount >= filters.minOccurrences!);
      }
    }

    return reports.sort((a, b) => 
      new Date(b.lastOccurrence).getTime() - new Date(a.lastOccurrence).getTime()
    );
  }

  getSystemHealth(): {
    totalErrors: number;
    unresolvedErrors: number;
  } {
    const reports = Array.from(this.errorReports.values());
    
    const unresolvedErrors = reports.filter(r => !r.resolved).length;

    return {
      totalErrors: reports.length,
      unresolvedErrors
    };
  }
}

export const globalErrorHandler = new GlobalErrorHandler();

// Auto-initialize
if (typeof window !== 'undefined') {
  globalErrorHandler.initialize();
} else if (typeof process !== 'undefined') {
  globalErrorHandler.initialize();
}

export async function handleError(
  error: unknown,
  context?: { requestId?: string; operation?: string }
): Promise<NextResponse> {
  const timestamp = new Date().toISOString();
  const requestId = context?.requestId || 'unknown';

  if (error instanceof Error) {
    try {
      const errorContext: Partial<ErrorContext> = {
        requestId,
        timestamp,
        additionalData: { operation: context?.operation || 'unknown' }
      };
      
      await globalErrorHandler.handleError(error, errorContext);
    } catch (diagnosisError) {
      console.error('Failed to handle error', diagnosisError);
    }
  }

  // Log the error with full context
  console.error(
    'Request failed',
    {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      operation: context?.operation || 'unknown'
    }
  );

  // Handle different error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
        requestId,
        timestamp,
        details: error.details
      } as ErrorResponse,
      { 
        status: error.statusCode,
        headers: { 'X-Request-ID': requestId }
      }
    );
  }

  if (error instanceof ZodError) {
    console.warn('Validation error', {
      errors: error.errors,
      issues: error.issues
    });

    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        requestId,
        timestamp,
        details: error.errors
      } as ErrorResponse,
      { 
        status: 400,
        headers: { 'X-Request-ID': requestId }
      }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('Database error', {
      code: error.code,
      meta: error.meta
    });

    let message = 'Database operation failed';
    let statusCode = 500;
    let errorCode = 'DATABASE_ERROR';

    switch (error.code) {
      case 'P2002':
        message = 'Unique constraint violation';
        statusCode = 409;
        errorCode = 'DUPLICATE_ENTRY';
        break;
      case 'P2025':
        message = 'Record not found';
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        break;
      case 'P2003':
        message = 'Foreign key constraint violation';
        statusCode = 400;
        errorCode = 'INVALID_REFERENCE';
        break;
    }

    return NextResponse.json(
      {
        error: errorCode,
        message,
        requestId,
        timestamp,
        details: process.env.NODE_ENV === 'development' ? error.meta : undefined
      } as ErrorResponse,
      { 
        status: statusCode,
        headers: { 'X-Request-ID': requestId }
      }
    );
  }

  if (error instanceof Error) {
    // Check for specific error messages
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId,
          timestamp
        } as ErrorResponse,
        { 
          status: 401,
          headers: { 'X-Request-ID': requestId }
        }
      );
    }

    if (error.message.includes('Forbidden') || error.message.includes('permission')) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          requestId,
          timestamp
        } as ErrorResponse,
        { 
          status: 403,
          headers: { 'X-Request-ID': requestId }
        }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        requestId,
        timestamp
      } as ErrorResponse,
      { 
        status: 500,
        headers: { 'X-Request-ID': requestId }
      }
    );
  }

  // Unknown error type
  console.error('Unknown error type', { errorType: typeof error });

  return NextResponse.json(
    {
      error: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      requestId,
      timestamp
    } as ErrorResponse,
    { 
      status: 500,
      headers: { 'X-Request-ID': requestId }
    }
  );
}

// Error handler for async operations
export function asyncHandler<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  _context?: unknown
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
} catch {      throw error;
    }
  }) as T;
}

// Performance monitoring wrapper
export async function withPerformanceLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: unknown
): Promise<T> {
  const startTime = Date.now();
  
  console.warn(`Starting ${operation}`, context);
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    console.warn(`Completed ${operation}`, {
      duration: `${duration}ms`,
      success: true,
      ...context
    });
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${operation}`, {
        duration: `${duration}ms`,
        threshold: '1000ms',
        ...context
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error handling error:', error);
    console.warn('Error handling failed', {
      duration: `${duration}ms`,
      success: false,
      ...context
    });
    
    throw error;
  }
}