'use client'

import React, { useState, useEffect } from 'react'
import { 
  PageLayout,
  PageHeader,
  PageSection,
  VStack,
  HStack,
  Grid,
  Button,
  Select,
  Text,
  Badge
} from '@/components/design-system'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Download, 
  Package, 
  TrendingUp as ValuationIcon,
  TrendingUp,
  AlertTriangle,
  Clock,
  BarChart3,
  Printer
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'

type ReportType = 'summary' | 'valuation' | 'expiring' | 'lowstock' | 'movement' | 'aging'

interface StockSummaryItem {
  id: string
  code: string
  name: string
  category: string
  quantity: number
  unit: string
  minStock: number
  maxStock: number
  status: 'normal' | 'low' | 'out' | 'excess'
}

interface StockValuationItem {
  id: string
  code: string
  name: string
  quantity: number
  unit: string
  unitCost: number
  totalValue: number
  lastPurchasePrice: number
  averageCost: number
}

interface ExpiringLotItem {
  id: string
  lotNumber: string
  itemCode: string
  itemName: string
  quantity: number
  expiryDate: string
  daysUntilExpiry: number
  location: string
}

interface ReportStats {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  expiringItems: number
  excessStockItems: number
}

export default function InventoryReportsContent() {
  
  const { formatCurrency } = useCurrency()
const [reportType, setReportType] = useState<ReportType>('summary')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  
  // Report data states
  const [summaryData, setSummaryData] = useState<StockSummaryItem[]>([])
  const [valuationData, setValuationData] = useState<StockValuationItem[]>([])
  const [expiringData, setExpiringData] = useState<ExpiringLotItem[]>([])
  const [reportStats, setReportStats] = useState<ReportStats>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    expiringItems: 0,
    excessStockItems: 0
  })

  useEffect(() => {
    fetchReportData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, dateRange, categoryFilter, locationFilter])

  const fetchReportData = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (dateRange !== 'all') params.append('days', dateRange)
      if (categoryFilter !== 'all') params.append('categoryId', categoryFilter)
      if (locationFilter !== 'all') params.append('locationId', locationFilter)

      let endpoint = ''
      switch (reportType) {
        case 'summary':
          endpoint = '/api/inventory/reports/stock-summary'
          break
        case 'valuation':
          endpoint = '/api/inventory/reports/stock-value'
          break
        case 'expiring':
          endpoint = '/api/inventory/reports/expiring-lots'
          break
        case 'lowstock':
          endpoint = '/api/inventory/reports/stock-summary?status=low'
          break
        case 'movement':
          endpoint = '/api/inventory/reports/movement-summary'
          break
        case 'aging':
          endpoint = '/api/inventory/reports/aging-analysis'
          break
      }

      const response = await apiClient(`${endpoint}?${params}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch report data')
      }
      
      // Handle different report types
      switch (reportType) {
        case 'summary':
        case 'lowstock':
          setSummaryData(response?.data?.items || [])
          break
        case 'valuation':
          setValuationData(response?.data?.items || [])
          setReportStats(prev => ({ ...prev, totalValue: response?.data?.totalValue || 0 }))
          break
        case 'expiring':
          setExpiringData(response?.data?.items || [])
          break
      }

      // Update stats if provided
      if (response?.data?.stats) {
        setReportStats(response?.data.stats)
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
      setError('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams()
      params.append('format', format)
      params.append('type', reportType)
      if (dateRange !== 'all') params.append('days', dateRange)
      if (categoryFilter !== 'all') params.append('categoryId', categoryFilter)
      if (locationFilter !== 'all') params.append('locationId', locationFilter)

      const response = await apiClient<{ data: any }>(`/api/inventory/reports/export?${params}`, {
        method: 'GET'
      })

      if (response.ok) {
        // Create download link
        const blob = new Blob([response?.data], { 
          type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
        })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `inventory-${reportType}-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Failed to export report')
    }
  }

  const getReportTitle = () => {
    const titles = {
      summary: 'Stock Summary Report',
      valuation: 'Stock Valuation Report',
      expiring: 'Expiring Items Report',
      lowstock: 'Low Stock Alert Report',
      movement: 'Stock Movement Summary',
      aging: 'Stock Aging Analysis'
    }
    return titles[reportType]
  }

  const getReportIcon = () => {
    const icons = {
      summary: <Package className="h-5 w-5" />,
      valuation: <ValuationIcon className="h-5 w-5" />,
      expiring: <AlertTriangle className="h-5 w-5" />,
      lowstock: <TrendingUp className="h-5 w-5" />,
      movement: <BarChart3 className="h-5 w-5" />,
      aging: <Clock className="h-5 w-5" />
    }
    return icons[reportType]
  }

  const renderReport = () => {
    if (loading) {
      return (
        <VStack gap="lg" align="center" className="py-12">
          <Package className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Generating report...</Text>
        </VStack>
      )
    }

    if (error) {
      return (
        <VStack gap="lg" align="center" className="py-12">
          <AlertTriangle className="h-8 w-8 text-[var(--color-semantic-error-600)]" />
          <Text color="secondary">{error}</Text>
          <Button variant="primary" onClick={fetchReportData}>
            Try Again
          </Button>
        </VStack>
      )
    }

    switch (reportType) {
      case 'summary':
      case 'lowstock':
        return renderStockSummary()
      case 'valuation':
        return renderValuationReport()
      case 'expiring':
        return renderExpiringReport()
      default:
        return <Text>Report type not implemented yet</Text>
    }
  }

  const renderStockSummary = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item Code</TableHead>
          <TableHead>Item Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Current Stock</TableHead>
          <TableHead className="text-right">Min Stock</TableHead>
          <TableHead className="text-right">Max Stock</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(summaryData || []).map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.code}</TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell className="text-right">
              {item.quantity} {item.unit}
            </TableCell>
            <TableCell className="text-right">{item.minStock}</TableCell>
            <TableCell className="text-right">{item.maxStock}</TableCell>
            <TableCell>
              <Badge className={
                item.status === 'out' ? 'bg-red-100 text-red-800' :
                item.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                item.status === 'excess' ? 'bg-orange-100 text-orange-800' :
                'bg-green-100 text-green-800'
              }>
                {item.status === 'out' ? 'Out of Stock' :
                 item.status === 'low' ? 'Low Stock' :
                 item.status === 'excess' ? 'Excess Stock' :
                 'Normal'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  const renderValuationReport = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item Code</TableHead>
          <TableHead>Item Name</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Unit Cost</TableHead>
          <TableHead className="text-right">Average Cost</TableHead>
          <TableHead className="text-right">Total Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(valuationData || []).map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.code}</TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell className="text-right">
              {item.quantity} {item.unit}
            </TableCell>
            <TableCell className="text-right">
              ${formatCurrency(item.unitCost)}
            </TableCell>
            <TableCell className="text-right">
              ${formatCurrency(item.averageCost)}
            </TableCell>
            <TableCell className="text-right font-semibold">
              ${formatCurrency(item.totalValue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  const renderExpiringReport = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lot Number</TableHead>
          <TableHead>Item Code</TableHead>
          <TableHead>Item Name</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Expiry Date</TableHead>
          <TableHead>Days Until Expiry</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(expiringData || []).map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.lotNumber}</TableCell>
            <TableCell>{item.itemCode}</TableCell>
            <TableCell>{item.itemName}</TableCell>
            <TableCell className="text-right">{item.quantity}</TableCell>
            <TableCell>{item.location}</TableCell>
            <TableCell>{new Date(item.expiryDate).toLocaleDateString()}</TableCell>
            <TableCell>
              <Badge className={
                item.daysUntilExpiry <= 0 ? 'bg-red-100 text-red-800' :
                item.daysUntilExpiry <= 30 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }>
                {item.daysUntilExpiry <= 0 ? 'Expired' :
                 `${item.daysUntilExpiry} days`}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <PageHeader
          title="Inventory Reports"
          description="Generate and export inventory analysis reports"
          centered={false}
          actions={
            <HStack gap="md">
              <Button
                variant="outline"
                leftIcon={<Download />}
                onClick={() => handleExport('csv')}
                disabled={loading}
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                leftIcon={<Printer />}
                onClick={() => handleExport('pdf')}
                disabled={loading}
              >
                Export PDF
              </Button>
            </HStack>
          }
        />

        {/* Report Type Selector */}
        <PageSection>
          <Grid cols={3} gap="lg">
            {[
              { type: 'summary' as ReportType, title: 'Stock Summary', icon: <Package />, color: 'blue' },
              { type: 'valuation' as ReportType, title: 'Stock Valuation', icon: <ValuationIcon />, color: 'green' },
              { type: 'expiring' as ReportType, title: 'Expiring Items', icon: <AlertTriangle />, color: 'yellow' },
              { type: 'lowstock' as ReportType, title: 'Low Stock', icon: <TrendingUp />, color: 'red' },
              { type: 'movement' as ReportType, title: 'Movement Summary', icon: <BarChart3 />, color: 'purple' },
              { type: 'aging' as ReportType, title: 'Aging Analysis', icon: <Clock />, color: 'orange' }
            ].map((report) => (
              <Card 
                key={report.type}
                variant={reportType === report.type ? 'elevated' : 'default'}
                className={`cursor-pointer transition-all ${
                  reportType === report.type ? 'ring-2 ring-[var(--color-brand-primary-500)]' : ''
                }`}
                onClick={() => setReportType(report.type)}
              >
                <CardContent className="p-4">
                  <VStack gap="sm" align="center">
                    <div className={`p-3 rounded-lg bg-${report.color}-100 dark:bg-${report.color}-900`}>
                      {React.cloneElement(report.icon, { className: `h-6 w-6 text-${report.color}-600` })}
                    </div>
                    <Text size="sm" weight="medium" className="text-center">
                      {report.title}
                    </Text>
                  </VStack>
                </CardContent>
              </Card>
            ))}
          </Grid>
        </PageSection>

        {/* Report Stats */}
        {reportStats.totalValue > 0 && (
          <PageSection>
            <Grid cols={4} gap="lg">
              <Card>
                <CardContent>
                  <VStack gap="xs">
                    <Text size="sm" color="secondary">Total Items</Text>
                    <Text size="xl" weight="bold">{reportStats.totalItems}</Text>
                  </VStack>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <VStack gap="xs">
                    <Text size="sm" color="secondary">Total Value</Text>
                    <Text size="xl" weight="bold">
                      ${reportStats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </VStack>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <VStack gap="xs">
                    <Text size="sm" color="secondary">Low Stock Items</Text>
                    <Text size="xl" weight="bold" className="text-yellow-600">
                      {reportStats.lowStockItems}
                    </Text>
                  </VStack>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <VStack gap="xs">
                    <Text size="sm" color="secondary">Out of Stock</Text>
                    <Text size="xl" weight="bold" className="text-red-600">
                      {reportStats.outOfStockItems}
                    </Text>
                  </VStack>
                </CardContent>
              </Card>
            </Grid>
          </PageSection>
        )}

        {/* Filters */}
        <PageSection>
          <Card>
            <CardHeader>
              <HStack justify="between" align="center">
                <CardTitle>Report Filters</CardTitle>
                <HStack gap="sm">
                  {getReportIcon()}
                  <Text weight="medium">{getReportTitle()}</Text>
                </HStack>
              </HStack>
            </CardHeader>
            <CardContent className="pt-4">
              <HStack gap="md" className="flex-col sm:flex-row">
                <div className="sm:w-48">
                  <Select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    options={[
                      { value: '7', label: 'Last 7 days' },
                      { value: '30', label: 'Last 30 days' },
                      { value: '90', label: 'Last 90 days' },
                      { value: 'all', label: 'All time' }
                    ]}
                    label="Date Range"
                    fullWidth
                  />
                </div>
                <div className="sm:w-48">
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Categories' },
                      // Categories would be loaded dynamically
                    ]}
                    label="Category"
                    fullWidth
                  />
                </div>
                <div className="sm:w-48">
                  <Select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Locations' },
                      // Locations would be loaded dynamically
                    ]}
                    label="Location"
                    fullWidth
                  />
                </div>
              </HStack>
            </CardContent>
          </Card>
        </PageSection>

        {/* Report Content */}
        <PageSection>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {renderReport()}
            </CardContent>
          </Card>
        </PageSection>
      </VStack>
    </PageLayout>
  )
}