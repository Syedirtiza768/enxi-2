import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth.service'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Missing authorization header' },
      { status: 401 }
    )
  }

  const token = authHeader.replace('Bearer ', '')
  const authService = new AuthService()
  const decoded = authService.verifyToken(token)

  if (!decoded) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }

  const user = await authService.getUserById(decoded.id)

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(user)
}