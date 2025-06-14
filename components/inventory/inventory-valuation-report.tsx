'use client'

import React, { useState, useEffect } from 'react'
import { Download, Filter, TrendingUp, TrendingDown, Package } from 'lucide-react'

interface ValuationItem {
  itemId: string
  itemCode: string
  itemName: string
  category: string
  unitOfMeasure: string
  quantity: number
  averageCost: number
  lastCost: number
  totalValue: number
  percentOfTotal: number
  stockMovements: {
    lastReceived?: Date
    lastIssued?: Date
    monthlyAverage: number
    turnoverRatio: number
  }
}

interface ValuationSummary {
  totalValue: number
  totalItems: number
  totalQuantity: number
  categories: Array<{
    category: string
    value: number
    percentage: number
    itemCount: number
  }>
  topValueItems: ValuationItem[]
  slowMovingItems: ValuationItem[]
}

interface InventoryValuationReportProps {
  onItemClick?: (itemId: string) => void
}

export function InventoryValuationReport({ onItemClick }: InventoryValuationReportProps) {
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedLocation, setSelectedLocation] = useState('ALL')
  const [valuationMethod, setValuationMethod] = useState<'FIFO' | 'AVERAGE' | 'LAST'>('FIFO')
  const [showZeroStock, setShowZeroStock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ValuationSummary | null>(null)
  const [items, setItems] = useState<ValuationItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'value' | 'quantity' | 'name'>('value')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadReferenceData()
  }, [])

  useEffect(() => {
    loadValuationReport()
  }, [valuationDate, selectedCategory, selectedLocation, valuationMethod, showZeroStock])

  const loadReferenceData = async (): Promise<void> => {
    try {
      // Load categories
      const catResponse = await fetch('/api/inventory/categories')
      if (catResponse.ok) {
        const catData = await catResponse.json()
        setCategories(catData.data?.map((c: any) => c.name) || [])
      }

      // Load locations
      const locResponse = await fetch('/api/inventory/locations')
      if (locResponse.ok) {
        const locData = await locResponse.json()
        setLocations(locData.data?.map((l: any) => l.name) || [])
      }
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  const loadValuationReport = async (): Promise<void> => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        date: valuationDate,
        method: valuationMethod,
        showZeroStock: showZeroStock.toString()
      })
      
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory)
      if (selectedLocation !== 'ALL') params.append('location', selectedLocation)

      const response = await fetch(`/api/inventory/reports/valuation?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Error loading valuation report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        date: valuationDate,
        method: valuationMethod,
        format,
        showZeroStock: showZeroStock.toString()
      })
      
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory)
      if (selectedLocation !== 'ALL') params.append('location', selectedLocation)

      const response = await fetch(`/api/inventory/reports/valuation/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `inventory_valuation_${valuationDate}.${format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  const sortItems = (items: ValuationItem[]) => {
    const sorted = [...items].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'value':
          comparison = a.totalValue - b.totalValue
          break
        case 'quantity':
          comparison = a.quantity - b.quantity
          break
        case 'name':
          comparison = a.itemName.localeCompare(b.itemName)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    return sorted
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AED'
    }).format(value)
  }

  const handleSort = (field: 'value' | 'quantity' | 'name') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12 text-gray-500">
          Loading valuation report...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Inventory Valuation Report</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => exportReport('csv')}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => exportReport('pdf')}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valuation Date
            </label>
            <input
              type="date"
              value={valuationDate}
              onChange={(e) => setValuationDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valuation Method
            </label>
            <select
              value={valuationMethod}
              onChange={(e) => setValuationMethod(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="FIFO">FIFO</option>
              <option value="AVERAGE">Average Cost</option>
              <option value="LAST">Last Cost</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showZeroStock}
                onChange={(e) => setShowZeroStock(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
              />
              <span className="text-sm text-gray-700">Show Zero Stock</span>
            </label>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summary.totalValue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.totalItems.toLocaleString()}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Quantity</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.totalQuantity.toLocaleString()}
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Value/Item</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summary.totalValue / summary.totalItems)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {summary && summary.categories.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Value by Category</h3>
          <div className="space-y-2">
            {summary.categories.map(cat => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <span className="text-sm font-medium text-gray-900 w-32">{cat.category}</span>
                  <div className="flex-1 mx-4">
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 w-20 text-right">{cat.percentage.toFixed(1)}%</span>
                </div>
                <div className="text-sm text-gray-900 ml-4">
                  {formatCurrency(cat.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Items Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Inventory Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Code
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('name')}
                >
                  Item Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('quantity')}
                >
                  Quantity {sortBy === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  UoM
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Cost
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('value')}
                >
                  Total Value {sortBy === 'value' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortItems(items).map(item => (
                <tr key={item.itemId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.itemCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => onItemClick?.(item.itemId)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {item.itemName}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.quantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {item.unitOfMeasure}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(item.averageCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(item.totalValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {item.percentOfTotal.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-sm font-medium text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    {items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                  </td>
                  <td></td>
                  <td></td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    {formatCurrency(items.reduce((sum, item) => sum + item.totalValue, 0))}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    100.00%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Top Value Items */}
      {summary && summary.topValueItems.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top 10 Items by Value</h3>
          <div className="space-y-2">
            {summary.topValueItems.slice(0, 10).map((item, index) => (
              <div key={item.itemId} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                  <button
                    onClick={() => onItemClick?.(item.itemId)}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600"
                  >
                    {item.itemCode} - {item.itemName}
                  </button>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(item.totalValue)} ({item.percentOfTotal.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}