"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Search, X, Filter, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export interface SearchFilter {
  id: string
  label: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'number'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export interface SearchResult {
  id: string
  title: string
  description?: string
  category?: string
  metadata?: Record<string, any>
}

interface AdvancedSearchProps {
  filters?: SearchFilter[]
  onSearch?: (query: string, filters: Record<string, any>) => void
  onClear?: () => void
  placeholder?: string
  debounceMs?: number
  showFilters?: boolean
  className?: string
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  filters = [],
  onSearch,
  onClear,
  placeholder = "Search...",
  debounceMs = 300,
  showFilters = true,
  className = "",
}) => {
  const [query, setQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query || Object.keys(activeFilters).length > 0) {
        onSearch?.(query, activeFilters)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, activeFilters, debounceMs, onSearch])

  const handleFilterChange = (filterId: string, value: any) => {
    setActiveFilters(prev => {
      const updated = { ...prev }
      if (value === null || value === undefined || value === '') {
        delete updated[filterId]
      } else {
        updated[filterId] = value
      }
      return updated
    })
  }

  const handleClear = () => {
    setQuery("")
    setActiveFilters({})
    onClear?.()
  }

  const activeFilterCount = Object.keys(activeFilters).length

  const renderFilterInput = (filter: SearchFilter) => {
    const value = activeFilters[filter.id]

    switch (filter.type) {
      case 'select':
        return (
          <Select
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          >
            <option value="">All</option>
            {filter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )

      case 'multiselect':
        return (
          <div className="space-y-2">
            {filter.options?.map(option => (
              <label key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  checked={(value || []).includes(option.value)}
                  onCheckedChange={(checked) => {
                    const current = value || []
                    const updated = checked
                      ? [...current, option.value]
                      : current.filter((v: string) => v !== option.value)
                    handleFilterChange(filter.id, updated.length > 0 ? updated : null)
                  }}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            placeholder={filter.placeholder}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            placeholder={filter.placeholder}
          />
        )

      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            placeholder={filter.placeholder}
          />
        )
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-10"
          />
          {(query || activeFilterCount > 0) && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showFilters && filters.length > 0 && (
          <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveFilters({})}
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {filters.map(filter => (
                    <div key={filter.id} className="space-y-2">
                      <Label>{filter.label}</Label>
                      {renderFilterInput(filter)}
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {activeFilterCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([filterId, value]) => {
            const filter = filters.find(f => f.id === filterId)
            if (!filter) return null

            let displayValue = value
            if (filter.type === 'select' && filter.options) {
              const option = filter.options.find(o => o.value === value)
              displayValue = option?.label || value
            } else if (filter.type === 'multiselect' && Array.isArray(value)) {
              displayValue = `${value.length} selected`
            }

            return (
              <Badge key={filterId} variant="secondary" className="flex items-center gap-1">
                {filter.label}: {displayValue}
                <button
                  onClick={() => handleFilterChange(filterId, null)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdvancedSearch