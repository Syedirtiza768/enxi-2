'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  Download,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react'
import { 
  Report, 
  ReportFilter, 
  Dashboard, 
  DashboardWidget,
  formatReportValue,
  getDateRangeFilter,
  calculateAggregates
} from '@/modules/reporting'

interface AdvancedReportingProps {
  className?: string
}

// Sample data for demonstration
const sampleReports: Report[] = [
  {
    id: '1',
    name: 'Sales Summary Report',
    description: 'Monthly sales performance metrics',
    type: 'standard',
    category: 'sales',
    format: 'mixed',
    filters: [],
    columns: [
      { field: 'date', label: 'Date', type: 'date' },
      { field: 'revenue', label: 'Revenue', type: 'currency', aggregate: 'sum' },
      { field: 'orders', label: 'Orders', type: 'number', aggregate: 'count' },
      { field: 'avgOrderValue', label: 'Avg Order Value', type: 'currency', aggregate: 'avg' }
    ],
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Inventory Status Report',
    description: 'Current stock levels and movements',
    type: 'standard',
    category: 'inventory',
    format: 'table',
    filters: [],
    columns: [
      { field: 'sku', label: 'SKU', type: 'string' },
      { field: 'name', label: 'Product Name', type: 'string' },
      { field: 'quantity', label: 'Quantity', type: 'number', aggregate: 'sum' },
      { field: 'value', label: 'Value', type: 'currency', aggregate: 'sum' }
    ],
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const sampleDashboardData = {
  sales: {
    total: 245678.90,
    change: 12.5,
    trend: 'up' as const
  },
  orders: {
    total: 156,
    change: -3.2,
    trend: 'down' as const
  },
  inventory: {
    total: 1823,
    change: 5.7,
    trend: 'up' as const
  },
  customers: {
    total: 423,
    change: 8.1,
    trend: 'up' as const
  }
}

export function AdvancedReporting({ className }: AdvancedReportingProps) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('this_month')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [filters, setFilters] = useState<ReportFilter[]>([])

  const handleRunReport = async (): Promise<unknown> => {
    if (!selectedReport) return
    
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsLoading(false)
  }

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting report as ${format}`)
    // Implementation would go here
  }

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    trend, 
    icon: Icon 
  }: { 
    title: string
    value: number | string
    change: number
    trend: 'up' | 'down'
    icon: React.ElementType
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">
              {typeof value === 'number' ? 
                formatReportValue(value, 'currency', 'AED') : 
                value
              }
            </h3>
            <div className="flex items-center mt-2">
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(change)}%
              </span>
            </div>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground opacity-30" />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-[400px]">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Executive Dashboard</h2>
            <div className="flex gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Sales"
              value={sampleDashboardData.sales.total}
              change={sampleDashboardData.sales.change}
              trend={sampleDashboardData.sales.trend}
              icon={BarChart3}
            />
            <MetricCard
              title="Orders"
              value={sampleDashboardData.orders.total}
              change={sampleDashboardData.orders.change}
              trend={sampleDashboardData.orders.trend}
              icon={LineChart}
            />
            <MetricCard
              title="Inventory Items"
              value={sampleDashboardData.inventory.total}
              change={sampleDashboardData.inventory.change}
              trend={sampleDashboardData.inventory.trend}
              icon={PieChart}
            />
            <MetricCard
              title="Active Customers"
              value={sampleDashboardData.customers.total}
              change={sampleDashboardData.customers.change}
              trend={sampleDashboardData.customers.trend}
              icon={TrendingUp}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>Last 30 days performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <LineChart className="h-16 w-16 opacity-30" />
                  <span className="ml-4">Chart visualization would go here</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>By revenue this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Product A', 'Product B', 'Product C', 'Product D'].map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{product}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatReportValue((idx + 1) * 12345.67, 'currency', 'AED')}
                        </span>
                        <Badge variant="secondary">
                          {((4 - idx) * 25)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Run Reports</CardTitle>
              <CardDescription>Select and configure reports to generate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select 
                    value={selectedReport?.id || ''} 
                    onValueChange={(id) => setSelectedReport(sampleReports.find(r => r.id === id) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a report" />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleReports.map((report) => (
                        <SelectItem key={report.id} value={report.id}>
                          {report.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="last_week">Last Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedReport && (
                <div className="space-y-2">
                  <Label>Additional Filters</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Add filter..." className="flex-1" />
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleRunReport} 
                  disabled={!selectedReport || isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Run Report'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleExport('pdf')}
                  disabled={!selectedReport}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleExport('excel')}
                  disabled={!selectedReport}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedReport && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedReport.name}</CardTitle>
                <CardDescription>{selectedReport.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto opacity-30 mb-4" />
                    <p>Report results would be displayed here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Analytics</CardTitle>
              <CardDescription>Deep dive into your business data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <LineChart className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold">Trend Analysis</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Identify patterns and trends in your data
                    </p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold">Comparative Analysis</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Compare performance across segments
                    </p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold">Predictive Analytics</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Forecast future performance
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Export as default for compatibility
export default AdvancedReporting