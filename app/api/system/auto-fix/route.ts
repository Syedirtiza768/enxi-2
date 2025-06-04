import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication (optional - could be admin only)
    let user;
    try {
      user = await getUserFromRequest(request);
      console.log('Auto-fix initiated by user', { userId: user.id });
    } catch {
      // Allow in development mode
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({
          error: 'Authentication required',
          message: 'Auto-fix operations require authentication'
        }, { status: 401 });
      }
      console.log('Auto-fix initiated in development mode');
    }

    // Auto-fix functionality has been removed
    return NextResponse.json({
      error: 'Feature not available',
      message: 'Auto-fix functionality has been deprecated and removed'
    }, { status: 501 });

  } catch (error) {
    console.error('Auto-fix operation failed', error);
    
    return NextResponse.json({
      error: 'Auto-fix operation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get auto-fix status and available fixes
export async function GET(request: NextRequest) {
  try {
    // Auto-fix functionality has been removed
    return NextResponse.json({
      error: 'Feature not available',
      message: 'Auto-fix functionality has been deprecated and removed',
      timestamp: new Date().toISOString()
    }, { status: 501 });

  } catch (error) {
    console.error('Failed to get auto-fix status', error);
    
    return NextResponse.json({
      error: 'Failed to get auto-fix status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}