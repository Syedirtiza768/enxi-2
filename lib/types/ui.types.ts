/**
 * UI Component Types
 * 
 * Defines strict types for UI components to prevent common errors
 */

/**
 * Select Option Interface
 * Enforces non-empty string values for all select options
 */
export interface SelectOption {
  /** Must be a non-empty string - no empty strings, null, or undefined allowed */
  value: string
  /** Display label for the option */
  label: string
  /** Optional disabled state */
  disabled?: boolean
}

/**
 * Type guard to validate SelectOption arrays
 */
export function isValidSelectOption(option: unknown): option is SelectOption {
  return (
    typeof option === 'object' &&
    option !== null &&
    typeof option.value === 'string' &&
    option.value.length > 0 &&
    typeof option.label === 'string'
  )
}

/**
 * Validates an array of select options
 */
export function validateSelectOptions(options: unknown[]): SelectOption[] {
  const validOptions = options.filter(isValidSelectOption)
  
  if (validOptions.length !== options.length) {
    const invalidOptions = options.filter(opt => !isValidSelectOption(opt))
    console.warn('Invalid select options found:', invalidOptions)
    throw new Error(`Found ${invalidOptions.length} invalid select options. All options must have non-empty string values.`)
  }
  
  return validOptions
}

/**
 * Safe Select Option builder
 */
export function createSelectOption(value: string, label?: string): SelectOption {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Select option value must be a non-empty string')
  }
  
  return {
    value: value.trim(),
    label: label || value,
  }
}

/**
 * Predefined common select options
 */
export const COMMON_SELECT_OPTIONS = {
  ALL: createSelectOption('ALL', 'All'),
  NONE: createSelectOption('NONE', 'None'),
  OTHER: createSelectOption('OTHER', 'Other'),
} as const