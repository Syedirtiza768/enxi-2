'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiClient } from '@/lib/api/client'
import { Plus, Search, TreePine, Eye, Edit } from 'lucide-react'

interface Account {
  id: string
  code: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  status: string
  parentId?: string
  balance: number
  currency: string
  description?: string
  isSystemAccount: boolean
  createdAt: string
  parent?: Account
  children?: Account[]
}

export default function AccountsPage(): React.JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async (): Promise<void> => {
    try {
      setLoading(true)
      const response = await apiClient<Account[]>('/api/accounting/accounts', { method: 'GET' })
      
      if (response.ok && response?.data) {
        // API returns { success: true, data: accounts }
        const accountsData = response.data.data || response.data
        setAccounts(Array.isArray(accountsData) ? accountsData : [])
      } else {
        console.error('Failed to load accounts:', response.error)
        setAccounts([])
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getAccountTypeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      'ASSET': 'bg-green-100 text-green-800',
      'LIABILITY': 'bg-red-100 text-red-800',
      'EQUITY': 'bg-blue-100 text-blue-800',
      'REVENUE': 'bg-purple-100 text-purple-800',
      'EXPENSE': 'bg-orange-100 text-orange-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !typeFilter || typeFilter === 'all' || account.type === typeFilter
    const matchesActive = showInactive || account.status === 'ACTIVE'
    
    return matchesSearch && matchesType && matchesActive
  })

  const accountTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">Loading accounts...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-gray-600">Manage your accounting chart of accounts</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/accounting/accounts/tree">
              <TreePine className="w-4 h-4 mr-2" />
              Tree View
            </Link>
          </Button>
          <Button asChild>
            <Link href="/accounting/accounts/new">
              <Plus className="w-4 h-4 mr-2" />
              New Account
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {accountTypes.map(type => {
          const typeAccounts = accounts.filter(a => a.type === type && a.status === 'ACTIVE')
          const totalBalance = typeAccounts.reduce((sum, acc) => sum + acc.balance, 0)
          
          return (
            <Card key={type}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">{type}</p>
                  <p className="text-xl font-bold">{typeAccounts.length}</p>
                  <p className="text-sm text-gray-500">{formatCurrency(totalBalance)}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search accounts by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={typeFilter || 'all'} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Account Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {accountTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="mr-2"
                />
                Show Inactive
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts ({filteredAccounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono font-medium">
                        {account.code}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {account.parentId && (
                            <span className="text-gray-400 mr-2">└─</span>
                          )}
                          {account.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAccountTypeColor(account.type)}>
                          {account.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {account.currency}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(account.balance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.status === 'ACTIVE' ? "default" : "secondary"}>
                          {account.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/accounting/accounts/${account.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/accounting/accounts/${account.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex justify-between">
        <Link
          href="/accounting"
          className="text-blue-600 hover:text-blue-700"
        >
          ← Back to Accounting
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/accounting/accounts/standard">
              Load Standard Chart
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print Chart
          </Button>
        </div>
      </div>
    </div>
  )
}