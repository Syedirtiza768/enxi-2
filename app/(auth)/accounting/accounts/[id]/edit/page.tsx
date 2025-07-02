'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { apiClient } from '@/lib/api/client'
import { ArrowLeft, Save } from 'lucide-react'

const accountTypes = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'INCOME', label: 'Revenue' },
  { value: 'EXPENSE', label: 'Expense' }
]

const currencies = [
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'PKR', label: 'PKR - Pakistani Rupee' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' }
]

export default function EditAccountPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const [loading, setLoading] = useState(false)
  const [loadingAccount, setLoadingAccount] = useState(true)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    currency: 'USD',
    description: '',
    parentId: ''
  })

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoadingAccount(true)
        const response = await apiClient(`/api/accounting/accounts/${accountId}`)
        
        if (response.ok && response.data) {
          const account = response.data.data || response.data
          setFormData({
            code: account.code || '',
            name: account.name || '',
            type: account.type || '',
            currency: account.currency || 'USD',
            description: account.description || '',
            parentId: account.parentId || ''
          })
        } else {
          setError('Account not found')
          router.push('/accounting/accounts')
        }
      } catch (error) {
        console.error('Error fetching account:', error)
        setError('Failed to load account')
      } finally {
        setLoadingAccount(false)
      }
    }

    if (accountId) {
      fetchAccount()
    }
  }, [accountId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient(`/api/accounting/accounts/${accountId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        router.push('/accounting/accounts')
      } else {
        setError(response.error || 'Failed to update account')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error updating account:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loadingAccount) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading account...</p>
        </div>
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
          <h1 className="text-3xl font-bold">Edit Account</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="code">Account Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="e.g., 1100"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Cash"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Account Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleChange('type', value)}
                  required
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleChange('currency', value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Optional description of the account"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/accounting/accounts">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}