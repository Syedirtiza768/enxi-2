# Component Patterns - Enxi ERP

## Overview
This document outlines the standard patterns for implementing React components in the Enxi ERP system. All components should follow these patterns for consistency and type safety.

## Component Structure

### Basic Component Pattern
```typescript
import React from 'react'

interface ComponentProps {
  // Props definition
}

export function ComponentName({ prop1, prop2 }: ComponentProps): JSX.Element {
  // Component logic
  return (
    <div>
      {/* JSX content */}
    </div>
  )
}
```

### Component with State
```typescript
'use client'

import React, { useState, useCallback } from 'react'

interface ComponentProps {
  initialValue?: string
  onChange?: (value: string) => void
}

export function ComponentName({ 
  initialValue = '', 
  onChange 
}: ComponentProps): JSX.Element {
  const [value, setValue] = useState(initialValue)
  
  const handleChange = useCallback((newValue: string) => {
    setValue(newValue)
    onChange?.(newValue)
  }, [onChange])
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  )
}
```

## Form Components

### Form State Management
```typescript
import { useState, useCallback } from 'react'
import type { FormErrors } from '@/lib/types'

interface FormData {
  name: string
  email: string
  phone?: string
}

export function CustomerForm(): JSX.Element {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: undefined,
  })
  
  const [errors, setErrors] = useState<FormErrors<FormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleFieldChange = useCallback((
    field: keyof FormData,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [errors])
  
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors<FormData> = {}
    
    if (!formData.name) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    try {
      // API call
    } catch (error) {
      // Error handling
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

### Form Field Component
```typescript
interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'number'
}

export function FormField({
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  type = 'text',
}: FormFieldProps): JSX.Element {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-md ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
```

## List/Table Components

### Data Table Pattern
```typescript
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import type { Customer } from '@/lib/generated/prisma'

interface CustomerListProps {
  onSelectCustomer?: (customer: Customer) => void
}

export function CustomerList({ 
  onSelectCustomer 
}: CustomerListProps): JSX.Element {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  
  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  
  useEffect(() => {
    fetchCustomers()
  }, [page, search, statusFilter])
  
  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      })
      
      const response = await apiClient.get<{
        items: Customer[]
        total: number
      }>(`/api/customers?${params}`)
      
      if (response.ok && response.data) {
        setCustomers(response.data.items)
        setTotal(response.data.total)
      }
    } catch (err) {
      setError('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />
  if (customers.length === 0) return <EmptyState />
  
  return (
    <div>
      <SearchFilter value={search} onChange={setSearch} />
      <table className="w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(customer => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              onSelect={onSelectCustomer}
            />
          ))}
        </tbody>
      </table>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onChange={setPage}
      />
    </div>
  )
}
```

### Row Component
```typescript
interface CustomerRowProps {
  customer: Customer
  onSelect?: (customer: Customer) => void
}

function CustomerRow({ 
  customer, 
  onSelect 
}: CustomerRowProps): JSX.Element {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2">{customer.name}</td>
      <td className="px-4 py-2">{customer.email}</td>
      <td className="px-4 py-2">
        <StatusBadge status={customer.status} />
      </td>
      <td className="px-4 py-2">
        <button
          onClick={() => onSelect?.(customer)}
          className="text-blue-600 hover:underline"
        >
          View
        </button>
      </td>
    </tr>
  )
}
```

## Modal/Dialog Components

### Modal Pattern
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
}

export function Modal({ 
  open, 
  onOpenChange, 
  title, 
  children 
}: ModalProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

## API Integration

### Data Fetching Hook
```typescript
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'

interface UseApiOptions {
  autoFetch?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

export function useApi<T>(
  endpoint: string,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const { autoFetch = true, onSuccess, onError } = options
  
  const fetch = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get<T>(endpoint)
      
      if (response.ok && response.data) {
        setData(response.data)
        onSuccess?.(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    if (autoFetch) {
      fetch()
    }
  }, [endpoint])
  
  return { data, loading, error, refetch: fetch }
}
```

## Error Handling

### Error Boundary
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }
  
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }
  
  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-red-600">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

## Common UI Components

### Status Badge
```typescript
interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export function StatusBadge({ 
  status, 
  variant = 'default' 
}: StatusBadgeProps): JSX.Element {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      variantClasses[variant]
    }`}>
      {status}
    </span>
  )
}
```

### Loading States
```typescript
export function LoadingSpinner(): JSX.Element {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )
}

export function LoadingSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  )
}
```

### Empty States
```typescript
interface EmptyStateProps {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ 
  title = 'No data found',
  description,
  action,
}: EmptyStateProps): JSX.Element {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

## Type Safety Guidelines

### 1. Always Define Props Interfaces
```typescript
// ✅ Good
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

// ❌ Bad
function Button(props: any) { }
```

### 2. Use Proper Return Types
```typescript
// ✅ Good
function Component(): JSX.Element {
  return <div>Content</div>
}

function MaybeComponent(): JSX.Element | null {
  if (condition) return null
  return <div>Content</div>
}

// ❌ Bad
function Component() {
  return <div>Content</div>
}
```

### 3. Type Event Handlers
```typescript
// ✅ Good
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  // Handle click
}

const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const value = event.target.value
}

// ❌ Bad
const handleClick = (event: any) => { }
```

### 4. Type API Responses
```typescript
// ✅ Good
const response = await apiClient.get<Customer[]>('/api/customers')
if (response.ok && response.data) {
  setCustomers(response.data)
}

// ❌ Bad
const response = await apiClient.get('/api/customers')
setCustomers(response.data)
```

## Best Practices

1. **Use Function Components**: Prefer function components with hooks
2. **Keep Components Small**: Single responsibility principle
3. **Extract Custom Hooks**: Reuse stateful logic
4. **Memoize Expensive Operations**: Use useMemo and useCallback
5. **Handle Loading States**: Always show loading indicators
6. **Handle Error States**: Provide meaningful error messages
7. **Use TypeScript Strictly**: No any types
8. **Test Components**: Write unit tests for logic
9. **Document Complex Props**: Add JSDoc comments
10. **Follow Naming Conventions**: PascalCase for components

## Common Mistakes to Avoid

1. **Not handling loading states**
```typescript
// ❌ Bad
function List() {
  const [data, setData] = useState([])
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData)
  }, [])
  return <div>{data.map(...)}</div>
}

// ✅ Good
function List() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  // ... proper loading handling
}
```

2. **Using array index as key**
```typescript
// ❌ Bad
{items.map((item, index) => <Item key={index} />)}

// ✅ Good
{items.map(item => <Item key={item.id} />)}
```

3. **Not memoizing callbacks**
```typescript
// ❌ Bad
<Child onChange={(value) => setValue(value)} />

// ✅ Good
const handleChange = useCallback((value) => {
  setValue(value)
}, [])
<Child onChange={handleChange} />
```

This guide ensures consistent, type-safe, and maintainable React components across the Enxi ERP system.