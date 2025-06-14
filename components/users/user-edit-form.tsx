'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api/client'
import { Role } from '@/lib/types/shared-enums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Save, X, User, Shield, CheckCircle, XCircle } from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
  role: Role
  isActive: boolean
  profile?: {
    firstName?: string
    lastName?: string
    phone?: string
    department?: string
    jobTitle?: string
  }
}

interface UserEditFormProps {
  user: User
  onSave?: (updatedUser: User) => void
  onCancel?: () => void
}

export function UserEditForm({ user, onSave, onCancel }: UserEditFormProps): React.JSX.Element {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    username: user.username || '',
    email: user.email || '',
    role: user.role,
    isActive: user.isActive,
    firstName: user.profile?.firstName || '',
    lastName: user.profile?.lastName || '',
    phone: user.profile?.phone || '',
    department: user.profile?.department || '',
    jobTitle: user.profile?.jobTitle || '',
  })

  const roles = [
    { value: 'SUPER_ADMIN', label: 'Super Admin', color: 'bg-red-100 text-red-800' },
    { value: 'ADMIN', label: 'Admin', color: 'bg-purple-100 text-purple-800' },
    { value: 'MANAGER', label: 'Manager', color: 'bg-blue-100 text-blue-800' },
    { value: 'SALES_REP', label: 'Sales Rep', color: 'bg-green-100 text-green-800' },
    { value: 'ACCOUNTANT', label: 'Accountant', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'WAREHOUSE', label: 'Warehouse', color: 'bg-orange-100 text-orange-800' },
    { value: 'VIEWER', label: 'Viewer', color: 'bg-gray-100 text-gray-800' },
    { value: 'USER', label: 'User', color: 'bg-gray-100 text-gray-800' },
  ]

  const handleInputChange = (field: string, value: string | boolean): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent): void => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const updateData = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        department: formData.department,
        jobTitle: formData.jobTitle,
      }

      const response = await api.put(`/api/users/${user.id}`, updateData)

      if (response.ok && response.data) {
        setSuccess(true)
        const updatedUser = {
          ...user,
          ...response.data,
        }
        
        if (onSave) {
          onSave(updatedUser)
        } else {
          // Navigate back to user detail page
          setTimeout(() => {
            router.push(`/users/${user.id}`)
          }, 1000)
        }
      } else {
        throw new Error(response.error || 'Failed to update user')
      }
    } catch (err) {
      console.error('Error updating user:', err)
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = (): void => {
    if (onCancel) {
      onCancel()
    } else {
      router.push(`/users/${user.id}`)
    }
  }

  const getRoleConfig = (roleValue: string): void => {
    return roles.find(r => r.value === roleValue) || roles.find(r => r.value === 'USER')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Message */}
      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">User updated successfully!</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Basic Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e): void => handleInputChange('username', e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e): void => handleInputChange('email', e.target.value)}
                placeholder="Enter email"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role and Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Role & Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value): void => handleInputChange('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role">
                    <div className="flex items-center space-x-2">
                      <Badge className={getRoleConfig(formData.role)?.color}>
                        {getRoleConfig(formData.role)?.label}
                      </Badge>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center space-x-2">
                        <Badge className={role.color}>
                          {role.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.isActive.toString()} 
                onValueChange={(value): void => handleInputChange('isActive', value === 'true')}
              >
                <SelectTrigger>
                  <SelectValue>
                    <Badge className={formData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </SelectItem>
                  <SelectItem value="false">
                    <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e): void => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e): void => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e): void => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e): void => handleInputChange('department', e.target.value)}
                placeholder="Enter department"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={formData.jobTitle}
              onChange={(e): void => handleInputChange('jobTitle', e.target.value)}
              placeholder="Enter job title"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={loading}
          className="flex items-center space-x-2"
        >
          <X className="w-4 h-4" />
          <span>Cancel</span>
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving...' : 'Save Changes'}</span>
        </Button>
      </div>
    </form>
  )
}