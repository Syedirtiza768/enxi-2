/**
 * TDD Test Suite for Line Item Editor Component
 * Critical complex component handling quotation lines with nested line items
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LineItemEditor } from '@/components/quotations/line-item-editor'

// Mock the inventory items API
global.fetch = jest.fn()

const mockInventoryItems = [
  {
    id: 'item1',
    code: 'ITM-001',
    name: 'Software Development',
    type: 'SERVICE',
    listPrice: 100,
    category: { name: 'Services' }
  },
  {
    id: 'item2', 
    code: 'ITM-002',
    name: 'Hardware Setup',
    type: 'INVENTORY',
    listPrice: 250,
    category: { name: 'Hardware' }
  }
]

const mockQuotationLine = {
  id: 'line1',
  description: 'Development Services Package',
  total: 5000,
  lineItems: [
    {
      id: 'lineitem1',
      type: 'SERVICE' as const,
      description: 'Frontend Development',
      quantity: 40,
      unitPrice: 100,
      total: 4000,
      inventoryItemId: 'item1'
    },
    {
      id: 'lineitem2', 
      type: 'SERVICE' as const,
      description: 'Backend Development',
      quantity: 10,
      unitPrice: 100,
      total: 1000,
      inventoryItemId: 'item1'
    }
  ]
}

describe('Line Item Editor Component - TDD Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockInventoryItems })
    })
  })

  describe('🔴 RED: Component Structure Tests', () => {
    it('should render line item editor with basic structure', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[]}
          onChange={mockOnChange}
        />
      )
      
      expect(screen.getByText('Quotation Lines')).toBeInTheDocument()
      expect(screen.getByText('Add Line')).toBeInTheDocument()
      expect(screen.getByText('Client View')).toBeInTheDocument()
      expect(screen.getByText('Internal View')).toBeInTheDocument()
    })

    it('should display existing quotation lines', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      expect(screen.getByText('Development Services Package')).toBeInTheDocument()
      expect(screen.getByText('$5,000.00')).toBeInTheDocument()
    })

    it('should show dual view toggle buttons', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[]}
          onChange={mockOnChange}
        />
      )
      
      const clientViewBtn = screen.getByRole('button', { name: /client view/i })
      const internalViewBtn = screen.getByRole('button', { name: /internal view/i })
      
      expect(clientViewBtn).toBeInTheDocument()
      expect(internalViewBtn).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Line Management Tests', () => {
    it('should add new empty quotation line', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[]}
          onChange={mockOnChange}
        />
      )
      
      const addLineBtn = screen.getByText('Add Line')
      fireEvent.click(addLineBtn)
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          id: expect.any(String),
          description: '',
          total: 0,
          lineItems: []
        })
      ])
    })

    it('should delete quotation line', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      const deleteBtn = screen.getByLabelText('Delete line')
      fireEvent.click(deleteBtn)
      
      expect(mockOnChange).toHaveBeenCalledWith([])
    })

    it('should update line description', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      const descInput = screen.getByDisplayValue('Development Services Package')
      fireEvent.change(descInput, { target: { value: 'Updated Description' } })
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          ...mockQuotationLine,
          description: 'Updated Description'
        })
      ])
    })
  })

  describe('🔴 RED: Line Items Management Tests', () => {
    it('should expand line to show line items', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      const expandBtn = screen.getByLabelText('Expand line items')
      fireEvent.click(expandBtn)
      
      expect(screen.getByText('Frontend Development')).toBeInTheDocument()
      expect(screen.getByText('Backend Development')).toBeInTheDocument()
      expect(screen.getByText('40')).toBeInTheDocument() // quantity
      expect(screen.getByText('$100.00')).toBeInTheDocument() // unit price
    })

    it('should add new line item to a quotation line', async () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      // Expand line first
      const expandBtn = screen.getByLabelText('Expand line items')
      fireEvent.click(expandBtn)
      
      // Add new line item
      const addItemBtn = screen.getByText('Add Item')
      fireEvent.click(addItemBtn)
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([
          expect.objectContaining({
            ...mockQuotationLine,
            lineItems: [
              ...mockQuotationLine.lineItems,
              expect.objectContaining({
                id: expect.any(String),
                type: 'INVENTORY',
                description: '',
                quantity: 1,
                unitPrice: 0,
                total: 0
              })
            ]
          })
        ])
      })
    })

    it('should update line item quantity and recalculate totals', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      // Expand line first
      const expandBtn = screen.getByLabelText('Expand line items')
      fireEvent.click(expandBtn)
      
      // Update quantity
      const quantityInput = screen.getAllByDisplayValue('40')[0] // First occurrence
      fireEvent.change(quantityInput, { target: { value: '50' } })
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          lineItems: expect.arrayContaining([
            expect.objectContaining({
              quantity: 50,
              total: 5000 // 50 * 100
            })
          ])
        })
      ])
    })

    it('should delete line item from quotation line', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      // Expand line first
      const expandBtn = screen.getByLabelText('Expand line items')
      fireEvent.click(expandBtn)
      
      // Delete first line item
      const deleteItemBtns = screen.getAllByLabelText('Delete line item')
      fireEvent.click(deleteItemBtns[0])
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          lineItems: [mockQuotationLine.lineItems[1]] // Only second item remains
        })
      ])
    })
  })

  describe('🔴 RED: Inventory Integration Tests', () => {
    it('should load inventory items for selection', async () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/inventory/items', {
          credentials: 'include'
        })
      })
    })

    it('should populate line item details when inventory item selected', async () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[{...mockQuotationLine, lineItems: []}]}
          onChange={mockOnChange}
        />
      )
      
      // Wait for component to load inventory items
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      
      // Expand line and add item
      const expandBtn = screen.getByLabelText('Expand line items')
      fireEvent.click(expandBtn)
      
      const addItemBtn = screen.getByText('Add Item')
      fireEvent.click(addItemBtn)
      
      // Wait for line item to be added
      await waitFor(() => {
        const itemSelect = screen.getByLabelText('Select inventory item')
        fireEvent.change(itemSelect, { target: { value: 'item1' } })
      })
      
      // Check that onChange was called with updated line items
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          lineItems: expect.arrayContaining([
            expect.objectContaining({
              description: 'Software Development',
              unitPrice: 100,
              inventoryItemId: 'item1'
            })
          ])
        })
      ])
    })
  })

  describe('🔴 RED: View Toggle Tests', () => {
    it('should switch between client and internal views', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      // Should start in client view - only shows descriptions
      expect(screen.getByText('Development Services Package')).toBeInTheDocument()
      
      // Switch to internal view
      const internalViewBtn = screen.getByText('Internal View')
      fireEvent.click(internalViewBtn)
      
      // Should show line items breakdown
      expect(screen.getByText('Frontend Development')).toBeInTheDocument()
      expect(screen.getByText('Backend Development')).toBeInTheDocument()
    })

    it('should show different information in each view', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      // Client view: Only line descriptions and totals
      expect(screen.getByText('Development Services Package')).toBeInTheDocument()
      expect(screen.getByText('$5,000.00')).toBeInTheDocument()
      expect(screen.queryByText('Frontend Development')).not.toBeInTheDocument()
      
      // Switch to internal view
      const internalViewBtn = screen.getByText('Internal View')
      fireEvent.click(internalViewBtn)
      
      // Internal view: Shows line item details
      expect(screen.getByText('Frontend Development')).toBeInTheDocument()
      expect(screen.getByText('40')).toBeInTheDocument() // quantity
    })
  })

  describe('🔴 RED: Calculation Tests', () => {
    it('should calculate line totals from line items', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      // Total should be sum of line items: 4000 + 1000 = 5000
      expect(screen.getByText('$5,000.00')).toBeInTheDocument()
    })

    it('should recalculate totals when line items change', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      // Expand and modify quantity
      const expandBtn = screen.getByLabelText('Expand line items')
      fireEvent.click(expandBtn)
      
      const quantityInput = screen.getAllByDisplayValue('40')[0]
      fireEvent.change(quantityInput, { target: { value: '60' } })
      
      // Should recalculate: (60 * 100) + 1000 = 7000
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          total: 7000,
          lineItems: expect.arrayContaining([
            expect.objectContaining({
              quantity: 60,
              total: 6000
            })
          ])
        })
      ])
    })

    it('should handle empty line items gracefully', () => {
      const mockOnChange = jest.fn()
      const emptyLine = { ...mockQuotationLine, lineItems: [] }
      
      render(
        <LineItemEditor 
          quotationLines={[emptyLine]}
          onChange={mockOnChange}
        />
      )
      
      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Error Handling Tests', () => {
    it('should handle API errors when loading inventory items', async () => {
      const mockOnChange = jest.fn()
      
      // Mock API failure before rendering
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
      
      render(
        <LineItemEditor 
          quotationLines={[]}
          onChange={mockOnChange}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load inventory items/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should validate required fields before saving', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[{...mockQuotationLine, description: ''}]}
          onChange={mockOnChange}
        />
      )
      
      // Should show validation error for empty description
      expect(screen.getByText(/line description is required/i)).toBeInTheDocument()
    })

    it('should prevent negative quantities and prices', () => {
      const mockOnChange = jest.fn()
      
      render(
        <LineItemEditor 
          quotationLines={[mockQuotationLine]}
          onChange={mockOnChange}
        />
      )
      
      const expandBtn = screen.getByLabelText('Expand line items')
      fireEvent.click(expandBtn)
      
      const quantityInput = screen.getAllByDisplayValue('40')[0]
      fireEvent.change(quantityInput, { target: { value: '-5' } })
      
      // Should not allow negative values
      expect(mockOnChange).not.toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            lineItems: expect.arrayContaining([
              expect.objectContaining({ quantity: -5 })
            ])
          })
        ])
      )
    })
  })
})