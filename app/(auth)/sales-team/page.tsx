'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  UserPlus, 
  Building, 
  Search,
  ChevronRight,
  UserCheck
} from 'lucide-react'

interface TeamMember {
  id: string
  username: string
  email: string
  name: string
  customerCount: number
  salesTeamMember?: {
    salesTarget: number
    currentMonthSales: number
    yearToDateSales: number
  }
}

interface TeamHierarchy {
  manager: {
    id: string
    username: string
    email: string
    name: string
  } | null
  teamMembers: TeamMember[]
}

interface UnassignedCustomer {
  id: string
  customerNumber: string
  name: string
  email: string
  createdAt: string
}

export default function SalesTeamPage(): React.JSX.Element {
  const router = useRouter()
  const [hierarchy, setHierarchy] = useState<TeamHierarchy>({ manager: null, teamMembers: [] })
  const [unassignedCustomers, setUnassignedCustomers] = useState<UnassignedCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchUnassigned, setSearchUnassigned] = useState('')
  const [selectedTab, setSelectedTab] = useState<'team' | 'unassigned'>('team')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedTab === 'unassigned') {
      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // Set a new timeout for debounced search
      searchTimeoutRef.current = setTimeout(() => {
        fetchUnassignedCustomers()
      }, 300) // 300ms debounce delay

      // Cleanup function
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
      }
    }
  }, [selectedTab, searchUnassigned]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient('/api/sales-team')
      if (response.ok && response?.data) {
        setHierarchy(response?.data)
      } else {
        setError('Failed to load sales team data')
      }
    } catch (err) {
      console.error('Error fetching team data:', err)
      setError('Failed to load sales team data')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnassignedCustomers = async (): Promise<void> => {
    try {
      setSearchLoading(true)
      const params = new URLSearchParams()
      if (searchUnassigned) params.append('search', searchUnassigned)
      params.append('view', 'unassigned')

      const response = await apiClient(`/api/sales-team?${params}`)
      if (response.ok && response?.data) {
        setUnassignedCustomers(response?.data.customers || [])
      }
    } catch (err) {
      console.error('Error fetching unassigned customers:', err)
      setError('Failed to load unassigned customers')
    } finally {
      setSearchLoading(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const calculateAchievement = (current: number, target: number): number => {
    if (target === 0) return 0
    return Math.round((current / target) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading sales team data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Team Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your sales team hierarchy and customer assignments
          </p>
        </div>
        <Button
          onClick={(): void => router.push('/sales-team/assign')}
          className="flex items-center space-x-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Manage Assignments</span>
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tab Selection */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={(): void => setSelectedTab('team')}
          className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
            selectedTab === 'team'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          My Team
        </button>
        <button
          onClick={(): void => setSelectedTab('unassigned')}
          className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
            selectedTab === 'unassigned'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Unassigned Customers
        </button>
      </div>

      {selectedTab === 'team' ? (
        <>
          {/* Manager Info */}
          {hierarchy.manager && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Team Manager</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-lg">{hierarchy.manager.name}</p>
                    <p className="text-sm text-gray-600">{hierarchy.manager.email}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Manager</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Members */}
          {hierarchy.teamMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hierarchy.teamMembers.map((member) => {
                const achievement = member.salesTeamMember
                  ? calculateAchievement(
                      member.salesTeamMember.currentMonthSales,
                      member.salesTeamMember.salesTarget
                    )
                  : 0

                return (
                  <Card key={member.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(): void => router.push(`/users/${member.id}`)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-gray-600">
                        <p>{member.email}</p>
                        <p className="flex items-center mt-1">
                          <Building className="w-4 h-4 mr-1" />
                          {member.customerCount} customers
                        </p>
                      </div>

                      {member.salesTeamMember && (
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Monthly Target</span>
                              <span className="font-medium">
                                {formatCurrency(member.salesTeamMember.salesTarget)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                              <span className="text-gray-600">Current Sales</span>
                              <span className="font-medium">
                                {formatCurrency(member.salesTeamMember.currentMonthSales)}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600">Achievement</span>
                              <span className="font-medium">{achievement}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  achievement >= 100
                                    ? 'bg-green-600'
                                    : achievement >= 75
                                    ? 'bg-blue-600'
                                    : achievement >= 50
                                    ? 'bg-yellow-600'
                                    : 'bg-red-600'
                                }`}
                                style={{ width: `${Math.min(achievement, 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">YTD Sales</span>
                              <span className="font-medium">
                                {formatCurrency(member.salesTeamMember.yearToDateSales)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">
                  {hierarchy.manager
                    ? "No team members assigned yet"
                    : "You don't have a sales team assigned"}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* Unassigned Customers Tab */
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search unassigned customers..."
              value={searchUnassigned}
              onChange={(e): void => setSearchUnassigned(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {searchLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Searching customers...</p>
              </div>
            </div>
          ) : unassignedCustomers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unassignedCustomers.map((customer) => (
                <Card key={customer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.email}</p>
                        <p className="text-xs text-gray-500">#{customer.customerNumber}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(): void => router.push(`/sales-team/assign?customerId=${customer.id}`)}
                      >
                        <UserCheck className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Building className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No unassigned customers found</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}