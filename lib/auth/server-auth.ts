import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { AuthService } from '../services/auth.service'

export async function getServerUser(): Promise<T | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value

  if (!token) {
    redirect('/login')
  }

  try {
    const authService = new AuthService()
    const user = authService.verifyToken(token)
    
    if (!user) {
      redirect('/login')
    }

    return user
  } catch (error) {
    console.error('Server auth error:', error)
    return null
  }
}

export async function requireAuth(): Promise<unknown> {
  return await getServerUser()
}

export async function verifyJWTFromRequest(request: NextRequest): Promise<unknown> {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization')
    let token: string | undefined

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      // Fallback to cookie
      const cookieStore = await cookies()
      token = cookieStore.get('auth-token')?.value
    }

    if (!token) {
      return null
    }

    const authService = new AuthService()
    const user = authService.verifyToken(token)
    
    return user || null
  } catch (error) {
    console.error('Get server user error:', error)
    return null
  }
}