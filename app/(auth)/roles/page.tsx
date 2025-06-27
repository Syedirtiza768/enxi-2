'use client'

import type { Permission } from "@prisma/client"

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  Check,
  X,
  Plus,
  Minus,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Role } from '@/lib/types/shared-enums'

// Permission moved to common types

const roleDescriptions: Record<Role, string> = {
  SUPER_ADMIN: 'Full system access with all permissions',
  ADMIN: 'Administrative access with most permissions',
  MANAGER: 'Management access for teams and reporting',
  SALES_REP: 'Sales operations and customer management',
  ACCOUNTANT: 'Financial and accounting operations',
  WAREHOUSE: 'Inventory and warehouse management',
  VIEWER: 'Read-only access to most areas',
  USER: 'Basic user with limited permissions'
}

export default function RolesPage(): React.JSX.Element {
  const [selectedRole, setSelectedRole] = useState<Role>(Role.ADMIN)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<Record<Role, string[]>>({} as Record<Role, string[]>)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [bulkUpdating, setBulkUpdating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all permissions and role permissions
      const [permissionsResponse, rolesResponse] = await Promise.all([
        apiClient('/api/permissions'),
        apiClient('/api/roles/permissions')
      ])

      if (permissionsResponse.ok && permissionsResponse.data) {
        setPermissions(permissionsResponse.data.permissions || [])
      } else {
        throw new Error('Failed to fetch permissions')
      }

      if (rolesResponse.ok && rolesResponse.data) {
        setRolePermissions(rolesResponse.data)
      } else {
        throw new Error('Failed to fetch role permissions')
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (role: Role, permissionCode: string): boolean => {
    return rolePermissions[role]?.includes(permissionCode) || false
  }

  const togglePermission = async (role: Role, permissionCode: string): Promise<void> => {
    try {
      setUpdating(true)
      const currentlyHas = hasPermission(role, permissionCode)
      
      const response = await apiClient(`/api/roles/${role}/permissions`, { method: 'POST', body: JSON.stringify({
        permissionCode,
        granted: !currentlyHas
      }) })

      if (response.ok) {
        await fetchData() // Refresh data
      } else {
        throw new Error('Failed to update permission')
      }
    } catch (err) {
      console.error('Error updating permission:', err)
      setError('Failed to update permission')
    } finally {
      setUpdating(false)
    }
  }

  const getPermissionIcon = (role: Role, permissionCode: string): JSX.Element => {
    const hasIt = hasPermission(role, permissionCode)
    return hasIt ? (
      <Check className="w-4 h-4 text-green-600" />
    ) : (
      <X className="w-4 h-4 text-red-600" />
    )
  }

  const getToggleButton = (role: Role, permissionCode: string): JSX.Element => {
    const hasIt = hasPermission(role, permissionCode)
    
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(): void => togglePermission(role, permissionCode)}
        disabled={updating || role === Role.SUPER_ADMIN} // SUPER_ADMIN always has all permissions
        className="flex items-center space-x-1"
      >
        {hasIt ? (
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

  const toggleModule = (module: string): void => {
    setExpandedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }))
  }

  const bulkToggleModule = async (role: Role, module: string, grant: boolean): Promise<void> => {
    try {
      setBulkUpdating(true)
      const modulePermissions = permissions.filter(p => p.module === module)
      
      // Process all permissions in the module
      for (const permission of modulePermissions) {
        const currentlyHas = hasPermission(role, permission.code)
        
        if (grant && !currentlyHas) {
          await apiClient(`/api/roles/${role}/permissions`, { method: 'POST', body: JSON.stringify({
            permissionCode: permission.code,
            granted: true
          }) })
        } else if (!grant && currentlyHas) {
          await apiClient(`/api/roles/${role}/permissions`, { method: 'POST', body: JSON.stringify({
            permissionCode: permission.code,
            granted: false
          }) })
        }
      }
      
      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error bulk updating module permissions:', err)
      setError('Failed to update module permissions')
    } finally {
      setBulkUpdating(false)
    }
  }

  const bulkToggleAll = async (role: Role, grant: boolean): Promise<void> => {
    try {
      setBulkUpdating(true)
      
      // Process all permissions
      for (const permission of permissions) {
        const currentlyHas = hasPermission(role, permission.code)
        
        if (grant && !currentlyHas) {
          await apiClient(`/api/roles/${role}/permissions`, { method: 'POST', body: JSON.stringify({
            permissionCode: permission.code,
            granted: true
          }) })
        } else if (!grant && currentlyHas) {
          await apiClient(`/api/roles/${role}/permissions`, { method: 'POST', body: JSON.stringify({
            permissionCode: permission.code,
            granted: false
          }) })
        }
      }
      
      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error bulk updating all permissions:', err)
      setError('Failed to update all permissions')
    } finally {
      setBulkUpdating(false)
    }
  }

  const getModulePermissionStatus = (role: Role, module: string): string => {
    const modulePermissions = permissions.filter(p => p.module === module)
    const grantedCount = modulePermissions.filter(p => hasPermission(role, p.code)).length
    
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
          <p className="text-gray-600">Loading role permissions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => fetchData()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Role Permissions</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage permissions for each role in the system. Changes affect all users with that role.
        </p>
      </div>

      <Tabs value={selectedRole} onValueChange={(value): void => setSelectedRole(value as Role)}>
        <TabsList className="grid grid-cols-4 w-full lg:w-auto lg:flex">
          {Object.values(Role).map((role) => (
            <TabsTrigger key={role} value={role} className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>{role.replace('_', ' ')}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.values(Role).map((role) => (
          <TabsContent key={role} value={role}>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{role.replace('_', ' ')} Permissions</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {roleDescriptions[role]}
                      </p>
                    </div>
                    {role !== Role.SUPER_ADMIN && (
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={(): void => bulkToggleAll(role, true)}
                          disabled={bulkUpdating || updating}
                          size="sm"
                          variant="outline"
                          className="flex items-center space-x-1"
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span>Grant All</span>
                        </Button>
                        <Button
                          onClick={(): void => bulkToggleAll(role, false)}
                          disabled={bulkUpdating || updating}
                          size="sm"
                          variant="outline"
                          className="flex items-center space-x-1"
                        >
                          <Square className="w-4 h-4" />
                          <span>Revoke All</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {role === Role.SUPER_ADMIN ? (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>Super Admin has all permissions by default and cannot be modified.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
                        const isExpanded = expandedModules[module] ?? true
                        const moduleStatus = getModulePermissionStatus(role, module)
                        
                        return (
                          <div key={module} className="border rounded-lg overflow-hidden">
                            {/* Module Header */}
                            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={(): void => toggleModule(module)}
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
                                  onClick={(): void => bulkToggleModule(role, module, true)}
                                  disabled={bulkUpdating || updating}
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center space-x-1"
                                >
                                  <CheckSquare className="w-3 h-3" />
                                  <span>Grant All</span>
                                </Button>
                                <Button
                                  onClick={(): void => bulkToggleModule(role, module, false)}
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
                                      {getPermissionIcon(role, permission.code)}
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <h4 className="font-medium text-gray-900">{permission.name}</h4>
                                        </div>
                                        <p className="text-sm text-gray-600">{permission.description}</p>
                                        <p className="text-xs text-gray-400 font-mono">{permission.code}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {getToggleButton(role, permission.code)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
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
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}