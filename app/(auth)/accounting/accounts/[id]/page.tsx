'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'
import { ArrowLeft, Edit } from 'lucide-react'
import { useCurrencyFormatter } from '@/lib/contexts/currency-context'

interface Account {
  id: string
  code: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
  status: string
  parentId?: string
  balance: number
  currency: string
  description?: string
  isSystemAccount: boolean
  createdAt: string
  updatedAt: string
  parent?: Account
  children?: Account[]
}

const accountTypeStyles = {
  ASSET: 'bg-green-100 text-green-800',
  LIABILITY: 'bg-red-100 text-red-800',
  EQUITY: 'bg-purple-100 text-purple-800',
  INCOME: 'bg-blue-100 text-blue-800',
  EXPENSE: 'bg-orange-100 text-orange-800'
}

export default function ViewAccountPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { format } = useCurrencyFormatter()

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true)
        const response = await apiClient(`/api/accounting/accounts/${accountId}`)
        
        if (response.ok && response.data) {
          const accountData = response.data.data || response.data
          setAccount(accountData)
        } else {
          setError('Account not found')
          router.push('/accounting/accounts')
        }
      } catch (error) {
        console.error('Error fetching account:', error)
        setError('Failed to load account')
      } finally {
        setLoading(false)
      }
    }

    if (accountId) {
      fetchAccount()
    }
  }, [accountId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading account...</p>
        </div>
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/accounting/accounts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Accounts
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">{error || 'Account not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/accounting/accounts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Accounts
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Account Details</h1>
        </div>
        {!account.isSystemAccount && (
          <Link href={`/accounting/accounts/${account.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Account
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Account Code</p>
                <p className="mt-1 text-lg">{account.code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Account Name</p>
                <p className="mt-1 text-lg">{account.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Type</p>
                <Badge className={`mt-1 ${accountTypeStyles[account.type]}`}>
                  {account.type}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge 
                  variant={account.status === 'ACTIVE' ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {account.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Currency</p>
                <p className="mt-1 text-lg">{account.currency}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Balance</p>
                <p className="mt-1 text-lg font-semibold">
                  {format(account.balance, account.currency)}
                </p>
              </div>
            </div>
            {account.description && (
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="mt-1">{account.description}</p>
              </div>
            )}
            {account.parent && (
              <div>
                <p className="text-sm font-medium text-gray-500">Parent Account</p>
                <p className="mt-1">
                  {account.parent.code} - {account.parent.name}
                </p>
              </div>
            )}
            {account.isSystemAccount && (
              <div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  System Account
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Created At</p>
                <p className="mt-1">
                  {new Date(account.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Last Updated</p>
                <p className="mt-1">
                  {new Date(account.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}