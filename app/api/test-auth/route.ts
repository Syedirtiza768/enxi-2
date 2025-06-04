import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('=== AUTH TEST START ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Cookies:', Array.from(request.cookies.keys()));
    
    const user = await getUserFromRequest(request);
    
    console.log('Auth successful:', user);
    console.log('=== AUTH TEST SUCCESS ===');
    
    return NextResponse.json({
      success: true,
      user,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.log('Auth failed:', error.message);
    console.log('=== AUTH TEST FAILED ===');
    
    return NextResponse.json({
      success: false,
      error: error.message,
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
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}