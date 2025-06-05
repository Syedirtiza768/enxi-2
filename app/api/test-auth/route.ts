import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  try {
    console.warn('=== AUTH TEST START ===');
    console.warn('NODE_ENV:', process.env.NODE_ENV);
    console.warn('Headers:', Object.fromEntries(request.headers.entries()));
    console.warn('Cookies:', Array.from(request.cookies.keys()));
    
    const user = await getUserFromRequest(request);
    
    console.warn('Auth successful:', user);
    console.warn('=== AUTH TEST SUCCESS ===');
    
    return NextResponse.json({
      success: true,
      user,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.warn('Auth failed:', error instanceof Error ? error.message : String(error));
    console.warn('=== AUTH TEST FAILED ===');
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    return NextResponse.json({
      success: true,
      echo: body,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}