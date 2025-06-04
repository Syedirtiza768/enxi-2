'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api/client'
import { ArrowLeft, FileText, Download, AlertTriangle, CheckCircle } from 'lucide-react'

export default function StandardChartPage() {
  const router = useRouter()
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleCreateStandardCOA = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess(false)

      const response = await apiClient('/api/accounting/accounts/standard', {
        method: 'POST',
        body: JSON.stringify({ currency })
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/accounting/accounts')
        }, 2000)
      } else {
        setError(response.error || 'Failed to create standard chart of accounts')
      }
    } catch (err) {
      console.error('Error creating standard COA:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const standardAccountTypes = [
    {
      type: 'Assets',
      accounts: [
        '1000 - Cash',
        '1010 - Bank Account',
        '1200 - Accounts Receivable',
        '1300 - Inventory',
        '1400 - Prepaid Expenses',
        '1500 - Equipment',
        '1600 - Accumulated Depreciation'
      ]
    },
    {
      type: 'Liabilities',
      accounts: [
        '2000 - Accounts Payable',
        '2100 - Sales Tax Payable',
        '2200 - Salaries Payable',
        '2300 - Unearned Revenue',
        '2400 - Long-term Debt'
      ]
    },
    {
      type: 'Equity',
      accounts: [
        '3000 - Owner\'s Capital',
        '3100 - Retained Earnings',
        '3200 - Drawing'
      ]
    },
    {
      type: 'Revenue',
      accounts: [
        '4000 - Sales Revenue',
        '4100 - Service Revenue',
        '4200 - Interest Income',
        '4300 - Other Revenue'
      ]
    },
    {
      type: 'Expenses',
      accounts: [
        '5000 - Cost of Goods Sold',
        '5100 - Salaries Expense',
        '5200 - Rent Expense',
        '5300 - Utilities Expense',
        '5400 - Marketing Expense',
        '5500 - Office Supplies',
        '5600 - Travel Expense',
        '5700 - Professional Fees'
      ]
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/accounting/accounts">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Accounts
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Load Standard Chart of Accounts</h1>
          <p className="text-gray-600">Create a standard chart of accounts for your business</p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Standard chart of accounts created successfully! Redirecting to accounts page...
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Base Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleCreateStandardCOA} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Creating...' : 'Create Standard Chart of Accounts'}
              </Button>
            </div>

            <div className="text-sm text-gray-500">
              <p className="font-medium mb-2">⚠️ Important Notes:</p>
              <ul className="space-y-1 text-xs">
                <li>• This will create a complete standard chart of accounts</li>
                <li>• Only available if no accounts exist in the system</li>
                <li>• All accounts will use the selected base currency</li>
                <li>• You can modify accounts after creation</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Standard Chart Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {standardAccountTypes.map((category) => (
                <div key={category.type}>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">
                    {category.type}
                  </h4>
                  <ul className="space-y-1 ml-4">
                    {category.accounts.map((account, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        {account}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Standard Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">What's Included</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Standard asset accounts (cash, receivables, inventory)</li>
                <li>• Common liability accounts (payables, taxes)</li>
                <li>• Basic equity accounts</li>
                <li>• Revenue and expense categories</li>
                <li>• Proper account numbering system</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Customization</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Add industry-specific accounts later</li>
                <li>• Modify account names and descriptions</li>
                <li>• Create sub-accounts for detailed tracking</li>
                <li>• Set up custom account hierarchies</li>
                <li>• Configure multi-currency support</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}