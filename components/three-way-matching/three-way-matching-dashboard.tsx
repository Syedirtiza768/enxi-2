'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  VStack, 
  HStack, 
  Grid, 
  Button, 
  Input, 
  Text, 
  Badge 
} from '@/components/design-system'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Download, 
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  FileText,
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'

interface MatchingException {
  id: string
  purchaseOrder: {
    poNumber: string
    supplier: { name: string }
  }
  type: 'QUANTITY_OVER_MATCH' | 'QUANTITY_UNDER_MATCH' | 'PRICE_VARIANCE' | 'AMOUNT_VARIANCE' | 'MISSING_GOODS_RECEIPT' | 'MISSING_INVOICE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  variance?: number
  variancePercentage?: number
  description: string
  requiresApproval: boolean
  createdAt: string
}

interface MatchingDashboardData {
  summary: {
    totalTransactions: number
    fullyMatched: number
    partiallyMatched: number
    overMatched: number
    underMatched: number
    pendingReview: number
    fullyMatchedRate: number
    averageMatchingTime: number
  }
  exceptions: MatchingException[]
  trends: {
    matchingRateByMonth: Array<{
      month: string
      rate: number
    }>
    discrepancyTypeDistribution: Array<{
      type: string
      count: number
      percentage: number
    }>
  }
}

export function ThreeWayMatchingDashboard(): React.JSX.Element | null {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const { formatCurrency } = useCurrency()
  const [data, setData] = useState<MatchingDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)
  const [selectedException, setSelectedException] = useState<MatchingException | null>(null)
  const [approvalReason, setApprovalReason] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient<MatchingDashboardData>('/api/three-way-matching/dashboard', {
        method: 'GET'
      })

      if (!response.ok || !response.data) {
        throw new Error('Failed to fetch matching data')
      }

      setData(response.data)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (exception: MatchingException): void => {
    setSelectedException(exception)
    setApprovalReason('')
    setShowApprovalDialog(true)
  }

  const handleReject = async (exception: MatchingException): void => {
    setSelectedException(exception)
    setRejectionReason('')
    setShowRejectionDialog(true)
  }

  const confirmApproval = async (): Promise<unknown> => {
    if (!selectedException || !approvalReason.trim()) return

    setActionLoading('approve')
    try {
      const response = await apiClient<{ success: boolean }>(`/api/three-way-matching/${selectedException.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          approvalReason: approvalReason.trim(),
          overrideDiscrepancies: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to approve matching exception')
      }

      setShowApprovalDialog(false)
      setSelectedException(null)
      setApprovalReason('')
      await fetchDashboardData() // Refresh data
    } catch (error) {
      console.error('Failed to approve exception:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const confirmRejection = async (): Promise<unknown> => {
    if (!selectedException || !rejectionReason.trim()) return

    setActionLoading('reject')
    try {
      const response = await apiClient<{ success: boolean }>(`/api/three-way-matching/${selectedException.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim(),
          requiredActions: ['Review with supplier', 'Verify documentation']
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reject matching exception')
      }

      setShowRejectionDialog(false)
      setSelectedException(null)
      setRejectionReason('')
      await fetchDashboardData() // Refresh data
    } catch (error) {
      console.error('Failed to reject exception:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const exportReport = async (): Promise<void> => {
    try {
      const response = await apiClient<Blob>('/api/three-way-matching/export', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to export report')
      }

      // Create and download file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `three-way-matching-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export report:', error)
    }
  }

  const getSeverityBadge = (severity: string): void => {
    const config = {
      HIGH: { className: 'bg-red-100 text-red-800' },
      MEDIUM: { className: 'bg-yellow-100 text-yellow-800' },
      LOW: { className: 'bg-green-100 text-green-800' }
    }
    
    const { className } = config[severity as keyof typeof config] || { className: 'bg-gray-100 text-gray-800' }
    return <Badge className={className}>{severity}</Badge>
  }

  const getTypeDescription = (type: string): void => {
    const descriptions = {
      QUANTITY_OVER_MATCH: 'Quantity Over Match',
      QUANTITY_UNDER_MATCH: 'Quantity Under Match',
      PRICE_VARIANCE: 'Price Variance',
      AMOUNT_VARIANCE: 'Amount Variance',
      MISSING_GOODS_RECEIPT: 'Missing Goods Receipt',
      MISSING_INVOICE: 'Missing Invoice'
    }
    return descriptions[type as keyof typeof descriptions] || type
  }

  const filteredExceptions = data?.exceptions.filter(exception => {
    const matchesSearch = search === '' || 
      exception.purchaseOrder.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      exception.purchaseOrder.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      exception.description.toLowerCase().includes(search.toLowerCase())
    
    const matchesType = typeFilter === 'all' || exception.type === typeFilter
    const matchesSeverity = severityFilter === 'all' || exception.severity === severityFilter
    
    return matchesSearch && matchesType && matchesSeverity
  }) || []

  if (loading) {
    return (
      <VStack gap="lg" align="center" className="py-12">
        <BarChart3 className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
        <Text color="secondary">Loading matching data...</Text>
      </VStack>
    )
  }

  if (error) {
    return (
      <VStack gap="lg" align="center" className="py-12">
        <AlertTriangle className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
        <VStack gap="sm" align="center">
          <Text size="lg" weight="semibold">Error loading matching data</Text>
          <Text color="secondary">{error}</Text>
        </VStack>
        <Button variant="primary" onClick={fetchDashboardData}>
          Try Again
        </Button>
      </VStack>
    )
  }

  if (!data) return null

  return (
    <VStack gap="xl">
      {/* Header */}
      <HStack justify="between" align="center">
        <VStack gap="xs">
          <Text size="xl" weight="bold">Three-Way Matching Dashboard</Text>
          <Text color="secondary">Monitor procurement document matching and exceptions</Text>
        </VStack>
        <HStack gap="sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDashboardData}
            loading={loading}
            leftIcon={<RefreshCw />}
            aria-label="Refresh data"
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportReport}
            leftIcon={<Download />}
          >
            Export Report
          </Button>
        </HStack>
      </HStack>

      {/* Summary Statistics */}
      <Grid cols={4} gap="lg">
        <Card>
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <FileText className="h-5 w-5 text-[var(--color-brand-primary-600)]" />
                <Text size="sm" weight="medium" color="secondary">Total Transactions</Text>
              </HStack>
              <Text size="xl" weight="bold">{data.summary.totalTransactions}</Text>
            </VStack>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <Text size="sm" weight="medium" color="secondary">Fully Matched</Text>
              </HStack>
              <Text size="xl" weight="bold">{data.summary.fullyMatched}</Text>
              <Text size="sm" color="secondary">
                {data.summary.fullyMatchedRate.toFixed(1)}% success rate
              </Text>
            </VStack>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <Text size="sm" weight="medium" color="secondary">Pending Review</Text>
              </HStack>
              <Text size="xl" weight="bold">{data.summary.pendingReview}</Text>
            </VStack>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <Clock className="h-5 w-5 text-blue-600" />
                <Text size="sm" weight="medium" color="secondary">Avg. Matching Time</Text>
              </HStack>
              <Text size="xl" weight="bold">{data.summary.averageMatchingTime.toFixed(1)}h</Text>
            </VStack>
          </CardContent>
        </Card>
      </Grid>

      {/* Trends Section */}
      <Grid cols={2} gap="lg">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Matching Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VStack gap="md">
              {data.trends.matchingRateByMonth.map((trend, index) => (
                <HStack key={index} justify="between" align="center">
                  <Text size="sm">{trend.month}</Text>
                  <Text weight="semibold">{trend.rate.toFixed(1)}%</Text>
                </HStack>
              ))}
            </VStack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Discrepancy Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VStack gap="md">
              {data.trends.discrepancyTypeDistribution.map((dist, index) => (
                <HStack key={index} justify="between" align="center">
                  <Text size="sm">{getTypeDescription(dist.type)}</Text>
                  <Text weight="semibold">{dist.percentage.toFixed(1)}%</Text>
                </HStack>
              ))}
            </VStack>
          </CardContent>
        </Card>
      </Grid>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <HStack gap="md" className="flex-col sm:flex-row">
            <div className="flex-1">
              <Input
                placeholder="Search exceptions by PO number, supplier, or description..."
                value={search}
                onChange={(e): void => setSearch(e.target.value)}
                leftIcon={<Search />}
                fullWidth
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e): void => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] min-w-[150px]"
            >
              <option value="all">All Types</option>
              <option value="PRICE_VARIANCE">Price Variance</option>
              <option value="QUANTITY_OVER_MATCH">Quantity Over</option>
              <option value="QUANTITY_UNDER_MATCH">Quantity Under</option>
              <option value="MISSING_GOODS_RECEIPT">Missing GR</option>
              <option value="MISSING_INVOICE">Missing Invoice</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e): void => setSeverityFilter(e.target.value)}
              className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] min-w-[120px]"
            >
              <option value="all">All Severities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </HStack>
        </CardContent>
      </Card>

      {/* Exceptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Matching Exceptions ({filteredExceptions.length})</CardTitle>
        </CardHeader>
        {filteredExceptions.length === 0 ? (
          <CardContent className="py-12">
            <VStack gap="lg" align="center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <VStack gap="sm" align="center">
                <Text size="lg" weight="semibold">No exceptions found</Text>
                <Text color="secondary">
                  {search || typeFilter !== 'all' || severityFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'All transactions are properly matched'}
                </Text>
              </VStack>
            </VStack>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Purchase Order</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Exception Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExceptions.map((exception) => (
                <TableRow key={exception.id}>
                  <TableCell className="font-medium">
                    {exception.purchaseOrder.poNumber}
                  </TableCell>
                  <TableCell>{exception.purchaseOrder.supplier?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge className="bg-blue-100 text-blue-800">
                      {getTypeDescription(exception.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{getSeverityBadge(exception.severity)}</TableCell>
                  <TableCell>
                    {exception.variance && exception.variancePercentage ? (
                      <div>
                        <div className="font-medium">
                          {formatCurrency(exception.variance)}
                        </div>
                        <div className="text-sm text-gray-500">
                          ({exception.variancePercentage.toFixed(1)}%)
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-48 truncate" title={exception.description}>
                      {exception.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(exception.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <HStack gap="xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(): void => router.push(`/three-way-matching/${exception.id}`)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {exception.requiresApproval && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(): void => handleApprove(exception)}
                            className="text-green-600 hover:text-green-700"
                            title="Approve"
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(): void => handleReject(exception)}
                            className="text-red-600 hover:text-red-700"
                            title="Reject"
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </HStack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Matching Exception</DialogTitle>
          </DialogHeader>
          <VStack gap="lg" className="py-4">
            <Text>
              Are you sure you want to approve this matching exception for{' '}
              <strong>{selectedException?.purchaseOrder.poNumber}</strong>?
            </Text>
            <VStack gap="sm">
              <Text size="sm" weight="medium">Approval Reason *</Text>
              <Textarea
                value={approvalReason}
                onChange={(e): void => setApprovalReason(e.target.value)}
                placeholder="Enter the reason for approving this exception..."
                rows={3}
              />
            </VStack>
            <HStack gap="sm" justify="end">
              <Button
                variant="ghost"
                onClick={(): void => setShowApprovalDialog(false)}
                disabled={!!actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmApproval}
                loading={actionLoading === 'approve'}
                disabled={!approvalReason.trim() || !!actionLoading}
              >
                Confirm Approval
              </Button>
            </HStack>
          </VStack>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Matching Exception</DialogTitle>
          </DialogHeader>
          <VStack gap="lg" className="py-4">
            <Text>
              Reject the matching exception for{' '}
              <strong>{selectedException?.purchaseOrder.poNumber}</strong>?
            </Text>
            <VStack gap="sm">
              <Text size="sm" weight="medium">Rejection Reason *</Text>
              <Textarea
                value={rejectionReason}
                onChange={(e): void => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejecting this exception..."
                rows={3}
              />
            </VStack>
            <HStack gap="sm" justify="end">
              <Button
                variant="ghost"
                onClick={(): void => setShowRejectionDialog(false)}
                disabled={!!actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmRejection}
                loading={actionLoading === 'reject'}
                disabled={!rejectionReason.trim() || !!actionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirm Rejection
              </Button>
            </HStack>
          </VStack>
        </DialogContent>
      </Dialog>
    </VStack>
  )
}