/**
 * Reporting Module - Analytics and reporting functionality for Enxi ERP
 */

export interface Report {
  id: string
  name: string
  description?: string
  type: 'standard' | 'custom' | 'dashboard'
  category: 'sales' | 'inventory' | 'finance' | 'crm' | 'operations' | 'executive'
  format: 'table' | 'chart' | 'mixed'
  schedule?: ReportSchedule
  filters: ReportFilter[]
  columns?: ReportColumn[]
  groupBy?: string[]
  sortBy?: ReportSort[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  time?: string // HH:mm format
  dayOfWeek?: number // 0-6 for weekly
  dayOfMonth?: number // 1-31 for monthly
  recipients: string[]
  format: 'pdf' | 'excel' | 'csv'
  isActive: boolean
}

export interface ReportFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in'
  value: any
  label?: string
}

export interface ReportColumn {
  field: string
  label: string
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage'
  width?: number
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  format?: string
}

export interface ReportSort {
  field: string
  direction: 'asc' | 'desc'
}

export interface Dashboard {
  id: string
  name: string
  description?: string
  layout: DashboardLayout
  widgets: DashboardWidget[]
  isDefault: boolean
  isPublic: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface DashboardLayout {
  type: 'grid' | 'flex'
  columns: number
  rows?: number
}

export interface DashboardWidget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'list'
  title: string
  reportId?: string
  config: WidgetConfig
  position: WidgetPosition
  refreshInterval?: number // in seconds
}

export interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter'
  metric?: {
    field: string
    aggregate: 'sum' | 'avg' | 'count' | 'min' | 'max'
    format?: string
    comparison?: 'previous_period' | 'previous_year'
  }
  limit?: number
  colors?: string[]
}

export interface WidgetPosition {
  x: number
  y: number
  width: number
  height: number
}

export interface ReportData {
  reportId: string
  executedAt: Date
  parameters: Record<string, any>
  data: any[]
  summary?: ReportSummary
  metadata?: ReportMetadata
}

export interface ReportSummary {
  totalRecords: number
  aggregates: Record<string, number>
  executionTime: number // in milliseconds
}

export interface ReportMetadata {
  filters: ReportFilter[]
  dateRange?: {
    start: Date
    end: Date
  }
  groupings?: string[]
}

// Utility functions
export const formatReportValue = (
  value: any,
  type: ReportColumn['type'],
  format?: string
): string => {
  if (value === null || value === undefined) return '-'
  
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: format || 'AED'
      }).format(value)
    
    case 'percentage':
      return `${(value * 100).toFixed(2)}%`
    
    case 'number':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: format ? parseInt(format) : 0,
        maximumFractionDigits: format ? parseInt(format) : 2
      }).format(value)
    
    case 'date':
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    
    default:
      return String(value)
  }
}

export const applyReportFilters = (
  data: any[],
  filters: ReportFilter[]
): any[] => {
  return data.filter(item => {
    return filters.every(filter => {
      const value = item[filter.field]
      
      switch (filter.operator) {
        case 'equals':
          return value === filter.value
        case 'not_equals':
          return value !== filter.value
        case 'contains':
          return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
        case 'greater_than':
          return value > filter.value
        case 'less_than':
          return value < filter.value
        case 'between':
          return value >= filter.value[0] && value <= filter.value[1]
        case 'in':
          return filter.value.includes(value)
        default:
          return true
      }
    })
  })
}

export const calculateAggregates = (
  data: any[],
  columns: ReportColumn[]
): Record<string, number> => {
  const aggregates: Record<string, number> = {}
  
  columns.forEach(column => {
    if (column.aggregate) {
      const values = data.map(item => item[column.field]).filter(v => v !== null && v !== undefined)
      
      switch (column.aggregate) {
        case 'sum':
          aggregates[column.field] = values.reduce((sum, val) => sum + Number(val), 0)
          break
        case 'avg':
          aggregates[column.field] = values.length > 0
            ? values.reduce((sum, val) => sum + Number(val), 0) / values.length
            : 0
          break
        case 'count':
          aggregates[column.field] = values.length
          break
        case 'min':
          aggregates[column.field] = Math.min(...values.map(Number))
          break
        case 'max':
          aggregates[column.field] = Math.max(...values.map(Number))
          break
      }
    }
  })
  
  return aggregates
}

export const getDateRangeFilter = (
  period: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year'
): { start: Date; end: Date } => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (period) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      }
    
    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      return {
        start: yesterday,
        end: new Date(today.getTime() - 1)
      }
    
    case 'this_week':
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return {
        start: weekStart,
        end: now
      }
    
    case 'this_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now
      }
    
    case 'this_year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now
      }
    
    default:
      return { start: today, end: now }
  }
}

export const exportReportData = (
  data: any[],
  format: 'csv' | 'excel',
  columns: ReportColumn[]
): string => {
  if (format === 'csv') {
    const headers = columns.map(col => col.label).join(',')
    const rows = data.map(item => 
      columns.map(col => {
        const value = item[col.field]
        // Escape values containing commas or quotes
        if (String(value).includes(',') || String(value).includes('"')) {
          return `"${String(value).replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
    
    return [headers, ...rows].join('\n')
  }
  
  // For Excel format, return a placeholder (actual implementation would use a library)
  return 'Excel export not implemented'
}

// Export default for compatibility
export default {
  formatReportValue,
  applyReportFilters,
  calculateAggregates,
  getDateRangeFilter,
  exportReportData
}