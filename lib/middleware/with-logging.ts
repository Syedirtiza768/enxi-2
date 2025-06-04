import { NextRequest } from 'next/server';
import { handleError } from '@/lib/utils/global-error-handler';
import { v4 as uuidv4 } from 'uuid';

// Higher-order function to wrap all API routes with logging and error handling
export function withLogging<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  options?: {
    operation?: string;
    skipAuth?: boolean;
  }
): T {
  return (async (req: NextRequest, ...args: any[]) => {
    const requestId = uuidv4();
    const context = {
      requestId,
      operation: options?.operation || 'unknown',
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    };

    try {
      return await handler(req, ...args);
    } catch (error) {
      return handleError(error, context);
    }
  }) as T;
}