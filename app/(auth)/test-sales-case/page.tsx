'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api/client'

export default function TestSalesCasePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const testCreateSalesCase = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // First get customers
      const customersResponse = await apiClient('/api/customers', { method: 'GET' })
      
      if (!customersResponse.ok) {
        throw new Error('Failed to fetch customers')
      }

      const customers = customersResponse.data
      if (!customers || customers.length === 0) {
        throw new Error('No customers found')
      }

      // Create a sales case
      const salesCaseData = {
        customerId: customers[0].id,
        title: 'Test Sales Case ' + new Date().toISOString(),
        description: 'This is a test sales case created from the test page',
        estimatedValue: 5000
      }

      const response = await apiClient('/api/sales-cases', {
        method: 'POST',
        body: JSON.stringify(salesCaseData)
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create sales case')
      }

      setResult({
        salesCase: response.data,
        message: 'Sales case created successfully!'
      })
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Sales Case Creation</h1>
      
      <div className="space-y-4">
        <button
          onClick={testCreateSalesCase}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Test Sales Case'}
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 mb-2">{result.message}</p>
            <pre className="text-sm overflow-auto bg-white p-2 rounded">
              {JSON.stringify(result.salesCase, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}