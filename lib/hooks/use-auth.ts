'use client'

import { useState, useEffect, createContext, useContext, ReactNode, createElement } from 'react'
import { useRouter } from 'next/navigation'
import { UserResponse } from '@/lib/validators/auth.validator'

interface AuthContextType {
  user: UserResponse | null
  isLoading: boolean
  login: (token: string, user: UserResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }): unknown {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated using the validation endpoint
    // This will use the httpOnly cookie automatically
    fetch('/api/auth/validate', {
      credentials: 'include' // Important: include cookies
    })
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        throw new Error('Not authenticated')
      })
      .then((data) => {
        if (data.valid && data.user) {
          setUser(data.user)
        } else {
          setUser(null)
        }
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = (token: string, userData: UserResponse): void => {
    // The server already sets the httpOnly cookie, so we just need to:
    // 1. Store token in localStorage for API client (if needed)
    localStorage.setItem('auth-token', token)
    // 2. Update user state
    setUser(userData)
    // No need to manually set cookie - server handles it
  }

  const logout = async (): Promise<void> => {
    // Call logout endpoint to clear server-side session
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    // Clear client state
    localStorage.removeItem('auth-token')
    setUser(null)
    router.push('/login')
  }

  return createElement(AuthContext.Provider, {
    value: { user, isLoading, login, logout }
  }, children)
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}