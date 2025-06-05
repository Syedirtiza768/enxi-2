'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api/client'
import { Role } from '@/lib/generated/prisma'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search, 
  Plus, 
  UserCheck, 
  UserX, 
  Shield, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
  role: Role
  isActive: boolean
  createdAt: string
  profile?: {
    firstName?: string
    lastName?: string
    department?: string
    jobTitle?: string
  }
  _count?: {
    sessions: number
  }
}

interface UserListResponse {
  data: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function UserList() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const limit = 20

  useEffect(() => {
    fetchUsers()
  }, [page, roleFilter, statusFilter, fetchUsers])

  useEffect(() => {
    // Reset to page 1 when search changes
    if (page !== 1) {
      setPage(1)
    } else {
      fetchUsers()
    }
  }, [search, page, fetchUsers])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (search) params.append('search', search)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (statusFilter !== 'all') params.append('isActive', statusFilter)

      const response = await api.get<UserListResponse>(`/api/users?${params}`)
      
      if (response.ok && response.data) {
        setUsers(response.data.data)
        setTotal(response.data.total)
        setTotalPages(response.data.totalPages)
      } else {
        throw new Error(response.error || 'Failed to fetch users')
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter, statusFilter, limit])

  const getRoleBadge = (role: Role) => {
    const roleConfig = {
      SUPER_ADMIN: { label: 'Super Admin', color: 'bg-red-100 text-red-800' },
      ADMIN: { label: 'Admin', color: 'bg-purple-100 text-purple-800' },
      MANAGER: { label: 'Manager', color: 'bg-blue-100 text-blue-800' },
      SALES_REP: { label: 'Sales Rep', color: 'bg-green-100 text-green-800' },
      ACCOUNTANT: { label: 'Accountant', color: 'bg-yellow-100 text-yellow-800' },
      WAREHOUSE: { label: 'Warehouse', color: 'bg-orange-100 text-orange-800' },
      VIEWER: { label: 'Viewer', color: 'bg-gray-100 text-gray-800' },
      USER: { label: 'User', color: 'bg-gray-100 text-gray-800' },
    }

    const config = roleConfig[role] || { label: role, color: 'bg-gray-100 text-gray-800' }
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
        {isActive ? (
          <>
            <UserCheck className="w-3 h-3 mr-1" />
            Active
          </>
        ) : (
          <>
            <UserX className="w-3 h-3 mr-1" />
            Inactive
          </>
        )}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getDisplayName = (user: User) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
    }
    return user.username
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push('/roles')}
            className="flex items-center space-x-2"
          >
            <Shield className="w-4 h-4" />
            <span>Manage Roles</span>
          </Button>
          <Button
            onClick={() => router.push('/users/new')}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="SALES_REP">Sales Rep</SelectItem>
                <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
                <SelectItem value="USER">User</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Stats */}
            <div className="text-sm text-gray-600 flex items-center">
              Showing {users.length} of {total} users
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="mb-4">{error}</p>
              <Button onClick={fetchUsers} variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      {!error && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">
                          {getDisplayName(user)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                        {user.profile?.jobTitle && (
                          <div className="text-xs text-gray-400">
                            {user.profile.jobTitle}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-900">
                        {user.profile?.department || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.isActive)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {user._count?.sessions || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/users/${user.id}`)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {users.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Shield className="mx-auto h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No users found
                </h3>
                <p className="text-gray-600 mb-6">
                  {search || roleFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first user'}
                </p>
                {!search && roleFilter === 'all' && statusFilter === 'all' && (
                  <Button onClick={() => router.push('/users/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}