'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format, subDays, subMonths, startOfYear, endOfYear } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  FileText,
  Image,
  Settings
} from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import * as Papa from 'papaparse'
import { CHART_COLORS, CHART_THEMES, formatNumber } from '@/lib/utils/chart-utils'

// Types
interface SalesData {
  date: string
  revenue: number
  orders: number
  averageOrderValue: number
  customers: number
}

interface ProductData {
  name: string
  sales: number
  revenue: number
  growth: number
  category: string
}

interface CustomerData {
  name: string
  revenue: number
  orders: number
  segment: string
  region: string
}

interface RegionData {
  region: string
  sales: number
  customers: number
  growth: number
}

interface FunnelData {
  stage: string
  value: number
  conversion: number
}

interface ChartFilters {
  dateRange: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate: string
  customers: string[]
  products: string[]
  regions: string[]
}

interface MetricCard {
  title: string
  value: number | string
  change: number
  trend: 'up' | 'down' | 'stable'
  target?: number
  format: 'currency' | 'number' | 'percentage'
}

// Use primary color palette
const COLORS = CHART_COLORS.primary

export default function SalesChartsComponent() {
  // State management
  const [isLoading, setIsLoading] = useState(false)
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [productData, setProductData] = useState<ProductData[]>([])
  const [customerData, setCustomerData] = useState<CustomerData[]>([])
  const [regionData, setRegionData] = useState<RegionData[]>([])
  const [funnelData, setFunnelData] = useState<FunnelData[]>([])
  const [metrics, setMetrics] = useState<MetricCard[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [filters, setFilters] = useState<ChartFilters>({
    dateRange: 'monthly',
    startDate: format(subMonths(new Date(), 12), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    customers: [],
    products: [],
    regions: []
  })
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [showFilters, setShowFilters] = useState(false)
  const [drillDownData, setDrillDownData] = useState<any>(null)
  const [_selectedMetric, setSelectedMetric] = useState<string>('revenue')

  // Fetch data from API
  const fetchSalesData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        includePerformance: 'true',
        includeCustomers: 'true',
        includeProducts: 'true',
        includeForecast: 'true',
        includeConversion: 'true'
      })

      const response = await fetch(`/api/reporting/sales-analytics?${params}`)
      const data = await response.json()

      if (data.data) {
        // Transform API data to chart format
        setSalesData(transformSalesData(data.data))
        setProductData(transformProductData(data.data))
        setCustomerData(transformCustomerData(data.data))
        setRegionData(transformRegionData(data.data))
        setFunnelData(transformFunnelData(data.data))
        setMetrics(transformMetrics(data.data))
      }
    } catch (error) {
      console.error('Error fetching sales data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // Data transformation functions
  const transformSalesData = (data: { performance?: { dailySales?: unknown[] } }): SalesData[] => {
    if (!data.performance?.dailySales) return []
    
    return data.performance.dailySales.map((item: Record<string, unknown>) => ({
      date: format(new Date(item.date), 'MMM dd'),
      revenue: item.revenue,
      orders: item.orders,
      averageOrderValue: item.averageOrderValue,
      customers: Math.floor(item.orders * 0.8) // Estimated unique customers
    }))
  }

  const transformProductData = (data: { products?: { topSellingProducts?: unknown[] } }): ProductData[] => {
    if (!data.products?.topSellingProducts) return []
    
    return data.products.topSellingProducts.map((item: Record<string, unknown>) => ({
      name: item.itemName || 'Product',
      sales: item.quantitySold || 0,
      revenue: item.revenue || 0,
      growth: Math.random() * 30 - 10, // Mock growth data
      category: item.categoryName || 'Other'
    }))
  }

  const transformCustomerData = (data: { customers?: { topCustomers?: unknown[] } }): CustomerData[] => {
    if (!data.customers?.topCustomers) return []
    
    return data.customers.topCustomers.map((item: Record<string, unknown>) => ({
      name: item.customerName,
      revenue: item.totalRevenue,
      orders: item.orderCount,
      segment: item.loyalty,
      region: 'UAE' // Mock region data
    }))
  }

  const transformRegionData = (data: Record<string, unknown>): RegionData[] => {
    // Mock regional data since it's not in the API yet
    return [
      { region: 'Dubai', sales: 150000, customers: 45, growth: 12 },
      { region: 'Abu Dhabi', sales: 120000, customers: 38, growth: 8 },
      { region: 'Sharjah', sales: 80000, customers: 25, growth: 15 },
      { region: 'Ajman', sales: 45000, customers: 15, growth: 5 },
      { region: 'Other Emirates', sales: 35000, customers: 12, growth: -2 }
    ]
  }

  const transformFunnelData = (data: { conversion?: Record<string, unknown> }): FunnelData[] => {
    if (!data.conversion) return []
    
    return [
      { stage: 'Leads', value: data.conversion.leadToQuotation.leadsGenerated, conversion: 100 },
      { stage: 'Quotations', value: data.conversion.leadToQuotation.quotationsCreated, conversion: data.conversion.leadToQuotation.conversionRate },
      { stage: 'Orders', value: data.conversion.quotationToOrder.ordersReceived, conversion: data.conversion.quotationToOrder.conversionRate },
      { stage: 'Invoices', value: data.conversion.orderToInvoice.invoicesGenerated, conversion: data.conversion.orderToInvoice.conversionRate },
      { stage: 'Paid', value: data.conversion.invoiceToPaid.invoicesPaid, conversion: data.conversion.invoiceToPaid.conversionRate }
    ]
  }

  const transformMetrics = (data: { metrics?: Record<string, unknown> }): MetricCard[] => {
    if (!data.metrics) return []
    
    return [
      {
        title: 'Total Revenue',
        value: data.metrics.totalRevenue,
        change: data.metrics.salesGrowth,
        trend: data.metrics.salesGrowth > 0 ? 'up' : data.metrics.salesGrowth < 0 ? 'down' : 'stable',
        format: 'currency'
      },
      {
        title: 'Total Orders',
        value: data.metrics.totalOrders,
        change: 8.5,
        trend: 'up',
        format: 'number'
      },
      {
        title: 'Average Order Value',
        value: data.metrics.averageOrderValue,
        change: 3.2,
        trend: 'up',
        format: 'currency'
      },
      {
        title: 'Conversion Rate',
        value: data.metrics.conversionRate,
        change: -1.5,
        trend: 'down',
        format: 'percentage'
      },
      {
        title: 'New Customers',
        value: data.metrics.newCustomers,
        change: 12.3,
        trend: 'up',
        format: 'number'
      },
      {
        title: 'Target Achievement',
        value: data.metrics.targetAchievement,
        change: 5.8,
        trend: 'up',
        target: 100,
        format: 'percentage'
      }
    ]
  }

  // Format values for display
  const formatValue = (value: number | string, format: string): string => {
    if (typeof value === 'string') return value
    return formatNumber(value, format as 'currency' | 'number' | 'percentage')
  }

  // Export functions
  const exportToPNG = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId)
    if (!element) return

    try {
      const canvas = await html2canvas(element, { backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff' })
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error('Error exporting PNG:', error)
    }
  }

  const exportToPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId)
    if (!element) return

    try {
      const canvas = await html2canvas(element, { backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('l', 'mm', 'a4')
      const imgWidth = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`${filename}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
    }
  }

  const exportToCSV = (data: any[], filename: string) => {
    try {
      const csv = Papa.unparse(data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.download = `${filename}.csv`
      link.href = URL.createObjectURL(blob)
      link.click()
    } catch (error) {
      console.error('Error exporting CSV:', error)
    }
  }

  // Chart event handlers
  const handleChartClick = (data: any, dataKey: string) => {
    setDrillDownData({ data, dataKey })
  }

  // Filter handlers
  const handleDateRangeChange = (range: string) => {
    const now = new Date()
    let startDate: Date
    let endDate = now

    switch (range) {
      case 'daily':
        startDate = subDays(now, 30)
        break
      case 'weekly':
        startDate = subDays(now, 7 * 12)
        break
      case 'monthly':
        startDate = subMonths(now, 12)
        break
      case 'yearly':
        startDate = startOfYear(subMonths(now, 24))
        endDate = endOfYear(now)
        break
      default:
        startDate = subMonths(now, 12)
    }

    setFilters(prev => ({
      ...prev,
      dateRange: range as string,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    }))
  }

  const resetFilters = () => {
    setFilters({
      dateRange: 'monthly',
      startDate: format(subMonths(new Date(), 12), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      customers: [],
      products: [],
      regions: []
    })
  }

  // Load data on mount and filter changes
  useEffect(() => {
    fetchSalesData()
  }, [fetchSalesData])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
          <p className="font-medium">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatValue(entry.value, entry.dataKey === 'revenue' ? 'currency' : 'number')}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Metric cards component
  const MetricCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.title}</p>
              <p className="text-2xl font-bold">{formatValue(metric.value, metric.format)}</p>
              {metric.target && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Target: {formatValue(metric.target, metric.format)}</span>
                    <span>{((metric.value as number / metric.target) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(((metric.value as number) / metric.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <div className={`flex items-center ${
                metric.trend === 'up' ? 'text-green-600' : 
                metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {metric.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                 metric.trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
                <span className="text-sm ml-1">{metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive sales performance and analytics
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSalesData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Options</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => exportToPNG('sales-charts', 'sales-dashboard')}
                    className="flex items-center gap-2"
                  >
                    <Image className="w-4 h-4" />
                    Export PNG
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportToPDF('sales-charts', 'sales-dashboard')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Export PDF
                  </Button>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => exportToCSV(salesData, 'sales-data')}
                  className="w-full flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export CSV Data
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            {theme === 'light' ? 'Dark' : 'Light'}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select 
                value={filters.dateRange} 
                onValueChange={handleDateRangeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (30 days)</SelectItem>
                  <SelectItem value="weekly">Weekly (12 weeks)</SelectItem>
                  <SelectItem value="monthly">Monthly (12 months)</SelectItem>
                  <SelectItem value="yearly">Yearly (2 years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            
            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters} className="w-full">
                Reset Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Metric Cards */}
      <MetricCards />

      {/* Charts */}
      <div id="sales-charts" className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="regions">Regions</TabsTrigger>
            <TabsTrigger value="funnel">Pipeline</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trends */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Revenue Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEMES[theme].grid} />
                    <XAxis dataKey="date" stroke={CHART_THEMES[theme].text} />
                    <YAxis stroke={CHART_THEMES[theme].text} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke={COLORS[0]} 
                      strokeWidth={3}
                      dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Orders Overview */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Orders & AOV</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEMES[theme].grid} />
                    <XAxis dataKey="date" stroke={CHART_THEMES[theme].text} />
                    <YAxis stroke={CHART_THEMES[theme].text} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="orders" fill={COLORS[1]} />
                    <Bar dataKey="averageOrderValue" fill={COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sales Performance Trends</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEMES[theme].grid} />
                  <XAxis dataKey="date" stroke={CHART_THEMES[theme].text} />
                  <YAxis stroke={CHART_THEMES[theme].text} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1"
                    stroke={COLORS[0]} 
                    fill={`${COLORS[0]}80`} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="orders" 
                    stackId="2"
                    stroke={COLORS[1]} 
                    fill={`${COLORS[1]}80`} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Top Products by Revenue</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productData.slice(0, 10)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEMES[theme].grid} />
                    <XAxis type="number" stroke={CHART_THEMES[theme].text} />
                    <YAxis type="category" dataKey="name" stroke={CHART_THEMES[theme].text} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" fill={COLORS[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Product Category Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productData.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {productData.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Top Customers by Revenue</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={customerData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEMES[theme].grid} />
                    <XAxis dataKey="name" stroke={CHART_THEMES[theme].text} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke={CHART_THEMES[theme].text} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" fill={COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Customer Segments</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'VIP', value: customerData.filter(c => c.segment === 'vip').length },
                        { name: 'Regular', value: customerData.filter(c => c.segment === 'regular').length },
                        { name: 'New', value: customerData.filter(c => c.segment === 'new').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index + 3]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          {/* Regions Tab */}
          <TabsContent value="regions" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Regional Sales Performance</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={regionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEMES[theme].grid} />
                  <XAxis dataKey="region" stroke={CHART_THEMES[theme].text} />
                  <YAxis stroke={CHART_THEMES[theme].text} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="sales" fill={COLORS[4]} />
                  <Bar dataKey="customers" fill={COLORS[5]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Pipeline Funnel Tab */}
          <TabsContent value="funnel" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sales Pipeline Funnel</h3>
              <div className="space-y-4">
                {funnelData.map((stage, index) => (
                  <div key={stage.stage} className="flex items-center space-x-4">
                    <div className="w-24 text-sm font-medium">{stage.stage}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                      <div 
                        className="h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ 
                          width: `${(stage.value / (funnelData[0]?.value || 1)) * 100}%`,
                          backgroundColor: COLORS[index]
                        }}
                      >
                        {stage.value}
                      </div>
                    </div>
                    <div className="w-20 text-sm text-right">
                      {stage.conversion.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Drill-down Modal */}
      {drillDownData && (
        <Dialog open={!!drillDownData} onOpenChange={() => setDrillDownData(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detailed View</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded">
                {JSON.stringify(drillDownData, null, 2)}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg flex items-center space-x-4">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Loading sales data...</span>
          </div>
        </div>
      )}
    </div>
  )
}