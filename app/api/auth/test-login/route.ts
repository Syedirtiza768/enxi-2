import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    console.log('Test login request:', body)
    
    // Check if database is connected
    try {
      const userCount = await prisma.user.count()
      console.log('Total users in database:', userCount)
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 })
    }
    
    // Try to find user
    const user = await prisma.user.findUnique({
      where: { username: body.username }
    })
    
    if (!user) {
      console.log('User not found:', body.username)
      // List all users for debugging
      const allUsers = await prisma.user.findMany({
        select: { username: true, email: true }
      })
      console.log('Available users:', allUsers)
      
      return NextResponse.json({ 
        error: 'User not found',
        availableUsers: allUsers 
      }, { status: 404 })
    }
    
    // Check password
    const isValid = await bcrypt.compare(body.password, user.password)
    console.log('Password validation result:', isValid)
    
    if (!isValid) {
      return NextResponse.json({ 
        error: 'Invalid password' 
      }, { status: 401 })
    }
    
    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not set!')
      return NextResponse.json({ 
        error: 'Server configuration error: JWT_SECRET missing' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      message: 'Test login successful'
    })
    
  } catch (error) {
    console.error('Test login error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}