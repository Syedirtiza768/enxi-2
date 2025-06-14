'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  AuditAction, 
  EntityType, 
  AuditFilter, 
  Pagination 
} from '@/lib/validators/audit.validator'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/components/ui/use-toast'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  ChevronDown, 
  ChevronRight,
  Calendar,
  User,
  Activity,
  Database,
  AlertTriangle,
  Shield,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

interface AuditLogEntry {
  id: string
  userId: string
  action: AuditAction
  entityType: EntityType
  entityId: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  beforeData?: Record<string, any>
  afterData?: Record<string, any>
  user?: {
    username: string
    email: string
    profile?: {
      firstName?: string
      lastName?: string
    }
  }
}

interface AuditLogViewerProps {
  initialFilters?: Partial<AuditFilter>
  showFilters?: boolean
  showExport?: boolean
  height?: string
  entityId?: string
  entityType?: EntityType
  compactView?: boolean
}

export function AuditLogViewer({
  initialFilters = {},
  showFilters = true,
  showExport = true,
  height = '600px',
  entityId,
  entityType,
  compactView = false
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<AuditFilter>({
    ...initialFilters,
    ...(entityId && { entityId }),
    ...(entityType && { entityType })
  })
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  })
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)

  const { toast } = useToast()

  // Fetch audit logs
  const fetchLogs = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams()
      
      // Add pagination
      queryParams.append('page', pagination.page.toString())
      queryParams.append('limit', pagination.limit.toString())
      queryParams.append('sortBy', pagination.sortBy)
      queryParams.append('sortOrder', pagination.sortOrder)
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            queryParams.append(key, value.toISOString())
          } else {
            queryParams.append(key, value.toString())
          }
        }
      })

      const response = await fetch(`/api/audit?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.statusText}`)
      }
      
      const data = await response.json()
      setLogs(data.data || [])
      setTotalPages(data.totalPages || 0)
      setTotalRecords(data.total || 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch audit logs'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Export audit logs
  const exportLogs = async (format: 'CSV' | 'JSON' | 'PDF') => {
    try {
      const response = await fetch('/api/audit/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters,
          format,
          includeMetadata: true,
          includeBeforeAfter: false
        })
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Create and download file
      const blob = new Blob([
        format === 'JSON' ? JSON.stringify(data.data, null, 2) : data.data
      ], { 
        type: format === 'CSV' ? 'text/csv' : 'application/json' 
      })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = data.filename || `audit-logs.${format.toLowerCase()}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export Complete',
        description: `Audit logs exported as ${format}`
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      toast({
        title: 'Export Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  // Get severity badge variant
  const getSeverityVariant = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'default'
      case 'LOW': return 'secondary'
      default: return 'secondary'
    }
  }

  // Get action icon
  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case AuditAction.CREATE: return <Database className="h-4 w-4 text-green-500" />
      case AuditAction.UPDATE: return <Activity className="h-4 w-4 text-blue-500" />
      case AuditAction.DELETE: return <AlertTriangle className="h-4 w-4 text-red-500" />
      case AuditAction.LOGIN: 
      case AuditAction.LOGOUT: 
      case AuditAction.LOGIN_FAILED: return <User className="h-4 w-4 text-purple-500" />
      case AuditAction.APPROVE: 
      case AuditAction.REJECT: return <Shield className="h-4 w-4 text-orange-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  // Toggle row expansion
  const toggleRowExpansion = (logId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedRows(newExpanded)
  }

  // Filter component
  const FilterComponent = () => (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Action</label>
          <Select
            value={filters.action || ''}
            onValueChange={(value) => setFilters({ 
              ...filters, 
              action: value as AuditAction || undefined 
            })}
          >
            <option value="">All Actions</option>
            {Object.values(AuditAction).map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Entity Type</label>
          <Select
            value={filters.entityType || ''}
            onValueChange={(value) => setFilters({ 
              ...filters, 
              entityType: value as EntityType || undefined 
            })}
          >
            <option value="">All Entities</option>
            {Object.values(EntityType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">User ID</label>
          <Input
            placeholder="User ID"
            value={filters.userId || ''}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <Input
            type="datetime-local"
            value={filters.startDate ? filters.startDate.toISOString().slice(0, 16) : ''}
            onChange={(e) => setFilters({ 
              ...filters, 
              startDate: e.target.value ? new Date(e.target.value) : undefined 
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <Input
            type="datetime-local"
            value={filters.endDate ? filters.endDate.toISOString().slice(0, 16) : ''}
            onChange={(e) => setFilters({ 
              ...filters, 
              endDate: e.target.value ? new Date(e.target.value) : undefined 
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">IP Address</label>
          <Input
            placeholder="IP Address"
            value={filters.ipAddress || ''}
            onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={fetchLogs} size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Apply Filters
        </Button>
        <Button 
          onClick={() => {
            setFilters(initialFilters)
            setPagination({ ...pagination, page: 1 })
          }}
          variant="outline" 
          size="sm"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  )

  // Load logs when filters or pagination change
  useEffect(() => {
    fetchLogs()
  }, [pagination.page, pagination.limit, pagination.sortBy, pagination.sortOrder])

  // Memoize the formatted logs for performance
  const formattedLogs = useMemo(() => {
    return logs.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp),
      displayName: log.user?.profile?.firstName && log.user?.profile?.lastName 
        ? `${log.user.profile.firstName} ${log.user.profile.lastName}` 
        : log.user?.username || log.userId
    }))
  }, [logs])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-gray-600">
            {totalRecords} records found
            {entityId && ` for ${entityType} ${entityId}`}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={fetchLogs}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {showExport && (
            <>
              <Button
                onClick={() => exportLogs('CSV')}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                onClick={() => exportLogs('JSON')}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && <FilterComponent />}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Main Table */}
      <Card>
        <div style={{ height, overflow: 'auto' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                {!compactView && <TableHead>IP Address</TableHead>}
                <TableHead className="w-20">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={compactView ? 7 : 8} className="text-center py-8">
                    Loading audit logs...
                  </TableCell>
                </TableRow>
              ) : formattedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={compactView ? 7 : 8} className="text-center py-8">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                formattedLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(log.id)}
                          className="p-1 h-6 w-6"
                        >
                          {expandedRows.has(log.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {format(log.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">
                            {log.displayName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActionIcon(log.action)}
                          <Badge variant="outline">
                            {log.action}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {log.entityType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.entityId}
                      </TableCell>
                      {!compactView && (
                        <TableCell className="font-mono text-sm text-gray-500">
                          {log.ipAddress || '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {expandedRows.has(log.id) && (
                      <TableRow>
                        <TableCell colSpan={compactView ? 7 : 8}>
                          <div className="bg-gray-50 p-4 rounded space-y-2">
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Metadata:</h4>
                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                            
                            {log.userAgent && (
                              <div>
                                <span className="font-semibold text-sm">User Agent:</span>
                                <span className="text-sm ml-2 text-gray-600">{log.userAgent}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {totalPages}
              </span>
              <Select
                value={pagination.limit.toString()}
                onValueChange={(value) => setPagination({ 
                  ...pagination, 
                  limit: parseInt(value),
                  page: 1 
                })}
              >
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold">Timestamp:</label>
                  <p>{format(selectedLog.timestamp, 'PPpp')}</p>
                </div>
                <div>
                  <label className="font-semibold">User:</label>
                  <p>{selectedLog.displayName}</p>
                </div>
                <div>
                  <label className="font-semibold">Action:</label>
                  <div className="flex items-center space-x-2">
                    {getActionIcon(selectedLog.action)}
                    <Badge variant="outline">{selectedLog.action}</Badge>
                  </div>
                </div>
                <div>
                  <label className="font-semibold">Entity:</label>
                  <p>{selectedLog.entityType} ({selectedLog.entityId})</p>
                </div>
                <div>
                  <label className="font-semibold">IP Address:</label>
                  <p className="font-mono">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-semibold">User Agent:</label>
                  <p className="text-sm text-gray-600 break-all">
                    {selectedLog.userAgent || 'N/A'}
                  </p>
                </div>
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="font-semibold block mb-2">Metadata:</label>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.beforeData && Object.keys(selectedLog.beforeData).length > 0 && (
                <div>
                  <label className="font-semibold block mb-2">Before Data:</label>
                  <pre className="bg-red-50 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(selectedLog.beforeData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.afterData && Object.keys(selectedLog.afterData).length > 0 && (
                <div>
                  <label className="font-semibold block mb-2">After Data:</label>
                  <pre className="bg-green-50 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(selectedLog.afterData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}