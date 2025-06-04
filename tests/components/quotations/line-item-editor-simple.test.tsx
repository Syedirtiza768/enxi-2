/**
 * Simple verification test for Line Item Editor - basic display
 */

import { render, screen } from '@testing-library/react'
import { LineItemEditor } from '@/components/quotations/line-item-editor'

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: [] })
})

const mockQuotationLine = {
  id: 'line1',
  description: 'Development Services Package',
  total: 5000,
  lineItems: []
}

describe('Line Item Editor - Simple Display Test', () => {
  it('🟢 should display quotation line description', () => {
    const mockOnChange = jest.fn()
    
    render(
      <LineItemEditor 
        quotationLines={[mockQuotationLine]}
        onChange={mockOnChange}
      />
    )
    
    // Should find the line description in the input field
    expect(screen.getByDisplayValue('Development Services Package')).toBeInTheDocument()
    expect(screen.getByText('$5,000.00')).toBeInTheDocument()
  })

  it('🟢 should show empty state when no lines', () => {
    const mockOnChange = jest.fn()
    
    render(
      <LineItemEditor 
        quotationLines={[]}
        onChange={mockOnChange}
      />
    )
    
    expect(screen.getByText('No quotation lines')).toBeInTheDocument()
    expect(screen.getByText('Add First Line')).toBeInTheDocument()
  })
})