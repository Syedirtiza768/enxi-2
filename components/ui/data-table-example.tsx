// Example usage of the DataTable component
// This file demonstrates how to use the new DataTable component

import { useState } from 'react'
import { DataTable, ColumnDef, createSelectionColumn, createActionsColumn } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Edit, Trash, Plus, Users } from 'lucide-react'

// Define your data type
interface User {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
  createdAt: string
}

// Define columns
const columns: ColumnDef<User>[] = [
  // Selection column for bulk operations
  createSelectionColumn<User>(),
  
  // Regular columns
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('role')}</Badge>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      )
    },
  },
  
  // Actions column
  createActionsColumn<User>((user) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-red-600">
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )),
]

// Example component using DataTable
export function UserTableExample() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  return (
    <DataTable
      columns={columns}
      data={users}
      loading={loading}
      
      // Pagination configuration
      pagination={{
        page,
        pageSize,
        total: 100,
        onPageChange: setPage,
        onPageSizeChange: setPageSize,
      }}
      
      // Search configuration
      search={{
        value: search,
        placeholder: 'Search users...',
        onChange: setSearch,
      }}
      
      // Custom filters
      filters={
        <div className="flex gap-4">
          {/* Add your custom filter components here */}
          <select className="border rounded px-3 py-1">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>
      }
      
      // Action buttons
      actions={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      }
      
      // Bulk actions
      bulkActions={{
        selectedRows,
        onSelectRow: (row, selected) => {
          const newSet = new Set(selectedRows)
          if (selected) {
            newSet.add(row.id)
          } else {
            newSet.delete(row.id)
          }
          setSelectedRows(newSet)
        },
        onSelectAll: (selected) => {
          if (selected) {
            setSelectedRows(new Set(users.map(u => u.id)))
          } else {
            setSelectedRows(new Set())
          }
        },
        actions: (
          <>
            <Button size="sm" variant="outline">Export</Button>
            <Button size="sm" variant="destructive">Delete</Button>
          </>
        ),
      }}
      
      // Other props
      onRefresh={() => console.log('Refresh')}
      onExport={() => console.log('Export')}
      onRowClick={(user) => console.log('Row clicked:', user)}
      showColumnVisibility
      showSorting
      stickyHeader
      
      // Custom empty state
      emptyState={{
        icon: <Users className="h-12 w-12 text-gray-300" />,
        title: 'No users found',
        description: 'Add your first user to get started',
        action: <Button>Add User</Button>,
      }}
    />
  )
}

// Features of the DataTable component:
// 
// 1. **Built-in Pagination** - Server-side or client-side pagination
// 2. **Search** - Global search functionality
// 3. **Filters** - Custom filter components
// 4. **Sorting** - Column sorting with visual indicators
// 5. **Selection** - Row selection for bulk operations
// 6. **Column Visibility** - Show/hide columns
// 7. **Actions** - Row actions and bulk actions
// 8. **Loading States** - Built-in loading skeletons
// 9. **Empty States** - Customizable empty state
// 10. **Sticky Header** - Header stays visible when scrolling
// 11. **Export** - Built-in export functionality
// 12. **Responsive** - Mobile-friendly design
// 13. **Accessibility** - Keyboard navigation and screen reader support