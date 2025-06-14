import { NextRequest, NextResponse } from 'next/server';
import { withUniversalErrorHandling } from '@/lib/middleware/universal-error-wrapper';
import { getUserFromRequest } from '@/lib/utils/auth';

const testAuthHandler = async (request: NextRequest): void => {
  const user = await getUserFromRequest(request);
  
  return NextResponse.json({ 
    message: 'Test auth wrapper working',
    timestamp: new Date().toISOString(),
    method: request.method,
    user: {
      id: user.id,
      username: user.username
    }
  });
};

export const GET = withUniversalErrorHandling(testAuthHandler, '/api/test-auth-wrapper', { operation: 'GET test-auth-wrapper' });