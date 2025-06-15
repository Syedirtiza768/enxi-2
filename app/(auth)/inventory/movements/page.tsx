'use client'

import { useState, useEffect } from 'react'
import { 
  PageLayout,
  PageHeader,
  PageSection,
  VStack,
  HStack,
  Grid,
  Button,
  Input,
  Select,
  Badge,
  Text
} from '@/components/design-system'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Package, 
  Search, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface StockMovement {
  id: string
  movementType: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'OPENING'
  itemId: string
  item: {
    id: string
    code: string
    name: string
    unitOfMeasure?: {
      code: string
      symbol: string
    }
  }
  quantity: number
  locationId?: string
  location?: {
    id: string
    name: string
  }
  locationName?: string
  referenceNumber?: string
  referenceType?: string
  referenceId?: string
  notes?: string
  movementDate: string
  createdBy: string
  createdAt: string
}

interface MovementStats {
  totalIn: number
  totalOut: number
  totalAdjustments: number
  totalTransfers: number
  todayMovements: number
  weekMovements: number
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [stats, setStats] = useState<MovementStats>({
    totalIn: 0,
    totalOut: 0,
    totalAdjustments: 0,
    totalTransfers: 0,
    todayMovements: 0,
    weekMovements: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('7')
  const [locationFilter, setLocationFilter] = useState('all')
  const [locations, setLocations] = useState<Array<{id: string, name: string}>>([])

  useEffect(() => {
    fetchMovements()
    fetchLocations()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, dateFilter, locationFilter])

  const fetchLocations = async (): Promise<void> => {
    try {
      const response = await apiClient<Array<{id: string, name: string}>>('/api/locations', {
        method: 'GET'
      })
      
      if (response.ok && response?.data) {
        setLocations(Array.isArray(response?.data) ? response?.data : [])
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const fetchMovements = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (dateFilter !== 'all') params.append('days', dateFilter)
      if (locationFilter !== 'all') params.append('locationId', locationFilter)

      const response = await apiClient<{ movements: StockMovement[] }>(`/api/inventory/stock-movements?${params}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch stock movements')
      }
      
      setMovements(response?.data?.movements || [])
      
      // Calculate stats
      const stats = calculateStats(response?.data?.movements || [])
      setStats(stats)
    } catch (error) {
      console.error('Error fetching movements:', error)
      setError('Failed to load stock movements')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (movements: StockMovement[]): MovementStats => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    return movements.reduce((acc, movement) => {
      const movementDate = new Date(movement.movementDate)
      
      // Count by type
      switch (movement.movementType) {
        case 'STOCK_IN':
          acc.totalIn += movement.quantity
          break
        case 'STOCK_OUT':
          acc.totalOut += movement.quantity
          break
        case 'ADJUSTMENT':
          acc.totalAdjustments++
          if (movement.quantity > 0) {
            acc.totalIn += movement.quantity
          } else {
            acc.totalOut += Math.abs(movement.quantity)
          }
          break
        case 'TRANSFER':
          acc.totalTransfers++
          break
      }
      
      // Count by date
      if (movementDate >= today) {
        acc.todayMovements++
      }
      if (movementDate >= weekAgo) {
        acc.weekMovements++
      }
      
      return acc
    }, {
      totalIn: 0,
      totalOut: 0,
      totalAdjustments: 0,
      totalTransfers: 0,
      todayMovements: 0,
      weekMovements: 0
    })
  }

  const getMovementIcon = (type: StockMovement['movementType']) => {
    switch (type) {
      case 'STOCK_IN':
        return <ArrowDownRight className="h-4 w-4 text-green-600" />
      case 'STOCK_OUT':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />
      case 'ADJUSTMENT':
        return <RefreshCw className="h-4 w-4 text-blue-600" />
      case 'TRANSFER':
        return <Activity className="h-4 w-4 text-purple-600" />
      case 'OPENING':
        return <Package className="h-4 w-4 text-gray-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getMovementBadge = (type: StockMovement['movementType']) => {
    const config = {
      STOCK_IN: { label: 'Stock In', className: 'bg-green-100 text-green-800' },
      STOCK_OUT: { label: 'Stock Out', className: 'bg-red-100 text-red-800' },
      ADJUSTMENT: { label: 'Adjustment', className: 'bg-blue-100 text-blue-800' },
      TRANSFER: { label: 'Transfer', className: 'bg-purple-100 text-purple-800' },
      OPENING: { label: 'Opening', className: 'bg-gray-100 text-gray-800' }
    } as const
    
    const { label, className } = config[type as keyof typeof config] || { label: type, className: 'bg-gray-100 text-gray-800' }
    
    return (
      <Badge className={`${className} gap-1`}>
        {getMovementIcon(type)}
        {label}
      </Badge>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredMovements = movements.filter(movement => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        movement.item.name.toLowerCase().includes(searchLower) ||
        movement.item.code.toLowerCase().includes(searchLower) ||
        movement.referenceNumber?.toLowerCase().includes(searchLower) ||
        movement.notes?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <Package className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading stock movements...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <Package className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Error loading stock movements</Text>
            <Text color="secondary">{error}</Text>
          </VStack>
          <Button variant="primary" onClick={fetchMovements}>
            Try Again
          </Button>
        </VStack>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <PageHeader
          title="Stock Movements"
          description="Track all inventory movements and transactions"
          centered={false}
          actions={
            <Button
              variant="outline"
              leftIcon={<RefreshCw />}
              onClick={fetchMovements}
            >
              Refresh
            </Button>
          }
        />

        {/* Statistics */}
        <PageSection>
          <Grid cols={3} gap="lg">
            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Total In</Text>
                    <Text size="xl" weight="bold">{stats.totalIn}</Text>
                  </VStack>
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Total Out</Text>
                    <Text size="xl" weight="bold">{stats.totalOut}</Text>
                  </VStack>
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Adjustments</Text>
                    <Text size="xl" weight="bold">{stats.totalAdjustments}</Text>
                  </VStack>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <RefreshCw className="h-6 w-6 text-blue-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Transfers</Text>
                    <Text size="xl" weight="bold">{stats.totalTransfers}</Text>
                  </VStack>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">Today</Text>
                    <Text size="xl" weight="bold">{stats.todayMovements}</Text>
                  </VStack>
                  <div className="p-3 bg-[var(--color-neutral-100)] dark:bg-[var(--color-neutral-800)] rounded-lg">
                    <Calendar className="h-6 w-6 text-[var(--color-neutral-600)]" />
                  </div>
                </HStack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <HStack justify="between" align="center" className="mb-2">
                  <VStack gap="xs">
                    <Text size="sm" weight="medium" color="secondary">This Week</Text>
                    <Text size="xl" weight="bold">{stats.weekMovements}</Text>
                  </VStack>
                  <div className="p-3 bg-[var(--color-brand-primary-100)] dark:bg-[var(--color-brand-primary-900)] rounded-lg">
                    <Package className="h-6 w-6 text-[var(--color-brand-primary-600)]" />
                  </div>
                </HStack>
              </CardContent>
            </Card>
          </Grid>
        </PageSection>

        {/* Filters */}
        <PageSection>
          <Card>
            <CardContent>
              <HStack gap="md" className="flex-col sm:flex-row">
                <div className="flex-1">
                  <Input
                    placeholder="Search by item name, code, or reference..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    leftIcon={<Search />}
                    fullWidth
                  />
                </div>

                <div className="sm:w-48">
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'STOCK_IN', label: 'Stock In' },
                      { value: 'STOCK_OUT', label: 'Stock Out' },
                      { value: 'ADJUSTMENT', label: 'Adjustments' },
                      { value: 'TRANSFER', label: 'Transfers' },
                      { value: 'OPENING', label: 'Opening Balance' }
                    ]}
                    fullWidth
                  />
                </div>

                <div className="sm:w-48">
                  <Select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    options={[
                      { value: '1', label: 'Today' },
                      { value: '7', label: 'Last 7 days' },
                      { value: '30', label: 'Last 30 days' },
                      { value: '90', label: 'Last 90 days' },
                      { value: 'all', label: 'All time' }
                    ]}
                    fullWidth
                  />
                </div>

                {locations.length > 0 && (
                  <div className="sm:w-48">
                    <Select
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'All Locations' },
                        ...locations.map(loc => ({ value: loc.id, label: loc.name }))
                      ]}
                      fullWidth
                    />
                  </div>
                )}
              </HStack>
            </CardContent>
          </Card>
        </PageSection>

        {/* Movements Table */}
        <PageSection>
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Movement History ({filteredMovements.length})</CardTitle>
            </CardHeader>
            {filteredMovements.length === 0 ? (
              <CardContent className="py-12">
                <VStack gap="lg" align="center">
                  <Package className="h-12 w-12 text-[var(--color-neutral-400)]" />
                  <VStack gap="sm" align="center">
                    <Text size="lg" weight="semibold">No movements found</Text>
                    <Text color="secondary">
                      {search || typeFilter !== 'all' || dateFilter !== '7'
                        ? 'Try adjusting your filters'
                        : 'No stock movements recorded yet'}
                    </Text>
                  </VStack>
                </VStack>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(movement.movementDate)}
                      </TableCell>
                      <TableCell>
                        {getMovementBadge(movement.movementType)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{movement.item.name}</div>
                          <div className="text-sm text-gray-500">{movement.item.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {movement.movementType === 'STOCK_OUT' || (movement.movementType === 'ADJUSTMENT' && movement.quantity < 0) ? '-' : '+'}
                          {Math.abs(movement.quantity)} {movement.item.unitOfMeasure?.symbol || 'pcs'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {movement.location?.name || movement.locationName || '-'}
                      </TableCell>
                      <TableCell>{movement.referenceNumber || '-'}</TableCell>
                      <TableCell>{movement.notes || '-'}</TableCell>
                      <TableCell>{movement.createdBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </PageSection>
      </VStack>
    </PageLayout>
  )
}