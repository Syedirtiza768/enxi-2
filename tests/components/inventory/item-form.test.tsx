import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemForm } from '@/components/inventory/item-form'
import { createMockItem, createMockCategory } from '../../helpers/render-utils'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('ItemForm', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()
  
  const mockCategories = [
    createMockCategory({ id: 'cat-1', name: 'Electronics', code: 'ELEC' }),
    createMockCategory({ id: 'cat-2', name: 'Office Supplies', code: 'OFFICE' })
  ]
  
  const mockUnits = [
    { id: 'uom-1', code: 'PCS', name: 'Pieces', symbol: 'pcs' },
    { id: 'uom-2', code: 'KG', name: 'Kilogram', symbol: 'kg' }
  ]
  
  const mockGLAccounts = [
    { id: 'acc-1', code: '1130', name: 'Inventory Asset', type: 'ASSET' },
    { id: 'acc-2', code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE' },
    { id: 'acc-3', code: '4100', name: 'Sales Revenue', type: 'INCOME' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/inventory/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockCategories })
        })
      }
      if (url.includes('/api/inventory/units-of-measure')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockUnits })
        })
      }
      if (url.includes('/api/accounting/accounts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockGLAccounts })
        })
      }
      if (url.includes('/api/inventory/items/generate-code')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ code: 'ELEC-001' })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  describe('Create Mode', () => {
    it('should render empty form for creating new item', async () => {
      render(
        <ItemForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByLabelText('Item Code *')).toHaveValue('')
      expect(screen.getByLabelText('Item Name *')).toHaveValue('')
      expect(screen.getByLabelText('Description')).toHaveValue('')
      expect(screen.getByRole('button', { name: 'Create Item' })).toBeInTheDocument()
      
      // Wait for async data to load
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument()
      })
    })

    it('should auto-generate item code based on category', async () => {
      const user = userEvent.setup()
      
      render(
        <ItemForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Wait for categories to load
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument()
      })

      // Select category
      await user.selectOptions(screen.getByLabelText('Category *'), 'cat-1')

      // Click generate code button
      await user.click(screen.getByText('Generate Code'))

      await waitFor(() => {
        expect(screen.getByLabelText('Item Code *')).toHaveValue('ELEC-001')
      })
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()
      
      render(
        <ItemForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Remove required attribute to bypass HTML5 validation
      const codeInput = screen.getByLabelText('Item Code *') as HTMLInputElement
      const nameInput = screen.getByLabelText('Item Name *') as HTMLInputElement
      codeInput.removeAttribute('required')
      nameInput.removeAttribute('required')

      const submitButton = screen.getByRole('button', { name: 'Create Item' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Item code is required')).toBeInTheDocument()
        expect(screen.getByText('Item name is required')).toBeInTheDocument()
        expect(screen.getByText('Category is required')).toBeInTheDocument()
        expect(screen.getByText('Unit of measure is required')).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should validate numeric fields', async () => {
      const user = userEvent.setup()
      
      render(
        <ItemForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Fill required fields to get past that validation
      await user.type(screen.getByLabelText('Item Code *'), 'TEST-001')
      await user.type(screen.getByLabelText('Item Name *'), 'Test Item')
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument()
      })
      
      await user.selectOptions(screen.getByLabelText('Category *'), 'cat-1')
      await user.selectOptions(screen.getByLabelText('Unit of Measure *'), 'uom-1')

      // Enter negative values
      await user.clear(screen.getByLabelText('Min Stock Level'))
      await user.type(screen.getByLabelText('Min Stock Level'), '-5')
      await user.clear(screen.getByLabelText('List Price'))
      await user.type(screen.getByLabelText('List Price'), '-100')

      const submitButton = screen.getByRole('button', { name: 'Create Item' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Min stock level must be non-negative')).toBeInTheDocument()
        expect(screen.getByText('List price must be non-negative')).toBeInTheDocument()
      })
    })

    it('should show/hide inventory fields based on type', async () => {
      const user = userEvent.setup()
      
      render(
        <ItemForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Initially should show inventory fields for PRODUCT
      expect(screen.getByLabelText('Track Inventory')).toBeInTheDocument()
      expect(screen.getByLabelText('Min Stock Level')).toBeInTheDocument()

      // Change to SERVICE
      await user.selectOptions(screen.getByLabelText('Type *'), 'SERVICE')

      // Inventory tracking should be hidden or disabled
      const trackInventory = screen.getByLabelText('Track Inventory') as HTMLInputElement
      expect(trackInventory.checked).toBe(false)
    })
  })

  describe('Edit Mode', () => {
    const existingItem = createMockItem({
      id: 'item-1',
      code: 'ELEC-001',
      name: 'Laptop Computer',
      description: 'High-performance laptop',
      categoryId: 'cat-1',
      unitOfMeasureId: 'uom-1',
      type: 'PRODUCT',
      minStockLevel: 5,
      reorderPoint: 10,
      standardCost: 800,
      listPrice: 1200
    })

    it('should populate form with existing item data', async () => {
      render(
        <ItemForm
          mode="edit"
          item={existingItem}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByLabelText('Item Code *')).toHaveValue('ELEC-001')
      expect(screen.getByLabelText('Item Name *')).toHaveValue('Laptop Computer')
      expect(screen.getByLabelText('Description')).toHaveValue('High-performance laptop')
      expect(screen.getByLabelText('Min Stock Level')).toHaveValue(5)
      expect(screen.getByLabelText('Reorder Point')).toHaveValue(10)
      expect(screen.getByLabelText('Standard Cost')).toHaveValue(800)
      expect(screen.getByLabelText('List Price')).toHaveValue(1200)
      expect(screen.getByRole('button', { name: 'Update Item' })).toBeInTheDocument()
    })

    it('should not allow changing code in edit mode', () => {
      render(
        <ItemForm
          mode="edit"
          item={existingItem}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const codeInput = screen.getByLabelText('Item Code *') as HTMLInputElement
      expect(codeInput.disabled).toBe(true)
    })
  })

  describe('GL Account Integration', () => {
    it('should filter GL accounts by type', async () => {
      render(
        <ItemForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      await waitFor(() => {
        // Inventory account should only show ASSET accounts
        const inventorySelect = screen.getByLabelText('Inventory Account')
        expect(inventorySelect).toBeInTheDocument()
        
        // COGS account should only show EXPENSE accounts
        const cogsSelect = screen.getByLabelText('COGS Account')
        expect(cogsSelect).toBeInTheDocument()
        
        // Sales account should only show INCOME accounts
        const salesSelect = screen.getByLabelText('Sales Account')
        expect(salesSelect).toBeInTheDocument()
      })
    })
  })

  describe('Form Actions', () => {
    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ItemForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should submit form with all data', async () => {
      const user = userEvent.setup()
      
      render(
        <ItemForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument()
      })

      // Fill form
      await user.type(screen.getByLabelText('Item Code *'), 'TEST-001')
      await user.type(screen.getByLabelText('Item Name *'), 'Test Item')
      await user.type(screen.getByLabelText('Description'), 'Test description')
      await user.selectOptions(screen.getByLabelText('Category *'), 'cat-1')
      await user.selectOptions(screen.getByLabelText('Unit of Measure *'), 'uom-1')
      await user.type(screen.getByLabelText('Min Stock Level'), '10')
      await user.type(screen.getByLabelText('Reorder Point'), '20')
      await user.type(screen.getByLabelText('Standard Cost'), '50')
      await user.type(screen.getByLabelText('List Price'), '75')

      const submitButton = screen.getByRole('button', { name: 'Create Item' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'TEST-001',
            name: 'Test Item',
            description: 'Test description',
            categoryId: 'cat-1',
            unitOfMeasureId: 'uom-1',
            minStockLevel: 10,
            reorderPoint: 20,
            standardCost: 50,
            listPrice: 75
          })
        )
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      let resolveSubmit: (value: any) => void
      const mockSlowSubmit = jest.fn(() => new Promise(resolve => { resolveSubmit = resolve }))
      
      render(
        <ItemForm
          mode="create"
          onSubmit={mockSlowSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Wait for data and fill required fields
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText('Item Code *'), 'TEST-001')
      await user.type(screen.getByLabelText('Item Name *'), 'Test')
      await user.selectOptions(screen.getByLabelText('Category *'), 'cat-1')
      await user.selectOptions(screen.getByLabelText('Unit of Measure *'), 'uom-1')

      const submitButton = screen.getByRole('button', { name: 'Create Item' })
      await user.click(submitButton)

      expect(screen.getByText('Creating...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Resolve the promise
      resolveSubmit!({})
      
      await waitFor(() => {
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Item Type Specific Features', () => {
    it('should disable inventory tracking for services', async () => {
      const user = userEvent.setup()
      
      render(
        <ItemForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      await user.selectOptions(screen.getByLabelText('Type *'), 'SERVICE')

      const trackInventory = screen.getByLabelText('Track Inventory') as HTMLInputElement
      expect(trackInventory.checked).toBe(false)
      
      // Stock fields should be disabled
      const minStock = screen.getByLabelText('Min Stock Level') as HTMLInputElement
      expect(minStock.disabled).toBe(true)
    })

    it('should show sales/purchase flags', () => {
      render(
        <ItemForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByLabelText('Can be Sold')).toBeInTheDocument()
      expect(screen.getByLabelText('Can be Purchased')).toBeInTheDocument()
    })
  })
})