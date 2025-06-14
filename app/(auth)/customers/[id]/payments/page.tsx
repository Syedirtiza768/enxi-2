'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CustomerLedger } from '@/components/payments/customer-ledger'
import { CustomerBusinessHistory } from '@/components/payments/customer-business-history'
import { ArrowLeft, DollarSign, Receipt } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  industry?: string
  creditLimit: number
  createdAt: string
}

export default function CustomerPaymentsPage() {
  const params = useParams()
  const customerId = params.id as string
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ledger')

  useEffect(() => {
    loadCustomer()
  }, [customerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadCustomer = async (): Promise<void> => {
    try {
      setLoading(true)
      const response = await apiClient<Customer>(`/api/customers/${customerId}`, { method: 'GET' })
      if (response.ok && response.data) {
        setCustomer(response.data)
      } else {
        setCustomer(null)
      }
    } catch (error) {
      console.error('Error:', error);
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/customers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">Loading customer...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/customers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-red-600">Customer not found</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/customers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <p className="text-gray-600">Customer Payments & Business History</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/customers/${customerId}`}>
              <Receipt className="w-4 h-4 mr-2" />
              Customer Profile
            </Link>
          </Button>
          <Button asChild>
            <Link href="/payments">
              <DollarSign className="w-4 h-4 mr-2" />
              All Payments
            </Link>
          </Button>
        </div>
      </div>

      {/* Customer Quick Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{customer.name}</p>
              <p className="text-sm text-gray-600">{customer.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Industry</p>
              <p className="font-medium">{customer.industry || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Credit Limit</p>
              <p className="font-medium text-green-600">
                ${customer.creditLimit.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Customer Since</p>
              <p className="font-medium">
                {new Date(customer.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ledger">Customer Ledger</TabsTrigger>
          <TabsTrigger value="business-history">Business History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ledger" className="space-y-6">
          <CustomerLedger customerId={customerId} />
        </TabsContent>
        
        <TabsContent value="business-history" className="space-y-6">
          <CustomerBusinessHistory 
            customerId={customerId}
            onViewLedger={(_id) => setActiveTab('ledger')}
            onRecordPayment={(_id) => setActiveTab('ledger')}
            onCreateInvoice={(id) => {
              window.open(`/invoices/new?customerId=${id}`, '_blank')
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}