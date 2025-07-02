'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { TrendingUp, TrendingDown, Package, DollarSign, Calculator } from 'lucide-react'

interface SalesOrderSummary {
  totalAmount: number
  totalCost: number
  fifoCost: number
  directExpenses: number
  grossProfit: number
  grossMargin: number
  netProfit: number
  netMargin: number
  hasDeliveredItems: boolean
  hasExpenses: boolean
}

interface SalesOrderProfitabilityProps {
  orderId: string
}

export function SalesOrderProfitability({ orderId }: SalesOrderProfitabilityProps) {
  const { formatCurrency } = useCurrency()
  const [summary, setSummary] = useState<SalesOrderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await apiClient<SalesOrderSummary>(`/api/sales-orders/${orderId}/summary`, {
          method: 'GET'
        })
        
        if (response.ok && response.data) {
          setSummary(response.data)
        } else {
          throw new Error('Failed to fetch profitability data')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profitability data')
        console.error('Error fetching profitability:', err)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchSummary()
    }
  }, [orderId])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-pulse">Loading profitability data...</div>
        </CardContent>
      </Card>
    )
  }

  if (error || !summary) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-red-600">
          {error || 'No profitability data available'}
        </CardContent>
      </Card>
    )
  }

  const isProfitable = summary.netProfit >= 0

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</p>
            <p className="text-xs text-gray-500 mt-1">Order total amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <Calculator className="h-4 w-4 mr-1" />
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</p>
            <p className="text-xs text-gray-500 mt-1">
              FIFO: {formatCurrency(summary.fifoCost)} + Expenses: {formatCurrency(summary.directExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              {isProfitable ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.netProfit)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Margin: {summary.netMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Profitability Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Badges */}
            <div className="flex gap-2">
              {summary.hasDeliveredItems ? (
                <Badge className="bg-green-100 text-green-800">
                  <Package className="h-3 w-3 mr-1" />
                  Has Delivered Items
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">
                  <Package className="h-3 w-3 mr-1" />
                  No Deliveries Yet
                </Badge>
              )}
              
              {summary.hasExpenses ? (
                <Badge className="bg-blue-100 text-blue-800">
                  Has Direct Expenses
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">
                  No Direct Expenses
                </Badge>
              )}
            </div>

            {/* Financial Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Revenue & Costs</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Order Total:</dt>
                    <dd className="font-medium">{formatCurrency(summary.totalAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">FIFO Cost:</dt>
                    <dd>{formatCurrency(summary.fifoCost)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Direct Expenses:</dt>
                    <dd>{formatCurrency(summary.directExpenses)}</dd>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <dt className="text-gray-700 font-medium">Total Cost:</dt>
                    <dd className="font-medium">{formatCurrency(summary.totalCost)}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="font-medium mb-2">Profitability Metrics</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Gross Profit:</dt>
                    <dd className={summary.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(summary.grossProfit)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Gross Margin:</dt>
                    <dd>{summary.grossMargin.toFixed(1)}%</dd>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <dt className="text-gray-700 font-medium">Net Profit:</dt>
                    <dd className={`font-medium ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.netProfit)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-700 font-medium">Net Margin:</dt>
                    <dd className="font-medium">{summary.netMargin.toFixed(1)}%</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Notes */}
            {!summary.hasDeliveredItems && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> FIFO costs will be calculated once items are delivered.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}