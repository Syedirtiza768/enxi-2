import { NextRequest, NextResponse } from 'next/server';
import { withUniversalErrorHandling } from '@/lib/middleware/universal-error-wrapper';

const testHandler = async (request: NextRequest): void => {
  return NextResponse.json({ 
    message: 'Test wrapper working',
    timestamp: new Date().toISOString(),
    method: request.method
  });
};

export const GET = withUniversalErrorHandling(testHandler, '/api/test-wrapper', { operation: 'GET test-wrapper' });