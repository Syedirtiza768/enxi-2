'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api/client'
import { UserEditForm } from '@/components/users/user-edit-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  profile?: {
    firstName?: string
    lastName?: string
    phone?: string
    department?: string
    jobTitle?: string
  }
}

export default function UserEditPage() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      fetchUser()
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUser = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.get(`/api/users/${userId}`)
      
      if (response.ok && response.data) {
        setUser(response.data)
      } else {
        throw new Error('Failed to fetch user details')
      }
    } catch (err) {
      console.error('Error fetching user:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch user')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (updatedUser: User) => {
    setUser(updatedUser)
    // Navigate back to user detail page after successful save
    setTimeout(() => {
      router.push(`/users/${userId}`)
    }, 1500)
  }

  const handleCancel = () => {
    router.push(`/users/${userId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'User not found'}</p>
        <Button onClick={() => router.push('/users')}>
          Back to Users
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/users/${userId}`)}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to User Details</span>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Edit User: {user.profile?.firstName && user.profile?.lastName
              ? `${user.profile.firstName} ${user.profile.lastName}`
              : user.username}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Update user information, role, and status
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <UserEditForm
        user={user}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}