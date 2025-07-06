'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from '@tanstack/react-table'
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading?: boolean
  error?: string | null
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
  search?: {
    value: string
    placeholder?: string
    onChange: (value: string) => void
  }
  filters?: React.ReactNode
  actions?: React.ReactNode
  onRefresh?: () => void
  onExport?: () => void
  onRowClick?: (row: TData) => void
  bulkActions?: {
    onSelectAll?: (selected: boolean) => void
    onSelectRow?: (row: TData, selected: boolean) => void
    selectedRows?: Set<string>
    actions?: React.ReactNode
  }
  emptyState?: {
    icon?: React.ReactNode
    title?: string
    description?: string
    action?: React.ReactNode
  }
  showColumnVisibility?: boolean
  showSorting?: boolean
  stickyHeader?: boolean
  maxHeight?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  error = null,
  pagination,
  search,
  filters,
  actions,
  onRefresh,
  onExport,
  onRowClick,
  bulkActions,
  emptyState,
  showColumnVisibility = true,
  showSorting = true,
  stickyHeader = true,
  maxHeight = 'calc(100vh - 200px)',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [showFilters, setShowFilters] = React.useState(false)

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    manualPagination: !!pagination,
    pageCount: pagination ? Math.ceil(pagination.total / pagination.pageSize) : undefined,
  })

  const selectedRowsCount = Object.keys(rowSelection).length

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center gap-2">
            {search && (
              <div className="relative w-full max-w-sm sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={search.placeholder || 'Search...'}
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
            {filters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && 'bg-muted')}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            {showColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Columns
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {actions}
          </div>
        </div>

        {/* Filters */}
        {showFilters && filters && (
          <Card className="p-4">
            {filters}
          </Card>
        )}

        {/* Bulk Actions */}
        {bulkActions && selectedRowsCount > 0 && (
          <Card className="p-3 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedRowsCount} row{selectedRowsCount > 1 ? 's' : ''} selected
              </p>
              <div className="flex items-center gap-2">
                {bulkActions.actions}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => table.resetRowSelection()}
                >
                  Clear
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div 
          className={cn(
            'relative overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100',
            stickyHeader && 'max-h-[600px]'
          )}
          style={{ maxHeight: stickyHeader ? maxHeight : undefined }}
        >
          {error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              {onRefresh && (
                <Button onClick={onRefresh} variant="outline">
                  Retry
                </Button>
              )}
            </div>
          ) : loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center">
              {emptyState?.icon || <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />}
              <h3 className="text-lg font-medium mb-2">
                {emptyState?.title || 'No data found'}
              </h3>
              <p className="text-gray-500 mb-4">
                {emptyState?.description || 'Try adjusting your search or filters'}
              </p>
              {emptyState?.action}
            </div>
          ) : (
            <Table className="min-w-full">
              <TableHeader className={cn(stickyHeader && 'sticky top-0 bg-white z-10 border-b')}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const canSort = showSorting && header.column.getCanSort()
                      const isSorted = header.column.getIsSorted()
                      
                      return (
                        <TableHead 
                          key={header.id}
                          className={cn(canSort && 'cursor-pointer select-none')}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <div className="flex items-center gap-2">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                            {canSort && (
                              <div className="ml-auto">
                                {isSorted === 'asc' ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : isSorted === 'desc' ? (
                                  <ArrowDown className="h-4 w-4" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            )}
                          </div>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className={cn(
                        onRowClick && 'cursor-pointer hover:bg-muted/50',
                        row.getIsSelected() && 'bg-muted'
                      )}
                      onClick={() => onRowClick && onRowClick(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Pagination */}
      {(pagination || (!pagination && data.length > 10)) && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {pagination ? (
              <>
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} results
              </>
            ) : (
              <>
                {table.getFilteredSelectedRowModel().rows.length} of{' '}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </>
            )}
          </div>
          <div className="flex items-center gap-6">
            {!pagination && (
              <div className="flex items-center gap-2">
                <p className="text-sm">Rows per page</p>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value))
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              {pagination ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">
                      Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(pagination.page + 1)}
                    disabled={pagination.page * pagination.pageSize >= pagination.total}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(Math.ceil(pagination.total / pagination.pageSize))}
                    disabled={pagination.page * pagination.pageSize >= pagination.total}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to create selection column
export function createSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
}

// Helper function to create actions column
export function createActionsColumn<TData>(
  actions: (row: TData) => React.ReactNode
): ColumnDef<TData> {
  return {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          {actions(row.original)}
        </div>
      )
    },
  }
}

// Export data table column helper for easy column creation
export { type ColumnDef } from '@tanstack/react-table'