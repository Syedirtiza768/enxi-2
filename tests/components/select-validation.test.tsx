import { render, screen } from '@testing-library/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { validateSelectOptions, createSelectOption, COMMON_SELECT_OPTIONS } from '@/lib/types/ui.types'

// Mock test component with Select
function TestSelect({ options }: { options: Array<{ value: string; label: string }> }) {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

describe('Select Component Validation', () => {
  describe('validateSelectOptions', () => {
    it('should accept valid options with non-empty values', () => {
      const validOptions = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
      ]
      
      expect(() => validateSelectOptions(validOptions)).not.toThrow()
      expect(validateSelectOptions(validOptions)).toEqual(validOptions)
    })

    it('should reject options with empty string values', () => {
      const invalidOptions = [
        { value: '', label: 'Empty Value' },
        { value: 'valid', label: 'Valid Option' },
      ]
      
      expect(() => validateSelectOptions(invalidOptions)).toThrow(
        'Found 1 invalid select options. All options must have non-empty string values.'
      )
    })

    it('should reject options without value property', () => {
      const invalidOptions = [
        { label: 'No Value Property' },
        { value: 'valid', label: 'Valid Option' },
      ]
      
      expect(() => validateSelectOptions(invalidOptions)).toThrow()
    })

    it('should reject options with null or undefined values', () => {
      const invalidOptions = [
        { value: null, label: 'Null Value' },
        { value: undefined, label: 'Undefined Value' },
        { value: 'valid', label: 'Valid Option' },
      ]
      
      expect(() => validateSelectOptions(invalidOptions)).toThrow()
    })
  })

  describe('createSelectOption', () => {
    it('should create valid select options', () => {
      const option = createSelectOption('test-value', 'Test Label')
      
      expect(option).toEqual({
        value: 'test-value',
        label: 'Test Label',
      })
    })

    it('should use value as label if label not provided', () => {
      const option = createSelectOption('test-value')
      
      expect(option).toEqual({
        value: 'test-value',
        label: 'test-value',
      })
    })

    it('should reject empty string values', () => {
      expect(() => createSelectOption('')).toThrow(
        'Select option value must be a non-empty string'
      )
    })

    it('should reject whitespace-only values', () => {
      expect(() => createSelectOption('   ')).toThrow(
        'Select option value must be a non-empty string'
      )
    })

    it('should trim whitespace from values', () => {
      const option = createSelectOption('  test-value  ', 'Test Label')
      
      expect(option.value).toBe('test-value')
    })
  })

  describe('COMMON_SELECT_OPTIONS', () => {
    it('should provide valid common options', () => {
      expect(COMMON_SELECT_OPTIONS.ALL).toEqual({
        value: 'ALL',
        label: 'All',
      })
      
      expect(COMMON_SELECT_OPTIONS.NONE).toEqual({
        value: 'NONE',
        label: 'None',
      })
      
      expect(COMMON_SELECT_OPTIONS.OTHER).toEqual({
        value: 'OTHER',
        label: 'Other',
      })
    })

    it('should have non-empty values for all common options', () => {
      Object.values(COMMON_SELECT_OPTIONS).forEach(option => {
        expect(option.value).toBeTruthy()
        expect(option.value.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Select Component Rendering', () => {
    it('should render without errors when all options have valid values', () => {
      const validOptions = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'ALL', label: 'All Options' },
      ]

      expect(() => {
        render(<TestSelect options={validOptions} />)
      }).not.toThrow()
    })

    it('should show placeholder text', () => {
      const validOptions = [
        { value: 'option1', label: 'Option 1' },
      ]

      render(<TestSelect options={validOptions} />)
      
      // The placeholder should be shown in the trigger
      expect(screen.getByText('Select an option')).toBeInTheDocument()
    })
  })

  describe('Select Integration with Lead Filters', () => {
    const leadStatusOptions = [
      { value: 'ALL', label: 'All Statuses' },
      { value: 'NEW', label: 'New' },
      { value: 'CONTACTED', label: 'Contacted' },
      { value: 'QUALIFIED', label: 'Qualified' },
    ]

    const leadSourceOptions = [
      { value: 'ALL', label: 'All Sources' },
      { value: 'WEBSITE', label: 'Website' },
      { value: 'REFERRAL', label: 'Referral' },
      { value: 'SOCIAL_MEDIA', label: 'Social Media' },
    ]

    it('should validate lead status filter options', () => {
      expect(() => validateSelectOptions(leadStatusOptions)).not.toThrow()
    })

    it('should validate lead source filter options', () => {
      expect(() => validateSelectOptions(leadSourceOptions)).not.toThrow()
    })

    it('should ensure no empty values in lead filter options', () => {
      leadStatusOptions.forEach(option => {
        expect(option.value).toBeTruthy()
        expect(option.value.length).toBeGreaterThan(0)
      })

      leadSourceOptions.forEach(option => {
        expect(option.value).toBeTruthy()
        expect(option.value.length).toBeGreaterThan(0)
      })
    })
  })
})