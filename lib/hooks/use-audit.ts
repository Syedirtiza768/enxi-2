'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  AuditAction, 
  EntityType, 
  AuditFilter, 
  Pagination,
  AuditStats,
  AuditCompliance,
  AuditExport
} from '@/lib/validators/audit.validator'

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

interface UseAuditLogsReturn {
  logs: AuditLogEntry[]
  loading: boolean
  error: string | null
  totalRecords: number
  totalPages: number
  filters: AuditFilter
  pagination: Pagination
  setFilters: (filters: AuditFilter) => void
  setPagination: (pagination: Pagination) => void
  refetch: () => Promise<void>
  clearFilters: () => void
  exportLogs: (format: 'CSV' | 'JSON' | 'PDF', options?: Partial<AuditExport>) => Promise<void>
}

interface UseAuditStatsReturn {
  stats: any
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseAuditComplianceReturn {
  report: any
  loading: boolean
  error: string | null
  generateReport: (options: AuditCompliance) => Promise<void>
}

interface UseEntityHistoryReturn {
  history: AuditLogEntry[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching and managing audit logs with pagination and filtering
 */
export function useAuditLogs(initialFilters: Partial<AuditFilter> = {}): UseAuditLogsReturn {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  const [filters, setFilters] = useState<AuditFilter>(initialFilters)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  })

  const fetchLogs = useCallback(async () => {
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
    } finally {
      setLoading(false)
    }
  }, [filters, pagination])

  const exportLogs = useCallback(async (
    format: 'CSV' | 'JSON' | 'PDF', 
    options: Partial<AuditExport> = {}
  ) => {
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
          includeBeforeAfter: false,
          ...options
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      throw new Error(errorMessage)
    }
  }, [filters])

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [initialFilters])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return {
    logs,
    loading,
    error,
    totalRecords,
    totalPages,
    filters,
    pagination,
    setFilters,
    setPagination,
    refetch: fetchLogs,
    clearFilters,
    exportLogs
  }
}

/**
 * Hook for fetching audit statistics and analytics
 */
export function useAuditStats(options: AuditStats): UseAuditStatsReturn {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/audit/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audit stats: ${response.statusText}`)
      }
      
      const data = await response.json()
      setStats(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch audit stats'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [options])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

/**
 * Hook for generating compliance reports
 */
export function useAuditCompliance(): UseAuditComplianceReturn {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateReport = useCallback(async (options: AuditCompliance) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/audit/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to generate compliance report: ${response.statusText}`)
      }
      
      const data = await response.json()
      setReport(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate compliance report'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    report,
    loading,
    error,
    generateReport
  }
}

/**
 * Hook for fetching entity history (audit logs for a specific entity)
 */
export function useEntityHistory(
  entityType: EntityType, 
  entityId: string
): UseEntityHistoryReturn {
  const [history, setHistory] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!entityType || !entityId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/audit/entity-history?entityType=${entityType}&entityId=${entityId}`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch entity history: ${response.statusText}`)
      }
      
      const data = await response.json()
      setHistory(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch entity history'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    history,
    loading,
    error,
    refetch: fetchHistory
  }
}

/**
 * Hook for logging audit actions from the client side
 */
export function useAuditLogger() {
  const logAction = useCallback(async (
    action: AuditAction,
    entityType: EntityType,
    entityId: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const response = await fetch('/api/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          entityType,
          entityId,
          metadata
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to log audit action: ${response.statusText}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to log audit action:', err)
      throw err
    }
  }, [])

  return { logAction }
}

/**
 * Hook for security-related audit queries
 */
export function useSecurityAudit() {
  const [securityEvents, setSecurityEvents] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSecurityEvents = useCallback(async (
    startDate?: Date, 
    endDate?: Date
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams()
      if (startDate) queryParams.append('startDate', startDate.toISOString())
      if (endDate) queryParams.append('endDate', endDate.toISOString())

      const response = await fetch(`/api/audit/security?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch security events: ${response.statusText}`)
      }
      
      const data = await response.json()
      setSecurityEvents(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch security events'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    securityEvents,
    loading,
    error,
    fetchSecurityEvents
  }
}

/**
 * Hook for real-time audit monitoring
 */
export function useAuditMonitoring(options: {
  autoRefresh?: boolean
  refreshInterval?: number
  filters?: AuditFilter
}) {
  const { autoRefresh = false, refreshInterval = 30000, filters = {} } = options
  const { logs, loading, error, refetch } = useAuditLogs(filters)

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refetch()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refetch])

  return {
    logs,
    loading,
    error,
    refetch
  }
}