'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  User, 
  Shield, 
  Settings,
  Check,
  X,
  Plus,
  Minus,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

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
    department?: string
    jobTitle?: string
    phone?: string
  }
  _count?: {
    sessions: number
  }
}

interface Permission {
  id: string
  code: string
  name: string
  module: string
  action: string
  description: string
}

interface UserPermission {
  id: string
  permission: Permission
  granted: boolean
}

export default function UserDetailPage() {
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [bulkUpdating, setBulkUpdating] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchUserData()
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      // Fetch user details, permissions, and user-specific permissions
      const [userResponse, permissionsResponse, userPermissionsResponse] = await Promise.all([
        apiClient(`/api/users/${userId}`),
        apiClient('/api/permissions'),
        apiClient(`/api/users/${userId}/permissions`)
      ])

      if (userResponse.ok && userResponse.data) {
        setUser(userResponse.data)
      } else {
        throw new Error('Failed to fetch user details')
      }

      if (permissionsResponse.ok && permissionsResponse.data) {
        setPermissions(permissionsResponse.data.permissions || [])
      }

      if (userPermissionsResponse.ok && userPermissionsResponse.data) {
        setUserPermissions(userPermissionsResponse.data.userPermissions || [])
        setRolePermissions(userPermissionsResponse.data.rolePermissions || [])
      }
    } catch (err) {
      console.error('Error fetching user data:', { method: 'POST', body: JSON.stringify(err) })
      setError(err instanceof Error ? err.message : 'Failed to fetch user data')
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (permissionCode: string): 'role' | 'user' | 'denied' | 'revoked' => {
    // Check if user has this permission through role
    const hasRolePermission = rolePermissions.includes(permissionCode)
    
    // Check if user has specific grant/revoke for this permission
    const userPermission = userPermissions.find(up => up.permission.code === permissionCode)
    
    if (userPermission) {
      return userPermission.granted ? 'user' : 'revoked'
    }
    
    return hasRolePermission ? 'role' : 'denied'
  }

  const togglePermission = async (permissionCode: string) => {
    try {
      setUpdating(true)
      const currentStatus = hasPermission(permissionCode)
      
      let response
      if (currentStatus === 'denied' || currentStatus === 'revoked') {
        // Grant permission
        response = await apiClient(`/api/users/${userId}/permissions`, { method: 'POST', body: JSON.stringify({
          permissionCode,
          granted: true
        }) })
      } else {
        // Revoke permission (if it's from role) or remove user-specific permission
        if (currentStatus === 'role') {
          response = await apiClient(`/api/users/${userId}/permissions`, { method: 'POST', body: JSON.stringify({
            permissionCode,
            granted: false
          }) })
        } else {
          response = await apiClient(`/api/users/${userId}/permissions/${permissionCode}`)
        }
      }

      if (response.ok) {
        await fetchUserData() // Refresh data
      } else {
        throw new Error('Failed to update permission')
      }
    } catch (err) {
      console.error('Error updating permission:', { method: 'POST', body: JSON.stringify(err) })
      // You might want to show a toast notification here
    } finally {
      setUpdating(false)
    }
  }

  const getPermissionBadge = (permissionCode: string) => {
    const status = hasPermission(permissionCode)
    
    switch (status) {
      case 'role':
        return <Badge className="bg-blue-100 text-blue-800">Role</Badge>
      case 'user':
        return <Badge className="bg-green-100 text-green-800">Granted</Badge>
      case 'revoked':
        return <Badge className="bg-red-100 text-red-800">Revoked</Badge>
      case 'denied':
        return <Badge className="bg-gray-100 text-gray-800">Denied</Badge>
    }
  }

  const getPermissionIcon = (permissionCode: string) => {
    const status = hasPermission(permissionCode)
    
    switch (status) {
      case 'role':
      case 'user':
        return <Check className="w-4 h-4 text-green-600" />
      case 'revoked':
      case 'denied':
        return <X className="w-4 h-4 text-red-600" />
    }
  }

  const getToggleButton = (permissionCode: string) => {
    const status = hasPermission(permissionCode)
    const isAllowed = status === 'role' || status === 'user'
    
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => togglePermission(permissionCode)}
        disabled={updating}
        className="flex items-center space-x-1"
      >
        {isAllowed ? (
          <>
            <Minus className="w-3 h-3" />
            <span>Revoke</span>
          </>
        ) : (
          <>
            <Plus className="w-3 h-3" />
            <span>Grant</span>
          </>
        )}
      </Button>
    )
  }

  const toggleModule = (module: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }))
  }

  const bulkToggleModule = async (module: string, grant: boolean) => {
    try {
      setBulkUpdating(true)
      const modulePermissions = permissions.filter(p => p.module === module)
      
      // Process all permissions in the module
      for (const permission of modulePermissions) {
        const currentStatus = hasPermission(permission.code)
        
        if (grant) {
          // Grant permission if not already granted
          if (currentStatus === 'denied' || currentStatus === 'revoked') {
            await apiClient(`/api/users/${userId}/permissions`, { method: 'POST', body: JSON.stringify({
              permissionCode: permission.code,
              granted: true
            }) })
          }
        } else {
          // Revoke permission if currently granted
          if (currentStatus === 'role' || currentStatus === 'user') {
            if (currentStatus === 'role') {
              await apiClient(`/api/users/${userId}/permissions`, { method: 'POST', body: JSON.stringify({
                permissionCode: permission.code,
                granted: false
              }) })
            } else {
              await apiClient(`/api/users/${userId}/permissions/${permission.code}`)
            }
          }
        }
      }
      
      await fetchUserData() // Refresh data
    } catch (err) {
      console.error('Error bulk updating module permissions:', { method: 'POST', body: JSON.stringify(err) })
    } finally {
      setBulkUpdating(false)
    }
  }

  const bulkToggleAll = async (grant: boolean) => {
    try {
      setBulkUpdating(true)
      
      // Process all permissions
      for (const permission of permissions) {
        const currentStatus = hasPermission(permission.code)
        
        if (grant) {
          // Grant permission if not already granted
          if (currentStatus === 'denied' || currentStatus === 'revoked') {
            await apiClient(`/api/users/${userId}/permissions`, { method: 'POST', body: JSON.stringify({
              permissionCode: permission.code,
              granted: true
            }) })
          }
        } else {
          // Revoke permission if currently granted
          if (currentStatus === 'role' || currentStatus === 'user') {
            if (currentStatus === 'role') {
              await apiClient(`/api/users/${userId}/permissions`, { method: 'POST', body: JSON.stringify({
                permissionCode: permission.code,
                granted: false
              }) })
            } else {
              await apiClient(`/api/users/${userId}/permissions/${permission.code}`)
            }
          }
        }
      }
      
      await fetchUserData() // Refresh data
    } catch (err) {
      console.error('Error bulk updating all permissions:', { method: 'POST', body: JSON.stringify(err) })
    } finally {
      setBulkUpdating(false)
    }
  }

  const getModulePermissionStatus = (module: string) => {
    const modulePermissions = permissions.filter(p => p.module === module)
    const grantedCount = modulePermissions.filter(p => {
      const status = hasPermission(p.code)
      return status === 'role' || status === 'user'
    }).length
    
    if (grantedCount === 0) return 'none'
    if (grantedCount === modulePermissions.length) return 'all'
    return 'partial'
  }

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

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
        <Button onClick={() => window.location.href = '/users'}>
          Back to Users
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/users'}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Users</span>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {user.profile?.firstName && user.profile?.lastName
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user.username}
            </h1>
            <p className="mt-1 text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
        <Button
          onClick={() => window.location.href = `/users/${userId}/edit`}
          className="flex items-center space-x-2"
        >
          <Settings className="w-4 h-4" />
          <span>Edit User</span>
        </Button>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Details</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Permissions</span>
          </TabsTrigger>
        </TabsList>

        {/* User Details Tab */}
        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Username</label>
                  <p className="text-gray-900">{user.username}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <div>
                    <Badge className="bg-blue-100 text-blue-800">{user.role}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div>
                    <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {user.profile && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user.profile.firstName && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">First Name</label>
                      <p className="text-gray-900">{user.profile.firstName}</p>
                    </div>
                  )}
                  {user.profile.lastName && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Name</label>
                      <p className="text-gray-900">{user.profile.lastName}</p>
                    </div>
                  )}
                  {user.profile.jobTitle && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Job Title</label>
                      <p className="text-gray-900">{user.profile.jobTitle}</p>
                    </div>
                  )}
                  {user.profile.department && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Department</label>
                      <p className="text-gray-900">{user.profile.department}</p>
                    </div>
                  )}
                  {user.profile.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-gray-900">{user.profile.phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Permission Management</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Manage individual permissions for this user. Role permissions are inherited automatically.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => bulkToggleAll(true)}
                      disabled={bulkUpdating || updating}
                      size="sm"
                      variant="outline"
                      className="flex items-center space-x-1"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Grant All</span>
                    </Button>
                    <Button
                      onClick={() => bulkToggleAll(false)}
                      disabled={bulkUpdating || updating}
                      size="sm"
                      variant="outline"
                      className="flex items-center space-x-1"
                    >
                      <Square className="w-4 h-4" />
                      <span>Revoke All</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
                    const isExpanded = expandedModules[module] ?? true
                    const moduleStatus = getModulePermissionStatus(module)
                    
                    return (
                      <div key={module} className="border rounded-lg overflow-hidden">
                        {/* Module Header */}
                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => toggleModule(module)}
                              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                              <h3 className="text-lg font-medium capitalize">{module}</h3>
                            </button>
                            <Badge variant="outline" className="text-xs">
                              {modulePermissions.length} permissions
                            </Badge>
                            {moduleStatus === 'all' && (
                              <Badge className="bg-green-100 text-green-800 text-xs">All Granted</Badge>
                            )}
                            {moduleStatus === 'partial' && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">Partial</Badge>
                            )}
                            {moduleStatus === 'none' && (
                              <Badge className="bg-gray-100 text-gray-800 text-xs">None</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => bulkToggleModule(module, true)}
                              disabled={bulkUpdating || updating}
                              size="sm"
                              variant="outline"
                              className="flex items-center space-x-1"
                            >
                              <CheckSquare className="w-3 h-3" />
                              <span>Grant All</span>
                            </Button>
                            <Button
                              onClick={() => bulkToggleModule(module, false)}
                              disabled={bulkUpdating || updating}
                              size="sm"
                              variant="outline"
                              className="flex items-center space-x-1"
                            >
                              <Square className="w-3 h-3" />
                              <span>Revoke All</span>
                            </Button>
                          </div>
                        </div>
                        
                        {/* Module Permissions */}
                        {isExpanded && (
                          <div className="divide-y">
                            {modulePermissions.map((permission) => (
                              <div
                                key={permission.code}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  {getPermissionIcon(permission.code)}
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium text-gray-900">{permission.name}</h4>
                                      {getPermissionBadge(permission.code)}
                                    </div>
                                    <p className="text-sm text-gray-600">{permission.description}</p>
                                    <p className="text-xs text-gray-400 font-mono">{permission.code}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {getToggleButton(permission.code)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {/* Loading/Updating Overlay */}
                  {(bulkUpdating || updating) && (
                    <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-gray-700">
                          {bulkUpdating ? 'Updating permissions...' : 'Updating permission...'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}