'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Eye, EyeOff, Filter, Search, MoreHorizontal } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Badge } from './badge'

interface Column {
  key: string
  label: string
  sortable?: boolean
  hideable?: boolean
  mobileHidden?: boolean
  priority?: 'high' | 'medium' | 'low'
  width?: string
  render?: (value: any, row: any) => React.ReactNode
  className?: string
}

interface ResponsiveTableProps {
  data: any[]
  columns: Column[]
  onRowClick?: (row: any) => void
  searchable?: boolean
  searchPlaceholder?: string
  filterable?: boolean
  sortable?: boolean
  loading?: boolean
  emptyMessage?: string
  className?: string
  mobileCardLayout?: boolean
  stickyHeader?: boolean
  maxHeight?: string
  onSelectionChange?: (selectedRows: any[]) => void
  selectable?: boolean
  bulkActions?: React.ReactNode
}

export function ResponsiveTable({
  data,
  columns,
  onRowClick,
  searchable = true,
  searchPlaceholder = 'Search...',
  filterable = true,
  sortable = true,
  loading = false,
  emptyMessage = 'No data available',
  className,
  mobileCardLayout = true,
  stickyHeader = true,
  maxHeight = 'calc(100vh - 200px)',
  onSelectionChange,
  selectable = false,
  bulkActions,
}: ResponsiveTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set())
  const [isMobile, setIsMobile] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Auto-hide mobile columns on mobile
    if (isMobile) {
      const mobileHiddenCols = columns
        .filter(col => col.mobileHidden || col.priority === 'low')
        .map(col => col.key)
      setHiddenColumns(new Set(mobileHiddenCols))
    } else {
      setHiddenColumns(new Set())
    }
  }, [isMobile, columns])

  const handleSort = (key: string) => {
    if (!sortable) return
    
    const column = columns.find(col => col.key === key)
    if (!column?.sortable) return

    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const handleColumnToggle = (key: string) => {
    const newHidden = new Set(hiddenColumns)
    if (newHidden.has(key)) {
      newHidden.delete(key)
    } else {
      newHidden.add(key)
    }
    setHiddenColumns(newHidden)
  }

  const handleRowSelection = (row: any) => {
    if (!selectable) return
    
    const newSelected = new Set(selectedRows)
    if (newSelected.has(row)) {
      newSelected.delete(row)
    } else {
      newSelected.add(row)
    }
    setSelectedRows(newSelected)
    onSelectionChange?.(Array.from(newSelected))
  }

  const handleSelectAll = () => {
    if (selectedRows.size === filteredData.length) {
      setSelectedRows(new Set())
      onSelectionChange?.([])
    } else {
      const newSelected = new Set(filteredData)
      setSelectedRows(newSelected)
      onSelectionChange?.(filteredData)
    }
  }

  // Filter and sort data
  const filteredData = data.filter(row => {
    if (!searchTerm) return true
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0
    
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const visibleColumns = columns.filter(col => !hiddenColumns.has(col.key))
  const hasActions = visibleColumns.some(col => col.key === 'actions')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Mobile Card Layout
  if (isMobile && mobileCardLayout) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Mobile Header */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          {filterable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3">
          {sortedData.map((row, index) => (
            <div
              key={index}
              className={cn(
                "bg-card border rounded-lg p-4 shadow-sm",
                onRowClick && "cursor-pointer hover:shadow-md transition-shadow",
                selectedRows.has(row) && "ring-2 ring-primary/20 bg-primary/5"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {visibleColumns.map((column, colIndex) => (
                <div key={column.key} className={cn(
                  "flex items-center justify-between py-1",
                  colIndex === 0 && "font-medium",
                  colIndex < visibleColumns.length - 1 && "border-b border-border/30 pb-2 mb-2"
                )}>
                  <span className="text-sm text-muted-foreground font-medium min-w-0 flex-1">
                    {column.label}
                  </span>
                  <div className="text-sm text-right min-w-0 flex-1">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {sortedData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
    )
  }

  // Desktop Table Layout
  return (
    <div className={cn("space-y-4", className)}>
      {/* Desktop Header */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-2">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          )}
          {selectable && selectedRows.size > 0 && bulkActions && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{selectedRows.size} selected</Badge>
              {bulkActions}
            </div>
          )}
        </div>

        {filterable && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </div>
        )}
      </div>

      {/* Column Visibility */}
      {showFilters && (
        <div className="bg-muted/50 p-4 rounded-lg border">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {columns.filter(col => col.hideable !== false).map((column) => (
              <label key={column.key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hiddenColumns.has(column.key)}
                  onChange={() => handleColumnToggle(column.key)}
                  className="rounded border-border"
                />
                <span className="text-sm">{column.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div 
          className="overflow-auto"
          style={{ maxHeight }}
        >
          <table className="w-full">
            <thead className={cn(
              "bg-muted/50 border-b",
              stickyHeader && "sticky top-0 z-10"
            )}>
              <tr>
                {selectable && (
                  <th className="w-12 px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                )}
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-left font-medium text-sm text-muted-foreground",
                      column.sortable && "cursor-pointer hover:text-foreground",
                      column.className
                    )}
                    style={{ width: column.width }}
                    onClick={() => handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {sortConfig?.key === column.key && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedData.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    "hover:bg-muted/50 transition-colors",
                    onRowClick && "cursor-pointer",
                    selectedRows.has(row) && "bg-primary/5"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row)}
                        onChange={() => handleRowSelection(row)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-border"
                      />
                    </td>
                  )}
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-sm",
                        column.className
                      )}
                    >
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sortedData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  )
}

export default ResponsiveTable