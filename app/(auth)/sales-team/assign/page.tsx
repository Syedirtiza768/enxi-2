'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft, 
  Building,
  Link
} from 'lucide-react'
import { Role } from '@/lib/types/shared-enums'

interface User {
  id: string
  username: string
  email: string
  role: Role
  profile?: {
    firstName?: string
    lastName?: string
  }
}

interface Customer {
  id: string
  customerNumber: string
  name: string
  email: string
  assignedToId?: string
  assignedTo?: {
    id: string
    username: string
    email: string
  }
}

function SalesTeamAssignContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedCustomerId = searchParams.get('customerId')
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Assignment type
  const [assignmentType, setAssignmentType] = useState<'customer' | 'manager'>('customer')
  
  // Lists
  const [salespeople, setSalespeople] = useState<User[]>([])
  const [managers, setManagers] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Selected values
  const [selectedCustomer, setSelectedCustomer] = useState<string>(preselectedCustomerId || '')
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('')
  const [selectedManager, setSelectedManager] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      // Fetch both users and customers in parallel for better performance
      const [usersResponse, customersResponse] = await Promise.all([
        apiClient('/api/users?limit=100'),
        apiClient('/api/customers?limit=100')
      ])

      // Process users response
      if (usersResponse.ok && usersResponse.data) {
        const users = usersResponse.data?.data || usersResponse.data || []
        console.log('Users API response:', {
          data: usersResponse.data,
          dataType: typeof usersResponse.data,
          hasData: !!usersResponse.data?.data,
          directArray: Array.isArray(usersResponse.data),
          extractedUsers: users
        })
        setSalespeople(users.filter((u: User) => u.role === Role.SALES_REP || u.role === Role.MANAGER))
        setManagers(users.filter((u: User) => u.role === Role.MANAGER))
      } else {
        console.error('Failed to fetch users:', {
          error: usersResponse.error,
          status: usersResponse.status,
          errorDetails: usersResponse.errorDetails
        })
      }

      // Process customers response
      if (customersResponse.ok && customersResponse.data) {
        // The API returns { data: customers[], customers: customers[], ... }
        // Extract the customers array properly
        const customersData = customersResponse.data.data || customersResponse.data.customers || []
        console.log('Customers API response:', {
          data: customersResponse.data,
          dataType: typeof customersResponse.data,
          hasData: !!customersResponse.data?.data,
          hasCustomers: !!customersResponse.data?.customers,
          directArray: Array.isArray(customersResponse.data),
          extractedCustomers: customersData,
          customersCount: customersData.length
        })
        setCustomers(customersData)
      } else {
        console.error('Failed to fetch customers:', {
          error: customersResponse.error,
          status: customersResponse.status,
          errorDetails: customersResponse.errorDetails
        })
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerAssignment = async (): Promise<unknown> => {
    if (!selectedCustomer || !selectedSalesperson) {
      setError('Please select both a customer and a salesperson')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const response = await apiClient('/api/sales-team/assign-customer', { method: 'POST', body: JSON.stringify({
        customerId: selectedCustomer,
        salespersonId: selectedSalesperson,
        notes,
      }) })

      if (response.ok) {
        router.push('/sales-team')
      } else {
        throw new Error(response.error || 'Failed to assign customer')
      }
    } catch (err) {
      console.error('Error assigning customer:', err)
      setError(err instanceof Error ? err.message : 'Failed to assign customer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleManagerAssignment = async (): Promise<unknown> => {
    if (!selectedSalesperson || !selectedManager) {
      setError('Please select both a salesperson and a manager')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const response = await apiClient('/api/sales-team/assign-manager', { method: 'POST', body: JSON.stringify({
        salespersonId: selectedSalesperson,
        managerId: selectedManager,
      }) })

      if (response.ok) {
        router.push('/sales-team')
      } else {
        throw new Error(response.error || 'Failed to assign manager')
      }
    } catch (err) {
      console.error('Error assigning manager:', err)
      setError(err instanceof Error ? err.message : 'Failed to assign manager')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (assignmentType === 'customer') {
      handleCustomerAssignment()
    } else {
      handleManagerAssignment()
    }
  }

  const getDisplayName = (user: User) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
    }
    return user.username
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/sales-team')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sales Team</span>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manage Assignments</h1>
          <p className="mt-1 text-sm text-gray-600">
            Assign customers to salespeople or salespeople to managers
          </p>
        </div>
      </div>

      {/* Assignment Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setAssignmentType('customer')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                assignmentType === 'customer'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Building className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="font-medium">Assign Customer</p>
              <p className="text-sm text-gray-600 mt-1">
                Assign a customer to a salesperson
              </p>
            </button>
            <button
              onClick={() => setAssignmentType('manager')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                assignmentType === 'manager'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Link className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="font-medium">Assign Manager</p>
              <p className="text-sm text-gray-600 mt-1">
                Assign a salesperson to a manager
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>
              {assignmentType === 'customer' ? 'Customer Assignment' : 'Manager Assignment'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {assignmentType === 'customer' ? (
              <>
                {/* Customer Selection */}
                <div className="space-y-2">
                  <Label htmlFor="customer">Select Customer</Label>
                  <Select
                    value={selectedCustomer}
                    onValueChange={setSelectedCustomer}
                  >
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-gray-600">
                              {customer.email} • #{customer.customerNumber}
                              {customer.assignedTo && (
                                <span className="text-orange-600">
                                  {' '}• Currently assigned to {customer.assignedTo.username}
                                </span>
                              )}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Salesperson Selection */}
                <div className="space-y-2">
                  <Label htmlFor="salesperson">Assign To</Label>
                  <Select
                    value={selectedSalesperson}
                    onValueChange={setSelectedSalesperson}
                  >
                    <SelectTrigger id="salesperson">
                      <SelectValue placeholder="Choose a salesperson or manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {salespeople.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div>
                            <p className="font-medium">
                              {getDisplayName(user)}
                              <span className="ml-2 text-xs text-gray-500">
                                ({user.role.replace('_', ' ')})
                              </span>
                            </p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Assignment Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this assignment..."
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Salesperson Selection for Manager Assignment */}
                <div className="space-y-2">
                  <Label htmlFor="salesperson-manager">Select Salesperson</Label>
                  <Select
                    value={selectedSalesperson}
                    onValueChange={setSelectedSalesperson}
                  >
                    <SelectTrigger id="salesperson-manager">
                      <SelectValue placeholder="Choose a salesperson" />
                    </SelectTrigger>
                    <SelectContent>
                      {salespeople
                        .filter((u) => u.role === Role.SALES_REP)
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div>
                              <p className="font-medium">{getDisplayName(user)}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Manager Selection */}
                <div className="space-y-2">
                  <Label htmlFor="manager">Assign To Manager</Label>
                  <Select
                    value={selectedManager}
                    onValueChange={setSelectedManager}
                  >
                    <SelectTrigger id="manager">
                      <SelectValue placeholder="Choose a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div>
                            <p className="font-medium">{getDisplayName(user)}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/sales-team')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

export default function SalesTeamAssignPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SalesTeamAssignContent />
    </Suspense>
  )
}