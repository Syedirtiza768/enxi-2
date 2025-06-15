import type { TableColumn } from '@/lib/types'
import type { SortDirection as BaseSortDirection } from '@/lib/types'
export type SortDirection = BaseSortDirection | 'none'
'use client'

import React, { forwardRef, useRef, useCallback, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useTableNavigation } from '@/lib/accessibility/keyboard-navigation'
import { generateTableAria, generateTableHeaderAria, generateTableCellAria } from '@/lib/accessibility/aria-utils'
import { useScreenReaderAnnouncements } from '@/lib/accessibility/announce'
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'

/**
 * Enhanced table component with comprehensive accessibility features
 */

// SortDirection extended for accessibility

// TableColumn moved to common types

export interface AccessibleTableProps {
  /**
   * Table columns configuration
   */
  columns: TableColumn[]
  
  /**
   * Table data
   */
  data: Record<string, any>[]
  
  /**
   * Table caption for screen readers
   */
  caption?: string
  
  /**
   * Table summary for complex tables
   */
  summary?: string
  
  /**
   * Current sort column and direction
   */
  sortConfig?: {
    key: string
    direction: SortDirection
  }
  
  /**
   * Sort change handler
   */
  onSort?: (key: string, direction: SortDirection) => void
  
  /**
   * Row selection configuration
   */
  selection?: {
    selectedRows: Set<string>
    onSelectionChange: (selectedRows: Set<string>) => void
    getRowId: (row: Record<string, any>) => string
  }
  
  /**
   * Custom cell renderer
   */
  renderCell?: (value: any, column: TableColumn, row: Record<string, any>) => React.ReactNode
  
  /**
   * Loading state
   */
  loading?: boolean
  
  /**
   * Empty state message
   */
  emptyMessage?: string
  
  /**
   * Additional table props
   */
  className?: string
  
  /**
   * Row click handler
   */
  onRowClick?: (row: Record<string, any>) => void
  
  /**
   * Whether to announce sort changes
   */
  announceSortChanges?: boolean
}

export const AccessibleTable = forwardRef<HTMLTableElement, AccessibleTableProps>(
  ({
    columns,
    data,
    caption,
    summary,
    sortConfig,
    onSort,
    selection,
    renderCell,
    loading = false,
    emptyMessage = 'No data available',
    className,
    onRowClick,
    announceSortChanges = true,
    ...props
  }, ref) => {
    const tableRef = useRef<HTMLTableElement>(null)
    const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null)
    const { announce } = useScreenReaderAnnouncements()
    
    // Combine refs
    const combinedRef = (node: HTMLTableElement) => {
      if (tableRef.current) tableRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }
    
    const tableId = React.useId()
    const captionId = caption ? `${tableId}-caption` : undefined
    const summaryId = summary ? `${tableId}-summary` : undefined
    
    // Handle table navigation
    const handleTableNavigation = useCallback((direction: 'up' | 'down' | 'left' | 'right', event: KeyboardEvent) => {
      if (!focusedCell) return
      
      const maxRow = data.length - 1
      const maxCol = columns.length - 1 + (selection ? 1 : 0) // +1 for selection column
      
      let newRow = focusedCell.row
      let newCol = focusedCell.col
      
      switch (direction) {
        case 'up':
          newRow = Math.max(-1, focusedCell.row - 1) // -1 for header row
          break
        case 'down':
          newRow = Math.min(maxRow, focusedCell.row + 1)
          break
        case 'left':
          newCol = Math.max(0, focusedCell.col - 1)
          break
        case 'right':
          newCol = Math.min(maxCol, focusedCell.col + 1)
          break
      }
      
      // Focus the new cell
      const newCell = getCellElement(newRow, newCol)
      if (newCell) {
        newCell.focus()
        setFocusedCell({ row: newRow, col: newCol })
        
        // Announce navigation for screen readers
        const rowType = newRow === -1 ? 'header' : 'data'
        const columnName = columns[newCol - (selection ? 1 : 0)]?.label || 'selection'
        announce(`${rowType} row, ${columnName} column`, 'polite')
      }
    }, [focusedCell, data.length, columns, selection, announce])
    
    useTableNavigation(handleTableNavigation)
    
    // Helper function to get cell element
    const getCellElement = (row: number, col: number): HTMLElement | null => {
      if (!tableRef.current) return null
      
      if (row === -1) {
        // Header row
        const headerRow = tableRef.current.querySelector('thead tr')
        return headerRow?.children[col] as HTMLElement
      } else {
        // Data row
        const dataRow = tableRef.current.querySelector(`tbody tr:nth-child(${row + 1})`)
        return dataRow?.children[col] as HTMLElement
      }
    }
    
    // Handle sort
    const handleSort = (columnKey: string) => {
      if (!onSort) return
      
      const column = columns.find(col => col.key === columnKey)
      if (!column?.sortable) return
      
      let newDirection: SortDirection = 'asc'
      
      if (sortConfig.key === columnKey) {
        newDirection = sortConfig.direction === 'asc' ? 'desc' : 
                     sortConfig.direction === 'desc' ? 'none' : 'asc'
      }
      
      onSort(columnKey, newDirection)
      
      if (announceSortChanges) {
        const directionText = newDirection === 'none' ? 'unsorted' : 
                             newDirection === 'asc' ? 'ascending' : 'descending'
        announce(`Table sorted by ${column.label}, ${directionText}`, 'polite')
      }
    }
    
    // Handle row selection
    const handleRowSelection = (rowId: string, checked: boolean) => {
      if (!selection) return
      
      const newSelection = new Set(selection.selectedRows)
      if (checked) {
        newSelection.add(rowId)
      } else {
        newSelection.delete(rowId)
      }
      
      selection.onSelectionChange(newSelection)
      
      // Announce selection change
      const selectedCount = newSelection.size
      announce(`${selectedCount} row${selectedCount !== 1 ? 's' : ''} selected`, 'polite')
    }
    
    // Handle select all
    const handleSelectAll = (checked: boolean) => {
      if (!selection) return
      
      const newSelection = checked 
        ? new Set(data.map(row => selection.getRowId(row)))
        : new Set<string>()
      
      selection.onSelectionChange(newSelection)
      
      const action = checked ? 'selected' : 'deselected'
      announce(`All rows ${action}`, 'polite')
    }
    
    // Get sort icon
    const getSortIcon = (columnKey: string) => {
      if (sortConfig?.key !== columnKey) {
        return <ArrowUpDown className="h-4 w-4 text-gray-400" />
      }
      
      return sortConfig.direction === 'asc' ? (
        <ChevronUp className="h-4 w-4 text-gray-600" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-600" />
      )
    }
    
    // Calculate total columns for aria-colcount
    const totalColumns = columns.length + (selection ? 1 : 0)
    
    // Generate table ARIA attributes
    const tableAria = generateTableAria({
      rowCount: data.length + 1, // +1 for header
      columnCount: totalColumns,
      label: caption,
      describedBy: summaryId
    })
    
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Loading table data...</span>
        </div>
      )
    }
    
    return (
      <div className="overflow-x-auto">
        {/* Table summary for screen readers */}
        {summary && (
          <div id={summaryId} className="sr-only">
            {summary}
          </div>
        )}
        
        <table
          ref={combinedRef}
          id={tableId}
          className={cn('min-w-full divide-y divide-gray-200', className)}
          {...tableAria}
          {...props}
        >
          {/* Caption */}
          {caption && (
            <caption id={captionId} className="sr-only">
              {caption}
            </caption>
          )}
          
          {/* Header */}
          <thead className="bg-gray-50">
            <tr role="row">
              {/* Selection header */}
              {selection && (
                <th
                  scope="col"
                  className="px-6 py-3 text-left"
                  {...generateTableHeaderAria({ columnIndex: 1, scope: 'col' })}
                >
                  <input
                    type="checkbox"
                    checked={selection.selectedRows.size === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    onFocus={() => setFocusedCell({ row: -1, col: 0 })}
                    aria-label="Select all rows"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}
              
              {/* Column headers */}
              {columns.map((column, index) => {
                const colIndex = index + (selection ? 2 : 1)
                const isSorted = sortConfig.key === column.key
                const sortDirection = isSorted ? sortConfig.direction : 'none'
                
                const headerAria = generateTableHeaderAria({
                  sort: column.sortable ? sortDirection : undefined,
                  columnIndex: colIndex,
                  scope: 'col'
                })
                
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                      column.sortable && 'cursor-pointer hover:bg-gray-100',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                    onFocus={() => setFocusedCell({ row: -1, col: colIndex - 1 })}
                    tabIndex={column.sortable ? 0 : -1}
                    aria-label={
                      column.sortable 
                        ? `${column.label}, sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`
                        : column.label
                    }
                    {...headerAria}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                    {column.description && (
                      <div className="sr-only">{column.description}</div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          
          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={totalColumns}
                  className="px-6 py-12 text-center text-gray-500"
                  role="cell"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowId = selection?.getRowId(row)
                const isSelected = rowId && selection?.selectedRows.has(rowId)
                
                return (
                  <tr
                    key={rowId || rowIndex}
                    role="row"
                    aria-rowindex={rowIndex + 2} // +2 for 1-based index and header
                    className={cn(
                      'hover:bg-gray-50',
                      isSelected && 'bg-blue-50',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {/* Selection cell */}
                    {selection && rowId && (
                      <td
                        className="px-6 py-4 whitespace-nowrap"
                        {...generateTableCellAria({ columnIndex: 1, rowIndex: rowIndex + 2 })}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected || false}
                          onChange={(e) => handleRowSelection(rowId, e.target.checked)}
                          onFocus={() => setFocusedCell({ row: rowIndex, col: 0 })}
                          aria-label={`Select row ${rowIndex + 1}`}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                    )}
                    
                    {/* Data cells */}
                    {columns.map((column, colIndex) => {
                      const cellIndex = colIndex + (selection ? 2 : 1)
                      const value = row[column.key]
                      
                      const cellAria = generateTableCellAria({
                        columnIndex: cellIndex,
                        rowIndex: rowIndex + 2
                      })
                      
                      return (
                        <td
                          key={column.key}
                          className={cn(
                            'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right'
                          )}
                          tabIndex={0}
                          onFocus={() => setFocusedCell({ row: rowIndex, col: cellIndex - 1 })}
                          {...cellAria}
                        >
                          {renderCell ? renderCell(value, column, row) : value}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    )
  }
)

AccessibleTable.displayName = 'AccessibleTable'

/**
 * Table pagination component with accessibility features
 */
export interface TablePaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  className?: string
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className
}: TablePaginationProps) {
  const { announce } = useScreenReaderAnnouncements()
  
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
      announce(`Page ${page} of ${totalPages}`, 'polite')
    }
  }
  
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  
  return (
    <nav
      role="navigation"
      aria-label="Table pagination"
      className={cn('flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6', className)}
    >
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Go to previous page"
        >
          Previous
        </button>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Go to next page"
        >
          Next
        </button>
      </div>
      
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Go to previous page"
            >
              <span className="sr-only">Previous</span>
              <ChevronUp className="h-5 w-5 rotate-[-90deg]" />
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={cn(
                  'relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0',
                  page === currentPage
                    ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'
                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                )}
                aria-label={`Go to page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Go to next page"
            >
              <span className="sr-only">Next</span>
              <ChevronUp className="h-5 w-5 rotate-90" />
            </button>
          </nav>
        </div>
      </div>
    </nav>
  )
}