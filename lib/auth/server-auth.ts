import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { AuthService } from '../services/auth.service'

export async function getServerUser() {
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
    redirect('/login')
  }
}

export async function requireAuth() {
  return await getServerUser()
}

export async function verifyJWTFromRequest(request: NextRequest) {
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
    return null
  }
}