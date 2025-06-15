'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  VStack, 
  HStack, 
  Grid, 
  Button, 
  Text, 
  Badge 
} from '@/components/design-system'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Package, 
  FileText, 
  Receipt,
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  XCircle,
  Info,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  BarChart3,
  Shield,
  Zap,
  Eye,
  ThumbsUp,
  ThumbsDown,
  FileCheck,
  FileX,
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useCurrency } from '@/lib/contexts/currency-context'
import { cn } from '@/lib/utils'

interface ThreeWayMatchingAnalysis {
  purchaseOrder: {
    id: string
    poNumber: string
    supplier: {
      id: string
      name: string
      code: string
    }
    totalAmount: number
    currency: string
    orderDate: string
    expectedDate?: string
  }
  goodsReceipts: Array<{
    id: string
    receiptNumber: string
    receivedDate: string
    status: string
    items: Array<{
      id: string
      itemId: string
      item: {
        code: string
        name: string
      }
      quantityReceived: number
      unitCost: number
      totalCost: number
      qualityStatus: string
    }>
  }>
  supplierInvoices: Array<{
    id: string
    invoiceNumber: string
    invoiceDate: string
    status: string
    matchingStatus: string
    totalAmount: number
    items: Array<{
      id: string
      description: string
      quantity: number
      unitPrice: number
      totalAmount: number
    }>
  }>
  discrepancies: Array<{
    id: string
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    item: {
      id: string
      code: string
      name: string
    }
    description: string
    expectedQuantity?: number
    actualQuantity?: number
    expectedPrice?: number
    actualPrice?: number
    variance?: number
    variancePercentage?: number
    requiresApproval: boolean
  }>
  summary: {
    totalItems: number
    fullyMatched: number
    partiallyMatched: number
    overMatched: number
    underMatched: number
    pendingReview: number
    matchingStatus: string
  }
  analysisDate: string
}

interface ThreeWayMatchingDetailProps {
  purchaseOrderId: string
}

// Validation thresholds and rules
const MATCHING_RULES = {
  QUANTITY_TOLERANCE: 0.05, // 5% tolerance for quantity matching
  PRICE_TOLERANCE: 0.02, // 2% tolerance for price matching
  HIGH_VARIANCE_THRESHOLD: 0.10, // 10% variance requires approval
  CRITICAL_VARIANCE_THRESHOLD: 0.20, // 20% variance is critical
  AUTO_APPROVAL_THRESHOLD: 0.01, // 1% variance can be auto-approved
}

// Severity color mappings
const SEVERITY_COLORS = {
  LOW: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-600',
  },
  MEDIUM: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-600',
  },
  HIGH: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-600',
  },
  CRITICAL: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800',
    icon: 'text-purple-600',
  },
}

// Helper functions for validation
const validateMatchingThresholds = (variance: number): { severity: string; requiresApproval: boolean } => {
  const absVariance = Math.abs(variance)
  
  if (absVariance <= MATCHING_RULES.AUTO_APPROVAL_THRESHOLD) {
    return { severity: 'LOW', requiresApproval: false }
  }
  
  if (absVariance <= MATCHING_RULES.QUANTITY_TOLERANCE) {
    return { severity: 'LOW', requiresApproval: false }
  }
  
  if (absVariance <= MATCHING_RULES.HIGH_VARIANCE_THRESHOLD) {
    return { severity: 'MEDIUM', requiresApproval: true }
  }
  
  if (absVariance <= MATCHING_RULES.CRITICAL_VARIANCE_THRESHOLD) {
    return { severity: 'HIGH', requiresApproval: true }
  }
  
  return { severity: 'CRITICAL', requiresApproval: true }
}

const validateDocumentCompleteness = (analysis: ThreeWayMatchingAnalysis): Array<{
  type: string
  message: string
  severity: 'warning' | 'error'
}> => {
  const issues = []
  
  // Check for missing goods receipts
  if (analysis.goodsReceipts.length === 0) {
    issues.push({
      type: 'MISSING_GOODS_RECEIPT',
      message: 'No goods receipts found for this purchase order',
      severity: 'error' as const
    })
  }
  
  // Check for missing invoices
  if (analysis.supplierInvoices.length === 0) {
    issues.push({
      type: 'MISSING_INVOICE',
      message: 'No supplier invoices found for this purchase order',
      severity: 'warning' as const
    })
  }
  
  // Check date sequence
  const poDate = new Date(analysis.purchaseOrder.orderDate)
  
  analysis.goodsReceipts.forEach(receipt => {
    const receiptDate = new Date(receipt.receivedDate)
    if (receiptDate < poDate) {
      issues.push({
        type: 'INVALID_DATE_SEQUENCE',
        message: `Goods receipt ${receipt.receiptNumber} dated before purchase order`,
        severity: 'error' as const
      })
    }
  })
  
  analysis.supplierInvoices.forEach(invoice => {
    const invoiceDate = new Date(invoice.invoiceDate)
    if (invoiceDate < poDate) {
      issues.push({
        type: 'INVALID_DATE_SEQUENCE',
        message: `Invoice ${invoice.invoiceNumber} dated before purchase order`,
        severity: 'error' as const
      })
    }
  })
  
  return issues
}

export function ThreeWayMatchingDetail({ purchaseOrderId }: ThreeWayMatchingDetailProps): React.JSX.Element {
  const { formatCurrency } = useCurrency()
  const [analysis, setAnalysis] = useState<ThreeWayMatchingAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDiscrepancies, setExpandedDiscrepancies] = useState<Set<string>>(new Set())
  const [selectedTab, setSelectedTab] = useState('discrepancies')
  const [validationIssues, setValidationIssues] = useState<Array<{
    type: string
    message: string
    severity: 'warning' | 'error'
  }>>([])
  const [matchingProgress, setMatchingProgress] = useState(0)

  const fetchAnalysis = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    setMatchingProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setMatchingProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await apiClient<ThreeWayMatchingAnalysis>(`/api/three-way-matching/analyze/${purchaseOrderId}`, {
        method: 'GET'
      })

      clearInterval(progressInterval)
      setMatchingProgress(100)

      if (!response.ok || !response?.data) {
        throw new Error(response.error || 'Failed to fetch three-way matching analysis')
      }

      const data = response?.data
      setAnalysis(data)
      
      // Validate the analysis results
      const issues = validateDocumentCompleteness(data)
      setValidationIssues(issues)
      
      // Calculate matching progress
      if (data.summary.totalItems > 0) {
        const matchedPercentage = (data.summary.fullyMatched / data.summary.totalItems) * 100
        setMatchingProgress(matchedPercentage)
      }
    } catch (error) {
      console.error('Error fetching analysis:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setTimeout(() => setMatchingProgress(0), 500)
    }
  }, [purchaseOrderId])

  useEffect(() => {
    if (purchaseOrderId) {
      fetchAnalysis()
    }
  }, [purchaseOrderId, fetchAnalysis])

  const toggleDiscrepancy = (discrepancyId: string): void => {
    setExpandedDiscrepancies(prev => {
      const next = new Set(prev)
      if (next.has(discrepancyId)) {
        next.delete(discrepancyId)
      } else {
        next.add(discrepancyId)
      }
      return next
    })
  }

  const getMatchingStatusBadge = (status: string): void => {
    const config = {
      FULLY_MATCHED: { 
        label: 'Fully Matched', 
        className: 'bg-green-100 text-green-800 border-green-300', 
        icon: <CheckCircle2 className="h-3 w-3" />,
        description: 'All documents match perfectly'
      },
      PARTIALLY_MATCHED: { 
        label: 'Partially Matched', 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
        icon: <AlertCircle className="h-3 w-3" />,
        description: 'Some items match with minor discrepancies'
      },
      OVER_MATCHED: { 
        label: 'Over Matched', 
        className: 'bg-red-100 text-red-800 border-red-300', 
        icon: <TrendingUp className="h-3 w-3" />,
        description: 'Received or invoiced more than ordered'
      },
      UNDER_MATCHED: { 
        label: 'Under Matched', 
        className: 'bg-orange-100 text-orange-800 border-orange-300', 
        icon: <TrendingDown className="h-3 w-3" />,
        description: 'Received or invoiced less than ordered'
      },
      PENDING: { 
        label: 'Pending', 
        className: 'bg-gray-100 text-gray-800 border-gray-300', 
        icon: <Clock className="h-3 w-3" />,
        description: 'Awaiting documents or review'
      },
      REJECTED: { 
        label: 'Rejected', 
        className: 'bg-red-100 text-red-800 border-red-300', 
        icon: <XCircle className="h-3 w-3" />,
        description: 'Matching failed due to critical errors'
      },
      APPROVED_WITH_VARIANCE: { 
        label: 'Approved with Variance', 
        className: 'bg-blue-100 text-blue-800 border-blue-300', 
        icon: <CheckCircle className="h-3 w-3" />,
        description: 'Approved despite minor discrepancies'
      }
    }
    
    const { label, className, icon, description } = config[status as keyof typeof config] || { 
      label: status, 
      className: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: <Minus className="h-3 w-3" />,
      description: 'Unknown status'
    }
    
    return (
      <Badge 
        className={cn('gap-1 border', className)}
        title={description}
      >
        {icon}
        {label}
      </Badge>
    )
  }

  const getSeverityBadge = (severity: string): void => {
    const config = {
      CRITICAL: { 
        className: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: <Zap className="h-3 w-3" />,
        label: 'Critical',
        description: 'Requires immediate attention'
      },
      HIGH: { 
        className: 'bg-red-100 text-red-800 border-red-300',
        icon: <AlertTriangle className="h-3 w-3" />,
        label: 'High',
        description: 'Significant discrepancy requiring approval'
      },
      MEDIUM: { 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: <AlertCircle className="h-3 w-3" />,
        label: 'Medium',
        description: 'Notable discrepancy within tolerance'
      },
      LOW: { 
        className: 'bg-green-100 text-green-800 border-green-300',
        icon: <Info className="h-3 w-3" />,
        label: 'Low',
        description: 'Minor discrepancy, auto-approved'
      }
    }
    
    const { className, icon, label, description } = config[severity as keyof typeof config] || { 
      className: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: <Minus className="h-3 w-3" />,
      label: severity,
      description: 'Unknown severity'
    }
    
    const colors = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.LOW
    
    return (
      <Badge 
        className={cn('gap-1 border', className)}
        title={description}
      >
        {icon}
        {label}
      </Badge>
    )
  }

  const getDiscrepancyIcon = (type: string): void => {
    const icons = {
      QUANTITY_OVER_MATCH: <TrendingUp className="h-4 w-4 text-red-600" />,
      QUANTITY_UNDER_MATCH: <TrendingDown className="h-4 w-4 text-orange-600" />,
      PRICE_VARIANCE: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
      MISSING_GOODS_RECEIPT: <Package className="h-4 w-4 text-red-600" />,
      MISSING_INVOICE: <FileText className="h-4 w-4 text-blue-600" />
    }
    return icons[type as keyof typeof icons] || <AlertTriangle className="h-4 w-4 text-gray-600" />
  }

  const getQualityBadge = (status: string): void => {
    const config = {
      ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
      PARTIALLY_ACCEPTED: { label: 'Partial', className: 'bg-yellow-100 text-yellow-800' }
    }
    
    const { label, className } = config[status as keyof typeof config] || { 
      label: status, 
      className: 'bg-gray-100 text-gray-800' 
    }
    
    return <Badge className={className}>{label}</Badge>
  }

  if (loading) {
    return (
      <VStack gap="xl">
        {/* Header Skeleton */}
        <VStack gap="sm">
          <HStack justify="between" align="center">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          </HStack>
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </VStack>

        {/* Purchase Order Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <Grid cols={4} gap="lg">
              {[1, 2, 3, 4].map(i => (
                <VStack key={i} gap="xs">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                </VStack>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Summary Cards Skeleton */}
        <Grid cols={4} gap="lg">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <VStack gap="sm">
                  <HStack gap="sm" align="center">
                    <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </HStack>
                  <div className="h-8 w-12 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                </VStack>
              </CardContent>
            </Card>
          ))}
        </Grid>

        {/* Progress Indicator */}
        {matchingProgress > 0 && (
          <Card>
            <CardContent>
              <VStack gap="sm">
                <HStack justify="between">
                  <Text size="sm" weight="medium">Analyzing documents...</Text>
                  <Text size="sm" color="secondary">{Math.round(matchingProgress)}%</Text>
                </HStack>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${matchingProgress}%` }}
                  />
                </div>
              </VStack>
            </CardContent>
          </Card>
        )}
      </VStack>
    )
  }

  if (error || !analysis) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12">
          <VStack gap="lg" align="center">
            <div className="p-4 bg-red-50 rounded-full">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            <VStack gap="sm" align="center">
              <Text size="lg" weight="semibold">Analysis Failed</Text>
              <Text color="secondary" className="text-center max-w-md">
                {error || 'Unable to perform three-way matching analysis. Please check if all required documents are available.'}
              </Text>
            </VStack>
            <HStack gap="sm">
              <Button variant="primary" onClick={(): void => fetchAnalysis()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Analysis
              </Button>
              <Button variant="outline" onClick={(): void => window.history.back()}>
                Go Back
              </Button>
            </HStack>
          </VStack>
        </CardContent>
      </Card>
    )
  }

  return (
    <VStack gap="xl">
      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <VStack gap="sm">
          {validationIssues.map((issue, index) => (
            <Alert key={index} variant={issue.severity === 'error' ? 'destructive' : 'default'}>
              {issue.severity === 'error' ? 
                <XCircle className="h-4 w-4" /> : 
                <AlertTriangle className="h-4 w-4" />
              }
              <AlertTitle>
                {issue.severity === 'error' ? 'Document Error' : 'Document Warning'}
              </AlertTitle>
              <AlertDescription>{issue.message}</AlertDescription>
            </Alert>
          ))}
        </VStack>
      )}

      {/* Header */}
      <VStack gap="sm">
        <HStack justify="between" align="center" className="flex-wrap gap-4">
          <VStack gap="xs" align="start">
            <Text size="xl" weight="bold" className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Three-Way Matching: {analysis.purchaseOrder.poNumber}
            </Text>
            <HStack gap="sm" align="center">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Text color="secondary" size="sm">
                Analysis performed on {new Date(analysis.analysisDate).toLocaleString()}
              </Text>
              {refreshing && (
                <Badge className="bg-blue-100 text-blue-800 gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Refreshing
                </Badge>
              )}
            </HStack>
          </VStack>
          <VStack gap="sm" align="end">
            {getMatchingStatusBadge(analysis.summary.matchingStatus)}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(): void => fetchAnalysis(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </VStack>
        </HStack>
        
        {/* Matching Progress */}
        {analysis.summary.totalItems > 0 && (
          <Card>
            <CardContent className="py-3">
              <VStack gap="sm">
                <HStack justify="between" align="center">
                  <Text size="sm" weight="medium">Matching Progress</Text>
                  <Text size="sm" color="secondary">
                    {analysis.summary.fullyMatched} of {analysis.summary.totalItems} items matched
                  </Text>
                </HStack>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(analysis.summary.fullyMatched / analysis.summary.totalItems) * 100}%` }}
                  />
                </div>
              </VStack>
            </CardContent>
          </Card>
        )}
      </VStack>

      {/* Purchase Order Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Purchase Order Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Grid cols={4} gap="lg" className="md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <VStack gap="xs">
                <HStack gap="sm" align="center">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Eye className="h-4 w-4 text-green-600" />
                  </div>
                  <Text size="sm" weight="medium" color="secondary">Supplier</Text>
                </HStack>
                <Text weight="semibold" className="truncate">{analysis.purchaseOrder.supplier?.name || 'N/A'}</Text>
                <Badge variant="outline" className="text-xs w-fit">
                  {analysis.purchaseOrder.supplier?.code || 'N/A'}
                </Badge>
              </VStack>
            </Card>
            
            <Card className="p-4">
              <VStack gap="xs">
                <HStack gap="sm" align="center">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <Text size="sm" weight="medium" color="secondary">Order Date</Text>
                </HStack>
                <Text weight="semibold">
                  {new Date(analysis.purchaseOrder.orderDate).toLocaleDateString()}
                </Text>
              </VStack>
            </Card>
            
            <Card className="p-4">
              <VStack gap="xs">
                <HStack gap="sm" align="center">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                  <Text size="sm" weight="medium" color="secondary">Expected Date</Text>
                </HStack>
                <Text weight="semibold">
                  {analysis.purchaseOrder.expectedDate 
                    ? new Date(analysis.purchaseOrder.expectedDate).toLocaleDateString()
                    : 'Not specified'
                  }
                </Text>
                {analysis.purchaseOrder.expectedDate && (
                  <Badge 
                    variant={new Date(analysis.purchaseOrder.expectedDate) > new Date() ? 'outline' : 'destructive'}
                    className="text-xs w-fit"
                  >
                    {new Date(analysis.purchaseOrder.expectedDate) > new Date() ? 'Future' : 'Overdue'}
                  </Badge>
                )}
              </VStack>
            </Card>
            
            <Card className="p-4">
              <VStack gap="xs">
                <HStack gap="sm" align="center">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                  </div>
                  <Text size="sm" weight="medium" color="secondary">Total Amount</Text>
                </HStack>
                <Text weight="bold" size="lg" className="text-purple-600">
                  {formatCurrency(analysis.purchaseOrder.totalAmount)}
                </Text>
                <Badge variant="outline" className="text-xs w-fit">
                  {analysis.purchaseOrder.currency}
                </Badge>
              </VStack>
            </Card>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Grid cols={4} gap="lg" className="md:grid-cols-2 lg:grid-cols-4">
        <Card 
          variant="elevated"
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-green-500"
          onClick={(): void => setSelectedTab('discrepancies')}
        >
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <Text size="sm" weight="medium" color="secondary">Fully Matched</Text>
              </HStack>
              <Text size="xl" weight="bold" className="text-green-600">
                {analysis.summary.fullyMatched}
              </Text>
              <HStack gap="sm" align="center">
                <Text size="sm" color="secondary">of {analysis.summary.totalItems} items</Text>
                {analysis.summary.totalItems > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round((analysis.summary.fullyMatched / analysis.summary.totalItems) * 100)}%
                  </Badge>
                )}
              </HStack>
            </VStack>
          </CardContent>
        </Card>

        <Card 
          variant="elevated"
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-red-500"
          onClick={(): void => setSelectedTab('discrepancies')}
        >
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <div className="p-2 bg-red-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                </div>
                <Text size="sm" weight="medium" color="secondary">Over Matched</Text>
              </HStack>
              <Text size="xl" weight="bold" className="text-red-600">
                {analysis.summary.overMatched}
              </Text>
              <HStack gap="sm" align="center">
                <Text size="sm" color="secondary">
                  {analysis.summary.overMatched > 0 ? 'Requires attention' : 'All good'}
                </Text>
                {analysis.summary.overMatched > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    High Priority
                  </Badge>
                )}
              </HStack>
            </VStack>
          </CardContent>
        </Card>

        <Card 
          variant="elevated"
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-orange-500"
          onClick={(): void => setSelectedTab('discrepancies')}
        >
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                </div>
                <Text size="sm" weight="medium" color="secondary">Under Matched</Text>
              </HStack>
              <Text size="xl" weight="bold" className="text-orange-600">
                {analysis.summary.underMatched}
              </Text>
              <HStack gap="sm" align="center">
                <Text size="sm" color="secondary">
                  {analysis.summary.underMatched > 0 ? 'Incomplete delivery' : 'Complete'}
                </Text>
                {analysis.summary.underMatched > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    In Progress
                  </Badge>
                )}
              </HStack>
            </VStack>
          </CardContent>
        </Card>

        <Card 
          variant="elevated"
          className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500"
          onClick={(): void => setSelectedTab('discrepancies')}
        >
          <CardContent className="p-6">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Shield className="h-5 w-5 text-yellow-600" />
                </div>
                <Text size="sm" weight="medium" color="secondary">Pending Review</Text>
              </HStack>
              <Text size="xl" weight="bold" className="text-yellow-600">
                {analysis.summary.pendingReview}
              </Text>
              <HStack gap="sm" align="center">
                <Text size="sm" color="secondary">
                  {analysis.summary.pendingReview > 0 ? 'Action required' : 'All reviewed'}
                </Text>
                {analysis.summary.pendingReview > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                    Review Now
                  </Badge>
                )}
              </HStack>
            </VStack>
          </CardContent>
        </Card>
      </Grid>

      {/* Detailed Analysis */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="discrepancies" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Discrepancies ({analysis.discrepancies.length})
          </TabsTrigger>
          <TabsTrigger value="goods-receipts" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Goods Receipts ({analysis.goodsReceipts.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoices ({analysis.supplierInvoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discrepancies">
          <Card>
            <CardHeader>
              <HStack justify="between" align="center">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Matching Discrepancies
                </CardTitle>
                {analysis.discrepancies.length > 0 && (
                  <HStack gap="sm">
                    <Badge variant="outline">
                      {analysis.discrepancies.filter(d => d.severity === 'HIGH').length} High
                    </Badge>
                    <Badge variant="outline">
                      {analysis.discrepancies.filter(d => d.severity === 'MEDIUM').length} Medium
                    </Badge>
                    <Badge variant="outline">
                      {analysis.discrepancies.filter(d => d.severity === 'LOW').length} Low
                    </Badge>
                  </HStack>
                )}
              </HStack>
            </CardHeader>
            {analysis.discrepancies.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <div className="p-4 bg-green-50 rounded-full">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  </div>
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">Perfect Match!</Text>
                    <Text color="secondary">All documents match perfectly without any discrepancies</Text>
                  </VStack>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready for Approval
                  </Badge>
                </VStack>
              </CardContent>
            ) : (
              <CardContent>
                <VStack gap="sm">
                  {analysis.discrepancies.map((discrepancy) => {
                    const isExpanded = expandedDiscrepancies.has(discrepancy.id)
                    const colors = SEVERITY_COLORS[discrepancy.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.LOW
                    
                    return (
                      <Card 
                        key={discrepancy.id} 
                        variant="outlined"
                        className={cn(
                          'transition-all duration-200',
                          colors.bg,
                          colors.border,
                          isExpanded && 'shadow-md'
                        )}
                      >
                        <Collapsible open={isExpanded} onOpenChange={(): void => toggleDiscrepancy(discrepancy.id)}>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                              <HStack justify="between" align="center">
                                <HStack gap="sm" align="center">
                                  {getDiscrepancyIcon(discrepancy.type)}
                                  <VStack gap="xs" align="start">
                                    <Text weight="semibold">{discrepancy.item.name}</Text>
                                    <Text size="sm" color="secondary">{discrepancy.item.code}</Text>
                                  </VStack>
                                  {getSeverityBadge(discrepancy.severity)}
                                </HStack>
                                <HStack gap="sm" align="center">
                                  {discrepancy.requiresApproval && (
                                    <div title="Requires management approval">
                                      <Shield className="h-4 w-4 text-yellow-600" />
                                    </div>
                                  )}
                                  {isExpanded ? 
                                    <ChevronUp className="h-4 w-4" /> : 
                                    <ChevronDown className="h-4 w-4" />
                                  }
                                </HStack>
                              </HStack>
                            </CardHeader>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <VStack gap="lg">
                                {/* Discrepancy Details */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {discrepancy.expectedQuantity && (
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                      <Text size="sm" color="secondary">Expected Quantity</Text>
                                      <Text weight="semibold">{discrepancy.expectedQuantity}</Text>
                                    </div>
                                  )}
                                  {discrepancy.actualQuantity && (
                                    <div className="p-3 bg-orange-50 rounded-lg">
                                      <Text size="sm" color="secondary">Actual Quantity</Text>
                                      <Text weight="semibold">{discrepancy.actualQuantity}</Text>
                                    </div>
                                  )}
                                  {discrepancy.variance && discrepancy.variancePercentage && (
                                    <div className={cn("p-3 rounded-lg", 
                                      discrepancy.variance > 0 ? "bg-red-50" : "bg-green-50"
                                    )}>
                                      <Text size="sm" color="secondary">Variance</Text>
                                      <Text weight="semibold" className={
                                        discrepancy.variance > 0 ? "text-red-600" : "text-green-600"
                                      }>
                                        {discrepancy.variance > 0 ? '+' : ''}{discrepancy.variance.toFixed(2)}
                                        <span className="text-sm ml-1">
                                          ({discrepancy.variancePercentage.toFixed(1)}%)
                                        </span>
                                      </Text>
                                    </div>
                                  )}
                                </div>

                                {/* Description */}
                                <Alert>
                                  <Info className="h-4 w-4" />
                                  <AlertTitle>Discrepancy Details</AlertTitle>
                                  <AlertDescription>{discrepancy.description}</AlertDescription>
                                </Alert>

                                {/* Action Buttons */}
                                <HStack gap="sm" justify="end">
                                  {discrepancy.requiresApproval ? (
                                    <>
                                      <Button variant="outline" size="sm">
                                        <ThumbsDown className="h-4 w-4 mr-2" />
                                        Reject
                                      </Button>
                                      <Button variant="primary" size="sm">
                                        <ThumbsUp className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                    </>
                                  ) : (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Auto-Approved
                                    </Badge>
                                  )}
                                </HStack>
                              </VStack>
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    )
                  })}
                </VStack>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="goods-receipts">
          <Card>
            <CardHeader>
              <HStack justify="between" align="center">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Goods Receipts
                </CardTitle>
                {analysis.goodsReceipts.length > 0 && (
                  <Badge variant="outline">
                    {analysis.goodsReceipts.reduce((acc, gr) => acc + gr.items.length, 0)} items received
                  </Badge>
                )}
              </HStack>
            </CardHeader>
            {analysis.goodsReceipts.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <div className="p-4 bg-gray-50 rounded-full">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">No goods receipts found</Text>
                    <Text color="secondary">Items have not been received yet</Text>
                  </VStack>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Incomplete Process</AlertTitle>
                    <AlertDescription>
                      Three-way matching requires goods receipts to validate deliveries against the purchase order.
                    </AlertDescription>
                  </Alert>
                </VStack>
              </CardContent>
            ) : (
              <CardContent>
                <VStack gap="lg">
                  {analysis.goodsReceipts.map((receipt) => (
                    <Card key={receipt.id} className="border-l-4 border-l-green-500">
                      <CardHeader>
                        <HStack justify="between" align="center">
                          <VStack gap="xs" align="start">
                            <HStack gap="sm" align="center">
                              <div className="p-2 bg-green-50 rounded-lg">
                                <FileCheck className="h-4 w-4 text-green-600" />
                              </div>
                              <VStack gap="xs" align="start">
                                <Text weight="semibold">{receipt.receiptNumber}</Text>
                                <HStack gap="sm" align="center">
                                  <Calendar className="h-3 w-3 text-gray-500" />
                                  <Text size="sm" color="secondary">
                                    Received: {new Date(receipt.receivedDate).toLocaleDateString()}
                                  </Text>
                                </HStack>
                              </VStack>
                            </HStack>
                          </VStack>
                          <VStack gap="sm" align="end">
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {receipt.status}
                            </Badge>
                            <Text size="sm" color="secondary">
                              {receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}
                            </Text>
                          </VStack>
                        </HStack>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit Cost</TableHead>
                                <TableHead>Total Cost</TableHead>
                                <TableHead>Quality</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {receipt.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <VStack gap="xs">
                                      <Text weight="medium">{item.item.name}</Text>
                                      <Badge variant="outline" className="text-xs w-fit">
                                        {item.item.code}
                                      </Badge>
                                    </VStack>
                                  </TableCell>
                                  <TableCell>
                                    <Text weight="semibold">{item.quantityReceived}</Text>
                                  </TableCell>
                                  <TableCell>
                                    <Text>{formatCurrency(item.unitCost)}</Text>
                                  </TableCell>
                                  <TableCell>
                                    <Text weight="semibold">{formatCurrency(item.totalCost)}</Text>
                                  </TableCell>
                                  <TableCell>{getQualityBadge(item.qualityStatus)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </VStack>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <HStack justify="between" align="center">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  Supplier Invoices
                </CardTitle>
                {analysis.supplierInvoices.length > 0 && (
                  <VStack gap="sm" align="end">
                    <Badge variant="outline">
                      {analysis.supplierInvoices.length} invoice{analysis.supplierInvoices.length !== 1 ? 's' : ''}
                    </Badge>
                    <Text size="sm" color="secondary">
                      Total: {formatCurrency(analysis.supplierInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0))}
                    </Text>
                  </VStack>
                )}
              </HStack>
            </CardHeader>
            {analysis.supplierInvoices.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <div className="p-4 bg-gray-50 rounded-full">
                    <Receipt className="h-12 w-12 text-gray-400" />
                  </div>
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">No invoices found</Text>
                    <Text color="secondary">Supplier has not submitted invoices yet</Text>
                  </VStack>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Waiting for Invoice</AlertTitle>
                    <AlertDescription>
                      Three-way matching will be completed once the supplier submits their invoice for this purchase order.
                    </AlertDescription>
                  </Alert>
                </VStack>
              </CardContent>
            ) : (
              <CardContent>
                <VStack gap="lg">
                  {analysis.supplierInvoices.map((invoice) => (
                    <Card key={invoice.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <HStack justify="between" align="center">
                          <VStack gap="xs" align="start">
                            <HStack gap="sm" align="center">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <FileText className="h-4 w-4 text-blue-600" />
                              </div>
                              <VStack gap="xs" align="start">
                                <Text weight="semibold">{invoice.invoiceNumber}</Text>
                                <HStack gap="sm" align="center">
                                  <Calendar className="h-3 w-3 text-gray-500" />
                                  <Text size="sm" color="secondary">
                                    Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
                                  </Text>
                                </HStack>
                              </VStack>
                            </HStack>
                          </VStack>
                          <VStack gap="sm" align="end">
                            <HStack gap="sm" align="center">
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                {invoice.status}
                              </Badge>
                              {getMatchingStatusBadge(invoice.matchingStatus)}
                            </HStack>
                            <Text size="sm" color="secondary">
                              {invoice.items.length} line item{invoice.items.length !== 1 ? 's' : ''}
                            </Text>
                          </VStack>
                        </HStack>
                      </CardHeader>
                      <CardContent>
                        <VStack gap="lg">
                          {/* Invoice Summary */}
                          <Card className="p-4 bg-blue-50">
                            <HStack justify="between" align="center">
                              <VStack gap="xs" align="start">
                                <Text size="sm" color="secondary">Invoice Total</Text>
                                <Text size="lg" weight="bold" className="text-blue-600">
                                  {formatCurrency(invoice.totalAmount)}
                                </Text>
                              </VStack>
                              <DollarSign className="h-6 w-6 text-blue-600" />
                            </HStack>
                          </Card>

                          {/* Invoice Items */}
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Unit Price</TableHead>
                                  <TableHead>Total Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {invoice.items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <Text weight="medium">{item.description}</Text>
                                    </TableCell>
                                    <TableCell>
                                      <Text weight="semibold">{item.quantity}</Text>
                                    </TableCell>
                                    <TableCell>
                                      <Text>{formatCurrency(item.unitPrice)}</Text>
                                    </TableCell>
                                    <TableCell>
                                      <Text weight="semibold">{formatCurrency(item.totalAmount)}</Text>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </VStack>
                      </CardContent>
                    </Card>
                  ))}
                </VStack>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </VStack>
  )
}