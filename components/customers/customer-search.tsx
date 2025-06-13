'use client'

import React, { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiClient } from '@/lib/api/client'

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  customerCode?: string
}

interface CustomerSearchProps {
  value?: string
  onChange: (customerId: string, customer?: Customer) => void
  disabled?: boolean
  error?: string
  required?: boolean
}

export function CustomerSearch({ value, onChange, disabled, error, required }: CustomerSearchProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Load customers on mount
  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const response = await apiClient('/api/customers', { method: 'GET' })
      if (response.ok && response.data) {
        const customersData = response.data.data || response.data
        setCustomers(Array.isArray(customersData) ? customersData : [])
      }
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    const search = searchTerm.toLowerCase()
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      (customer.customerCode && customer.customerCode.toLowerCase().includes(search))
    )
  })

  const handleChange = (customerId: string) => {
    const selectedCustomer = customers.find(c => c.id === customerId)
    onChange(customerId, selectedCustomer)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="customer">
        Customer {required && <span className="text-red-500">*</span>}
      </Label>
      
      <Select
        value={value}
        onValueChange={handleChange}
        disabled={disabled || loading}
      >
        <SelectTrigger 
          id="customer" 
          className={error ? 'border-red-500' : ''}
        >
          <SelectValue placeholder={loading ? "Loading customers..." : "Select a customer"} />
        </SelectTrigger>
        <SelectContent>
          {/* Search input inside the dropdown */}
          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          {filteredCustomers.length === 0 ? (
            <div className="py-2 px-2 text-sm text-gray-500">
              {searchTerm ? 'No customers found' : 'No customers available'}
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{customer.name}</span>
                  <span className="text-xs text-gray-500">
                    {customer.customerCode && `${customer.customerCode} • `}
                    {customer.email}
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}