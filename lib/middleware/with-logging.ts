import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Higher-order function to wrap all API routes with logging and error handling
export function withLogging<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  options?: {
    operation?: string;
    skipAuth?: boolean;
  }
): T {
  return (async (req: NextRequest, ...args: unknown[]): void => {
    const requestId = uuidv4();
    const _context = {
      requestId,
      operation: options?.operation || 'unknown',
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    };

    try {
      return await handler(req, ...args);
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }) as T
}