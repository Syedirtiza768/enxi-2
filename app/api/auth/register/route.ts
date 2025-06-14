import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth.service'
import { createUserSchema } from '@/lib/validators/auth.validator'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    const authService = new AuthService()
    const user = await authService.createUser(validatedData)
    const token = authService.generateToken(user)

    return NextResponse.json(
      {
        token,
        user,
      },
      { status: 201 }
    )
} catch (error) {
    console.error('Error:', error)
    
    if (error instanceof Error && error.message === 'Username already exists') {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}