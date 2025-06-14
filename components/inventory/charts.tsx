'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts'
import { 
  Calendar, Download, Filter, RefreshCw, TrendingUp, TrendingDown,
  Package, AlertTriangle, DollarSign, Activity, ChevronDown,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
  Loader2, Eye, EyeOff
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { useCurrency } from '@/lib/contexts/currency-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DateRangePicker } from '@/components/ui/date-picker'
import {
  generateMockStockLevels,
  generateMockLowStockAlerts,
  generateMockInventoryValue,
  generateMockStockMovements,
  generateMockCategoryData,
  generateMockABCAnalysis,
  generateMockBusinessMetrics
} from '@/lib/utils/mock-inventory-data'

// Types for chart data
interface StockLevelData {
  name: string
  currentStock: number
  minStock: number
  maxStock: number
  reorderPoint: number
  category: string
  value: number
}

interface LowStockAlert {
  name: string
  value: number
  status: 'critical' | 'warning' | 'ok'
}

interface InventoryValueData {
  category: string
  value: number
  percentage: number
  items: number
}

interface StockMovementData {
  date: string
  inbound: number
  outbound: number
  net: number
}

interface CategoryData {
  category: string
  quantity: number
  value: number
  items: number
}

interface ABCAnalysisData {
  item: string
  value: number
  volume: number
  classification: 'A' | 'B' | 'C'
}

interface BusinessMetrics {
  totalInventoryValue: number
  itemsBelowReorderPoint: number
  fastMovingItems: number
  slowMovingItems: number
  stockTurnoverRate: number
  wasteValue: number
  totalItems: number
  activeItems: number
}

interface ChartFilters {
  dateRange: {
    from: Date
    to: Date
  }
  categories: string[]
  showAll: boolean
}

interface InventoryChartsProps {
  className?: string
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',
  success: '#059669',
  muted: '#6B7280'
}

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.warning,
  COLORS.danger,
  COLORS.info,
  COLORS.success,
  '#8B5CF6',
  '#F97316',
  '#14B8A6',
  '#EC4899'
]

export function InventoryCharts({ className }: InventoryChartsProps) {
  const { formatCurrency } = useCurrency()
  
  // State management
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Data state
  const [stockLevels, setStockLevels] = useState<StockLevelData[]>([])
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([])
  const [inventoryValue, setInventoryValue] = useState<InventoryValueData[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovementData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [abcAnalysis, setAbcAnalysis] = useState<ABCAnalysisData[]>([])
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null)
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  
  // UI state
  const [activeChart, setActiveChart] = useState<string>('overview')
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [visibleCharts, setVisibleCharts] = useState<string[]>([
    'stockLevels', 'lowStock', 'inventoryValue', 'stockMovement', 'categoryWise', 'abcAnalysis'
  ])
  
  // Filters state
  const [filters, setFilters] = useState<ChartFilters>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date()
    },
    categories: [],
    showAll: true
  })

  // Data fetching functions
  const fetchStockLevels = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No authentication token')

      const response = await fetch('/api/inventory/reports/stock-summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch stock levels')
      
      const data = await response.json()
      const summaries = data.summaries || data.data || data || []
      const transformedData = summaries.map((item: any) => ({
        name: item.itemName,
        currentStock: item.totalStock,
        minStock: item.minStockLevel,
        maxStock: item.maxStockLevel,
        reorderPoint: item.reorderPoint,
        category: item.category,
        value: item.totalValue
      }))
      
      setStockLevels(transformedData)
      
      // Extract categories
      const categories = [...new Set(transformedData.map((item: StockLevelData) => item.category))]
      setAvailableCategories(categories)
      
    } catch (error) {
      console.error('Error fetching stock levels:', error)
      // Fallback to mock data
      const mockData = generateMockStockLevels(15)
      setStockLevels(mockData)
      const categories = [...new Set(mockData.map(item => item.category))]
      setAvailableCategories(categories)
    }
  }, [])

  const fetchLowStockAlerts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No authentication token')

      const response = await fetch('/api/inventory/low-stock', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch low stock alerts')
      
      const data = await response.json()
      const items = data.items || data.data || data || []
      const transformedData = items.map((item: any) => ({
        name: item.name,
        value: item.currentStock,
        status: item.currentStock === 0 ? 'critical' : 
                item.currentStock < item.reorderPoint ? 'warning' : 'ok'
      }))
      
      setLowStockAlerts(transformedData)
      
    } catch (error) {
      console.error('Error fetching low stock alerts:', error)
      // Fallback to mock data
      setLowStockAlerts(generateMockLowStockAlerts(15))
    }
  }, [])

  const fetchInventoryValue = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No authentication token')

      const response = await fetch('/api/inventory/valuation', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch inventory valuation')
      
      const data = await response.json()
      const valuationData = Array.isArray(data) ? data : (data.data || data.items || [])
      const total = valuationData.reduce((sum: number, item: any) => sum + item.totalValue, 0)
      
      const transformedData = valuationData.map((item: any) => ({
        category: item.category,
        value: item.totalValue,
        percentage: (item.totalValue / total) * 100,
        items: item.itemCount
      }))
      
      setInventoryValue(transformedData)
      
    } catch (error) {
      console.error('Error fetching inventory valuation:', error)
      // Fallback to mock data
      setInventoryValue(generateMockInventoryValue())
    }
  }, [])

  const fetchStockMovements = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No authentication token')

      const fromDate = format(filters.dateRange.from, 'yyyy-MM-dd')
      const toDate = format(filters.dateRange.to, 'yyyy-MM-dd')
      
      const response = await fetch(
        `/api/inventory/stock-movements?from=${fromDate}&to=${toDate}&aggregate=daily`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      if (!response.ok) throw new Error('Failed to fetch stock movements')
      
      const data = await response.json()
      const movements = data.movements || data.data || data || []
      const transformedData = movements.map((movement: any) => ({
        date: format(new Date(movement.date), 'MMM dd'),
        inbound: movement.inbound || 0,
        outbound: Math.abs(movement.outbound || 0),
        net: (movement.inbound || 0) + (movement.outbound || 0)
      }))
      
      setStockMovements(transformedData)
      
    } catch (error) {
      console.error('Error fetching stock movements:', error)
      // Fallback to mock data
      setStockMovements(generateMockStockMovements(30))
    }
  }, [filters.dateRange])

  const fetchBusinessMetrics = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No authentication token')

      // Fetch multiple endpoints for comprehensive metrics
      const [stockSummary, valuation] = await Promise.all([
        fetch('/api/inventory/reports/stock-summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => data.data || data),
        fetch('/api/inventory/valuation', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => Array.isArray(data) ? data : (data.data || data.items || []))
      ])
      
      const totalValue = valuation.reduce((sum: number, item: any) => sum + item.totalValue, 0)
      const totalItems = stockSummary.totals?.totalItems || stockSummary.total || 0
      const itemsBelowReorder = stockSummary.totals?.itemsBelowReorderPoint || 0
      
      setBusinessMetrics({
        totalInventoryValue: totalValue,
        itemsBelowReorderPoint: itemsBelowReorder,
        fastMovingItems: Math.floor(totalItems * 0.2), // Simulated
        slowMovingItems: Math.floor(totalItems * 0.3), // Simulated
        stockTurnoverRate: 4.2, // Simulated
        wasteValue: totalValue * 0.05, // Simulated 5% waste
        totalItems,
        activeItems: totalItems - (stockSummary.totals?.itemsWithZeroStock || 0)
      })
      
    } catch (error) {
      console.error('Error fetching business metrics:', error)
      // Fallback to mock data
      setBusinessMetrics(generateMockBusinessMetrics())
    }
  }, [])

  // Generate ABC analysis data
  const generateABCAnalysis = useCallback(() => {
    if (stockLevels.length === 0) {
      // Use mock data if no stock levels available
      setAbcAnalysis(generateMockABCAnalysis(20))
      return
    }

    const analysisData = stockLevels.map(item => ({
      item: item.name,
      value: item.value,
      volume: item.currentStock,
      classification: (
        item.value > 5000 ? 'A' :
        item.value > 1000 ? 'B' : 'C'
      ) as 'A' | 'B' | 'C'
    }))
    
    setAbcAnalysis(analysisData)
  }, [stockLevels])

  // Generate category-wise data from stock levels
  const generateCategoryData = useCallback(() => {
    if (stockLevels.length === 0) {
      // Use mock data if no stock levels available
      setCategoryData(generateMockCategoryData())
      return
    }

    const categoryMap = new Map<string, { quantity: number, value: number, items: number }>()
    
    stockLevels.forEach(item => {
      const existing = categoryMap.get(item.category) || { quantity: 0, value: 0, items: 0 }
      categoryMap.set(item.category, {
        quantity: existing.quantity + item.currentStock,
        value: existing.value + item.value,
        items: existing.items + 1
      })
    })
    
    const data = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      ...stats
    }))
    
    setCategoryData(data)
  }, [stockLevels])

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch data with individual error handling
      await Promise.allSettled([
        fetchStockLevels(),
        fetchLowStockAlerts(),
        fetchInventoryValue(),
        fetchStockMovements(),
        fetchBusinessMetrics()
      ])
      
    } catch (error) {
      console.error('Error loading inventory data:', error)
      // Don't set error state here as individual functions handle their own fallbacks
    } finally {
      setIsLoading(false)
    }
  }, [
    fetchStockLevels,
    fetchLowStockAlerts,
    fetchInventoryValue,
    fetchStockMovements,
    fetchBusinessMetrics
  ])

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [loadData])

  // Filter data based on current filters
  const filteredStockLevels = useMemo(() => {
    if (!filters.showAll && filters.categories.length > 0) {
      return stockLevels.filter(item => filters.categories.includes(item.category))
    }
    return stockLevels
  }, [stockLevels, filters])

  const filteredCategoryData = useMemo(() => {
    if (!filters.showAll && filters.categories.length > 0) {
      return categoryData.filter(item => filters.categories.includes(item.category))
    }
    return categoryData
  }, [categoryData, filters])

  // Export functionality
  const handleExport = useCallback(async (chartType: string) => {
    try {
      const dataMap = {
        stockLevels: filteredStockLevels,
        lowStock: lowStockAlerts,
        inventoryValue,
        stockMovement: stockMovements,
        categoryWise: filteredCategoryData,
        abcAnalysis,
        businessMetrics
      }
      
      const data = dataMap[chartType as keyof typeof dataMap]
      const csvContent = convertToCSV(data, chartType)
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `inventory-${chartType}-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Export failed:', error)
    }
  }, [
    filteredStockLevels,
    lowStockAlerts,
    inventoryValue,
    stockMovements,
    filteredCategoryData,
    abcAnalysis,
    businessMetrics
  ])

  // Helper function to convert data to CSV
  const convertToCSV = (data: any, type: string): string => {
    if (!data || data.length === 0) return ''
    
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map((row: any) => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    ).join('\n')
    
    return `${headers}\n${rows}`
  }

  // Toggle chart visibility
  const toggleChartVisibility = (chartId: string) => {
    setVisibleCharts(prev => 
      prev.includes(chartId) 
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    )
  }

  // Effects
  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    generateABCAnalysis()
    generateCategoryData()
  }, [generateABCAnalysis, generateCategoryData])

  // Custom tooltip components
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${
                entry.dataKey.includes('value') || entry.dataKey.includes('Value')
                  ? formatCurrency(entry.value)
                  : entry.value
              }`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading inventory analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Analytics</h2>
          <p className="text-gray-600">Comprehensive insights into your inventory performance</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Date Range Picker */}
          <DateRangePicker
            value={filters.dateRange}
            onChange={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
            className="w-64"
          />

          {/* Category Filter */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Categories
              <Badge variant="secondary" className="ml-1">
                {filters.showAll ? 'All' : filters.categories.length}
              </Badge>
              <ChevronDown className="h-4 w-4" />
            </Button>
            
            {showCategoryFilter && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 w-64">
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showAll}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        showAll: e.target.checked,
                        categories: e.target.checked ? [] : prev.categories
                      }))}
                      className="mr-2"
                    />
                    Show All Categories
                  </label>
                  
                  {!filters.showAll && availableCategories.map(category => (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setFilters(prev => ({
                            ...prev,
                            categories: checked
                              ? [...prev.categories, category]
                              : prev.categories.filter(c => c !== category)
                          }))
                        }}
                        className="mr-2"
                      />
                      {category}
                    </label>
                  ))}
                </div>
                
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => setShowCategoryFilter(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Business Metrics Overview */}
      {businessMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(businessMetrics.totalInventoryValue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900">
                  {businessMetrics.itemsBelowReorderPoint}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Turnover</p>
                <p className="text-2xl font-bold text-gray-900">
                  {businessMetrics.stockTurnoverRate.toFixed(1)}x
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Items</p>
                <p className="text-2xl font-bold text-gray-900">
                  {businessMetrics.activeItems}/{businessMetrics.totalItems}
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Chart Visibility Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-600 mr-2">Show Charts:</span>
          {[
            { id: 'stockLevels', label: 'Stock Levels', icon: BarChart3 },
            { id: 'lowStock', label: 'Low Stock', icon: AlertTriangle },
            { id: 'inventoryValue', label: 'Inventory Value', icon: PieChartIcon },
            { id: 'stockMovement', label: 'Stock Movement', icon: LineChartIcon },
            { id: 'categoryWise', label: 'Categories', icon: BarChart3 },
            { id: 'abcAnalysis', label: 'ABC Analysis', icon: TrendingUp }
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={visibleCharts.includes(id) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleChartVisibility(id)}
              className="flex items-center gap-1"
            >
              <Icon className="h-3 w-3" />
              {label}
              {visibleCharts.includes(id) ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
          ))}
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Levels Overview */}
        {visibleCharts.includes('stockLevels') && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Stock Levels Overview</h3>
                <p className="text-sm text-gray-600">Current vs Min/Max stock levels</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('stockLevels')}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredStockLevels.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="currentStock" fill={COLORS.primary} name="Current Stock" />
                  <Bar dataKey="minStock" fill={COLORS.warning} name="Min Stock" />
                  <Bar dataKey="reorderPoint" fill={COLORS.danger} name="Reorder Point" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Low Stock Alerts */}
        {visibleCharts.includes('lowStock') && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
                <p className="text-sm text-gray-600">Items requiring attention</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('lowStock')}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Critical', value: lowStockAlerts.filter(item => item.status === 'critical').length, color: COLORS.danger },
                      { name: 'Warning', value: lowStockAlerts.filter(item => item.status === 'warning').length, color: COLORS.warning },
                      { name: 'OK', value: lowStockAlerts.filter(item => item.status === 'ok').length, color: COLORS.success }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {[
                      { name: 'Critical', value: lowStockAlerts.filter(item => item.status === 'critical').length, color: COLORS.danger },
                      { name: 'Warning', value: lowStockAlerts.filter(item => item.status === 'warning').length, color: COLORS.warning },
                      { name: 'OK', value: lowStockAlerts.filter(item => item.status === 'ok').length, color: COLORS.success }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Inventory Value Distribution */}
        {visibleCharts.includes('inventoryValue') && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Inventory Value Distribution</h3>
                <p className="text-sm text-gray-600">Value breakdown by category</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('inventoryValue')}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={inventoryValue}>
                  <RadialBar
                    minAngle={15}
                    label={{ position: 'insideStart', fill: '#fff' }}
                    background
                    clockWise
                    dataKey="value"
                  />
                  <Legend />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Stock Movement Trends */}
        {visibleCharts.includes('stockMovement') && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Stock Movement Trends</h3>
                <p className="text-sm text-gray-600">Inbound vs outbound movements</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('stockMovement')}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stockMovements}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="inbound" stroke={COLORS.success} name="Inbound" strokeWidth={2} />
                  <Line type="monotone" dataKey="outbound" stroke={COLORS.danger} name="Outbound" strokeWidth={2} />
                  <Line type="monotone" dataKey="net" stroke={COLORS.primary} name="Net Movement" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Category-wise Inventory */}
        {visibleCharts.includes('categoryWise') && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Category-wise Inventory</h3>
                <p className="text-sm text-gray-600">Inventory distribution by category</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('categoryWise')}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredCategoryData} layout="horizontal" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="category" type="category" width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="quantity" fill={COLORS.primary} name="Quantity" />
                  <Bar dataKey="value" fill={COLORS.secondary} name="Value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* ABC Analysis */}
        {visibleCharts.includes('abcAnalysis') && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">ABC Analysis</h3>
                <p className="text-sm text-gray-600">Value vs volume analysis</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('abcAnalysis')}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={abcAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="volume" name="Volume" type="number" />
                  <YAxis dataKey="value" name="Value" type="number" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => [
                      name === 'value' ? formatCurrency(Number(value)) : value,
                      name === 'value' ? 'Value' : 'Volume'
                    ]}
                    labelFormatter={(label) => `Item: ${label}`}
                  />
                  <Legend />
                  <Scatter 
                    dataKey="value" 
                    fill={COLORS.primary}
                    shape="circle"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Class A: High Value</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Class B: Medium Value</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Class C: Low Value</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default InventoryCharts