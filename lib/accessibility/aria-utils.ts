/**
 * ARIA utilities for generating accessible attributes
 * Provides consistent ARIA attribute generation and validation
 */

import { useId } from 'react'

/**
 * ARIA live region types
 */
export type AriaLive = 'off' | 'polite' | 'assertive'

/**
 * ARIA expanded states
 */
export type AriaExpanded = boolean | 'false' | 'true'

/**
 * ARIA pressed states
 */
export type AriaPressed = boolean | 'false' | 'true' | 'mixed'

/**
 * ARIA sort directions
 */
export type AriaSort = 'none' | 'ascending' | 'descending' | 'other'

/**
 * ARIA current states
 */
export type AriaCurrent = boolean | 'false' | 'true' | 'page' | 'step' | 'location' | 'date' | 'time'

/**
 * Generate ARIA attributes for form fields
 */
export interface FormFieldAriaProps {
  id?: string
  label?: string
  description?: string
  error?: string
  required?: boolean
  invalid?: boolean
}

/**
 * Hook for generating consistent form field ARIA attributes
 */
export function useFormFieldAria({
  id,
  label,
  description,
  error,
  required = false,
  invalid = false
}: FormFieldAriaProps) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const labelId = `${fieldId}-label`
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = error ? `${fieldId}-error` : undefined

  // Build describedby list
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ')

  return {
    field: {
      id: fieldId,
      'aria-labelledby': label ? labelId : undefined,
      'aria-describedby': describedBy || undefined,
      'aria-required': required || undefined,
      'aria-invalid': invalid || undefined
    },
    label: {
      id: labelId,
      htmlFor: fieldId
    },
    description: description ? {
      id: descriptionId,
      'aria-live': 'polite' as AriaLive
    } : undefined,
    error: error ? {
      id: errorId,
      'aria-live': 'assertive' as AriaLive,
      role: 'alert'
    } : undefined
  }
}

/**
 * Generate ARIA attributes for buttons
 */
export interface ButtonAriaProps {
  expanded?: boolean
  pressed?: AriaPressed
  controls?: string
  describedBy?: string
  label?: string
  disabled?: boolean
  popup?: boolean | 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
}

export function generateButtonAria({
  expanded,
  pressed,
  controls,
  describedBy,
  label,
  disabled,
  popup
}: ButtonAriaProps) {
  return {
    'aria-expanded': expanded !== undefined ? String(expanded) : undefined,
    'aria-pressed': pressed !== undefined ? String(pressed) : undefined,
    'aria-controls': controls,
    'aria-describedby': describedBy,
    'aria-label': label,
    'aria-disabled': disabled ? 'true' : undefined,
    'aria-haspopup': popup !== undefined ? String(popup) : undefined
  }
}

/**
 * Generate ARIA attributes for tab components
 */
export interface TabAriaProps {
  isSelected?: boolean
  controls?: string
  setSize?: number
  posInSet?: number
}

export function generateTabAria({
  isSelected,
  controls,
  setSize,
  posInSet
}: TabAriaProps) {
  return {
    role: 'tab',
    'aria-selected': isSelected ? 'true' : 'false',
    'aria-controls': controls,
    'aria-setsize': setSize,
    'aria-posinset': posInSet,
    tabIndex: isSelected ? 0 : -1
  }
}

/**
 * Generate ARIA attributes for tab panels
 */
export interface TabPanelAriaProps {
  labelledBy?: string
  hidden?: boolean
}

export function generateTabPanelAria({
  labelledBy,
  hidden
}: TabPanelAriaProps) {
  return {
    role: 'tabpanel',
    'aria-labelledby': labelledBy,
    'aria-hidden': hidden ? 'true' : undefined,
    tabIndex: hidden ? -1 : 0
  }
}

/**
 * Generate ARIA attributes for table components
 */
export interface TableAriaProps {
  rowCount?: number
  columnCount?: number
  label?: string
  describedBy?: string
  sortable?: boolean
}

export function generateTableAria({
  rowCount,
  columnCount,
  label,
  describedBy,
  sortable
}: TableAriaProps) {
  return {
    role: 'table',
    'aria-rowcount': rowCount,
    'aria-colcount': columnCount,
    'aria-label': label,
    'aria-describedby': describedBy,
    'aria-sort': sortable ? 'none' : undefined
  }
}

/**
 * Generate ARIA attributes for table headers
 */
export interface TableHeaderAriaProps {
  sort?: AriaSort
  columnIndex?: number
  scope?: 'col' | 'row' | 'colgroup' | 'rowgroup'
}

export function generateTableHeaderAria({
  sort,
  columnIndex,
  scope = 'col'
}: TableHeaderAriaProps) {
  return {
    role: 'columnheader',
    'aria-sort': sort,
    'aria-colindex': columnIndex,
    scope: scope
  }
}

/**
 * Generate ARIA attributes for table cells
 */
export interface TableCellAriaProps {
  columnIndex?: number
  rowIndex?: number
  columnSpan?: number
  rowSpan?: number
  headers?: string
}

export function generateTableCellAria({
  columnIndex,
  rowIndex,
  columnSpan,
  rowSpan,
  headers
}: TableCellAriaProps) {
  return {
    role: 'cell',
    'aria-colindex': columnIndex,
    'aria-rowindex': rowIndex,
    'aria-colspan': columnSpan,
    'aria-rowspan': rowSpan,
    headers: headers
  }
}

/**
 * Generate ARIA attributes for menu components
 */
export interface MenuAriaProps {
  orientation?: 'horizontal' | 'vertical'
  label?: string
  activedescendant?: string
}

export function generateMenuAria({
  orientation = 'vertical',
  label,
  activedescendant
}: MenuAriaProps) {
  return {
    role: 'menu',
    'aria-orientation': orientation,
    'aria-label': label,
    'aria-activedescendant': activedescendant
  }
}

/**
 * Generate ARIA attributes for menu items
 */
export interface MenuItemAriaProps {
  disabled?: boolean
  expanded?: boolean
  popup?: boolean
  checked?: boolean
  setSize?: number
  posInSet?: number
}

export function generateMenuItemAria({
  disabled,
  expanded,
  popup,
  checked,
  setSize,
  posInSet
}: MenuItemAriaProps) {
  return {
    role: 'menuitem',
    'aria-disabled': disabled ? 'true' : undefined,
    'aria-expanded': expanded !== undefined ? String(expanded) : undefined,
    'aria-haspopup': popup ? 'true' : undefined,
    'aria-checked': checked !== undefined ? String(checked) : undefined,
    'aria-setsize': setSize,
    'aria-posinset': posInSet,
    tabIndex: -1
  }
}

/**
 * Generate ARIA attributes for listbox components
 */
export interface ListboxAriaProps {
  multiselectable?: boolean
  orientation?: 'horizontal' | 'vertical'
  label?: string
  activedescendant?: string
  expanded?: boolean
}

export function generateListboxAria({
  multiselectable,
  orientation = 'vertical',
  label,
  activedescendant,
  expanded
}: ListboxAriaProps) {
  return {
    role: 'listbox',
    'aria-multiselectable': multiselectable ? 'true' : undefined,
    'aria-orientation': orientation,
    'aria-label': label,
    'aria-activedescendant': activedescendant,
    'aria-expanded': expanded !== undefined ? String(expanded) : undefined
  }
}

/**
 * Generate ARIA attributes for listbox options
 */
export interface OptionAriaProps {
  selected?: boolean
  disabled?: boolean
  setSize?: number
  posInSet?: number
}

export function generateOptionAria({
  selected,
  disabled,
  setSize,
  posInSet
}: OptionAriaProps) {
  return {
    role: 'option',
    'aria-selected': selected ? 'true' : 'false',
    'aria-disabled': disabled ? 'true' : undefined,
    'aria-setsize': setSize,
    'aria-posinset': posInSet
  }
}

/**
 * Generate ARIA attributes for disclosure/accordion components
 */
export interface DisclosureAriaProps {
  expanded?: boolean
  controls?: string
  level?: number
}

export function generateDisclosureAria({
  expanded,
  controls,
  level
}: DisclosureAriaProps) {
  return {
    'aria-expanded': expanded ? 'true' : 'false',
    'aria-controls': controls,
    'aria-level': level
  }
}

/**
 * Generate ARIA attributes for modal/dialog components
 */
export interface DialogAriaProps {
  labelledBy?: string
  describedBy?: string
  modal?: boolean
}

export function generateDialogAria({
  labelledBy,
  describedBy,
  modal = true
}: DialogAriaProps) {
  return {
    role: 'dialog',
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'aria-modal': modal ? 'true' : undefined
  }
}

/**
 * Generate ARIA attributes for progress indicators
 */
export interface ProgressAriaProps {
  value?: number
  min?: number
  max?: number
  label?: string
  valueText?: string
}

export function generateProgressAria({
  value,
  min = 0,
  max = 100,
  label,
  valueText
}: ProgressAriaProps) {
  return {
    role: 'progressbar',
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': value,
    'aria-valuetext': valueText,
    'aria-label': label
  }
}

/**
 * Generate ARIA attributes for status/alert components
 */
export interface StatusAriaProps {
  live?: AriaLive
  atomic?: boolean
  role?: 'status' | 'alert' | 'log'
}

export function generateStatusAria({
  live = 'polite',
  atomic = true,
  role = 'status'
}: StatusAriaProps) {
  return {
    role,
    'aria-live': live,
    'aria-atomic': atomic ? 'true' : 'false'
  }
}

/**
 * Utility to clean undefined ARIA attributes from objects
 */
export function cleanAriaProps<T extends Record<string, any>>(props: T): T {
  const cleaned = {} as T
  
  Object.entries(props).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      cleaned[key as keyof T] = value
    }
  })
  
  return cleaned
}

/**
 * Validate ARIA attribute values
 */
export function validateAriaProps(props: Record<string, any>): string[] {
  const errors: string[] = []
  
  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith('aria-')) {
      // Check for boolean attributes that should be strings
      if (['aria-expanded', 'aria-pressed', 'aria-selected', 'aria-checked', 'aria-hidden'].includes(key)) {
        if (typeof value === 'boolean') {
          errors.push(`${key} should be a string ("true" or "false"), not a boolean`)
        }
      }
      
      // Check for numeric attributes
      if (['aria-level', 'aria-setsize', 'aria-posinset', 'aria-rowindex', 'aria-colindex'].includes(key)) {
        if (typeof value !== 'number' && typeof value !== 'string') {
          errors.push(`${key} should be a number or string`)
        }
      }
    }
  })
  
  return errors
}