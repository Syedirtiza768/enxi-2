"use client"

import React, { useState } from 'react'
import { Filter, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Collapsible } from '@/components/ui/collapsible'

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface FilterGroup {
  id: string
  label: string
  type: 'checkbox' | 'radio' | 'range' | 'date' | 'select'
  options?: FilterOption[]
  min?: number
  max?: number
  step?: number
  collapsible?: boolean
  defaultExpanded?: boolean
}

export interface FilterValue {
  [key: string]: any
}

interface FilterPanelProps {
  groups: FilterGroup[]
  values?: FilterValue
  onChange?: (values: FilterValue) => void
  onReset?: () => void
  showApplyButton?: boolean
  showResetButton?: boolean
  className?: string
  title?: string
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  groups,
  values = {},
  onChange,
  onReset,
  showApplyButton = false,
  showResetButton = true,
  className = "",
  title = "Filters"
}) => {
  const [localValues, setLocalValues] = useState<FilterValue>(values)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(groups.filter(g => g.defaultExpanded !== false).map(g => g.id))
  )

  const handleChange = (groupId: string, value: any) => {
    const newValues = { ...localValues }
    
    if (value === null || value === undefined || 
        (Array.isArray(value) && value.length === 0) ||
        value === '') {
      delete newValues[groupId]
    } else {
      newValues[groupId] = value
    }

    setLocalValues(newValues)
    
    if (!showApplyButton) {
      onChange?.(newValues)
    }
  }

  const handleApply = () => {
    onChange?.(localValues)
  }

  const handleReset = () => {
    setLocalValues({})
    onChange?.({})
    onReset?.()
  }

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const getActiveFilterCount = () => {
    return Object.keys(localValues).length
  }

  const renderFilterControl = (group: FilterGroup) => {
    const value = localValues[group.id]

    switch (group.type) {
      case 'checkbox':
        return (
          <div className="space-y-2">
            {group.options?.map(option => (
              <label key={option.value} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={(value || []).includes(option.value)}
                    onCheckedChange={(checked) => {
                      const current = value || []
                      const updated = checked
                        ? [...current, option.value]
                        : current.filter((v: string) => v !== option.value)
                      handleChange(group.id, updated.length > 0 ? updated : null)
                    }}
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
                {option.count !== undefined && (
                  <span className="text-xs text-muted-foreground">({option.count})</span>
                )}
              </label>
            ))}
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            {group.options?.map(option => (
              <label key={option.value} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={group.id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleChange(group.id, e.target.value)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
                {option.count !== undefined && (
                  <span className="text-xs text-muted-foreground">({option.count})</span>
                )}
              </label>
            ))}
          </div>
        )

      case 'select':
        return (
          <Select
            value={value || ''}
            onChange={(e) => handleChange(group.id, e.target.value || null)}
          >
            <option value="">All</option>
            {group.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.count !== undefined && ` (${option.count})`}
              </option>
            ))}
          </Select>
        )

      case 'range':
        const rangeValue = value || { min: group.min, max: group.max }
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={rangeValue.min || ''}
                onChange={(e) => handleChange(group.id, {
                  ...rangeValue,
                  min: e.target.value ? Number(e.target.value) : null
                })}
                placeholder="Min"
                min={group.min}
                max={group.max}
                step={group.step}
                className="w-24"
              />
              <span className="text-sm">to</span>
              <Input
                type="number"
                value={rangeValue.max || ''}
                onChange={(e) => handleChange(group.id, {
                  ...rangeValue,
                  max: e.target.value ? Number(e.target.value) : null
                })}
                placeholder="Max"
                min={group.min}
                max={group.max}
                step={group.step}
                className="w-24"
              />
            </div>
          </div>
        )

      case 'date':
        const dateValue = value || {}
        return (
          <div className="space-y-2">
            <div className="space-y-2">
              <Input
                type="date"
                value={dateValue.from || ''}
                onChange={(e) => handleChange(group.id, {
                  ...dateValue,
                  from: e.target.value || null
                })}
                className="w-full"
              />
              <Input
                type="date"
                value={dateValue.to || ''}
                onChange={(e) => handleChange(group.id, {
                  ...dateValue,
                  to: e.target.value || null
                })}
                className="w-full"
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const activeCount = getActiveFilterCount()

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="font-semibold">{title}</h3>
            {activeCount > 0 && (
              <Badge variant="secondary">{activeCount}</Badge>
            )}
          </div>
          {showResetButton && activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.id)
            const content = (
              <div className="space-y-2">
                <Label>{group.label}</Label>
                {renderFilterControl(group)}
              </div>
            )

            if (group.collapsible) {
              return (
                <Collapsible key={group.id} open={isExpanded}>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <Label className="cursor-pointer">{group.label}</Label>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="mt-2">
                      {renderFilterControl(group)}
                    </div>
                  )}
                </Collapsible>
              )
            }

            return <div key={group.id}>{content}</div>
          })}
        </div>

        {showApplyButton && (
          <Button onClick={handleApply} className="w-full">
            Apply Filters
          </Button>
        )}
      </div>
    </Card>
  )
}

export default FilterPanel