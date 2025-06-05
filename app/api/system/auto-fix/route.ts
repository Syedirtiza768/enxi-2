import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication (optional - could be admin only)
    try {
      const _user = await getUserFromRequest(request);
      console.warn('Auto-fix initiated by user', { userId: _user.id });
    } catch {
      // Allow in development mode
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({
          error: 'Authentication required',
          message: 'Auto-fix operations require authentication'
        }, { status: 401 });
      }
      console.warn('Auto-fix initiated in development mode');
    }

    // Auto-fix functionality has been removed
    return NextResponse.json({
      error: 'Feature not available',
      message: 'Auto-fix functionality has been deprecated and removed'
    }, { status: 501 });

} catch (error) {
      console.error('Error:', error);
    }
}

// Get auto-fix status and available fixes
export async function GET(_request: NextRequest) {
  try {
    // Auto-fix functionality has been removed
    return NextResponse.json({
      error: 'Feature not available',
      message: 'Auto-fix functionality has been deprecated and removed',
      timestamp: new Date().toISOString()
    }, { status: 501 });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Auto-fix operation failed' },
      { status: 500 }
    );
  }
}