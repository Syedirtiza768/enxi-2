import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemList } from '@/components/inventory/item-list'
import { createMockItem, createMockCategory } from '../../helpers/render-utils'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('ItemList', () => {
  const mockOnItemSelect = jest.fn()
  const mockOnItemEdit = jest.fn()
  const mockOnItemDelete = jest.fn()
  
  const mockItems = [
    createMockItem({
      id: 'item-1',
      code: 'ITM-001',
      name: 'Laptop Computer',
      category: createMockCategory({ name: 'Electronics' }),
      unitOfMeasure: { code: 'PCS', name: 'Pieces' },
      stockSummary: {
        totalQuantity: 25,
        availableQuantity: 20,
        reservedQuantity: 5,
        totalValue: 25000
      },
      listPrice: 1000,
      isActive: true
    }),
    createMockItem({
      id: 'item-2',
      code: 'ITM-002',
      name: 'Wireless Mouse',
      category: createMockCategory({ name: 'Electronics' }),
      unitOfMeasure: { code: 'PCS', name: 'Pieces' },
      stockSummary: {
        totalQuantity: 5,
        availableQuantity: 5,
        reservedQuantity: 0,
        totalValue: 250
      },
      listPrice: 50,
      minStockLevel: 10,
      isActive: true
    })
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render empty state when no items', () => {
    render(
      <ItemList 
        items={[]}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    expect(screen.getByText('No items found')).toBeInTheDocument()
    expect(screen.getByText('Create your first inventory item to get started')).toBeInTheDocument()
  })

  it('should render loading state', () => {
    render(
      <ItemList 
        items={[]}
        loading={true}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    expect(screen.getByText('Loading items...')).toBeInTheDocument()
  })

  it('should render items in a table', () => {
    render(
      <ItemList 
        items={mockItems}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    // Check headers
    expect(screen.getByText('Code')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Stock')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    
    // Check item data
    expect(screen.getByText('ITM-001')).toBeInTheDocument()
    expect(screen.getByText('Laptop Computer')).toBeInTheDocument()
    expect(screen.getAllByText('Electronics')).toHaveLength(2) // Both items have same category
    expect(screen.getByText('25 PCS')).toBeInTheDocument()
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
  })

  it('should show low stock indicator', () => {
    render(
      <ItemList 
        items={mockItems}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    // Second item has stock below minimum
    const lowStockBadge = screen.getByText('Low Stock')
    expect(lowStockBadge).toBeInTheDocument()
    expect(lowStockBadge).toHaveClass('text-yellow-800', 'bg-yellow-100')
  })

  it('should show active/inactive status', () => {
    const itemsWithInactive = [
      ...mockItems,
      createMockItem({
        id: 'item-3',
        code: 'ITM-003',
        name: 'Discontinued Item',
        isActive: false,
        category: createMockCategory({ name: 'Electronics' })
      })
    ]
    
    render(
      <ItemList 
        items={itemsWithInactive}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    expect(screen.getAllByText('Active')).toHaveLength(2) // First two items are active
    expect(screen.getByText('Inactive')).toBeInTheDocument() // Third item is inactive
  })

  it('should call onItemSelect when row is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <ItemList 
        items={mockItems}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    const firstRow = screen.getByText('ITM-001').closest('tr')
    await user.click(firstRow!)
    
    expect(mockOnItemSelect).toHaveBeenCalledWith(mockItems[0])
  })

  it('should show action buttons on hover', async () => {
    render(
      <ItemList 
        items={mockItems}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    const firstRow = screen.getByText('ITM-001').closest('tr')
    fireEvent.mouseEnter(firstRow!)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Edit item')).toBeInTheDocument()
      expect(screen.getByLabelText('Delete item')).toBeInTheDocument()
    })
  })

  it('should call onItemEdit when edit button clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <ItemList 
        items={mockItems}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    const firstRow = screen.getByText('ITM-001').closest('tr')
    fireEvent.mouseEnter(firstRow!)
    
    await waitFor(async () => {
      const editButton = screen.getByLabelText('Edit item')
      await user.click(editButton)
    })
    
    expect(mockOnItemEdit).toHaveBeenCalledWith(mockItems[0])
  })

  it('should show stock availability breakdown', () => {
    render(
      <ItemList 
        items={mockItems}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
        showStockDetails={true}
      />
    )
    
    // First item has reserved quantity
    expect(screen.getByText('Available: 20')).toBeInTheDocument()
    expect(screen.getByText('Reserved: 5')).toBeInTheDocument()
  })

  it('should show item type badges', () => {
    const itemsWithTypes = [
      createMockItem({ id: 'type-1', type: 'PRODUCT', name: 'Product Item' }),
      createMockItem({ id: 'type-2', type: 'SERVICE', name: 'Service Item' }),
      createMockItem({ id: 'type-3', type: 'RAW_MATERIAL', name: 'Material Item' })
    ]
    
    render(
      <ItemList 
        items={itemsWithTypes}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Service')).toBeInTheDocument()
    expect(screen.getByText('Raw Material')).toBeInTheDocument()
  })

  it('should format currency values correctly', () => {
    render(
      <ItemList 
        items={mockItems}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
  })

  it('should handle items without stock for services', () => {
    const serviceItem = createMockItem({
      type: 'SERVICE',
      name: 'Consulting Service',
      trackInventory: false,
      stockSummary: null
    })
    
    render(
      <ItemList 
        items={[serviceItem]}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    expect(screen.getByText('N/A')).toBeInTheDocument() // Stock column shows N/A
  })

  it('should show confirmation before deleting', async () => {
    const user = userEvent.setup()
    
    render(
      <ItemList 
        items={mockItems}
        loading={false}
        onItemSelect={mockOnItemSelect}
        onItemEdit={mockOnItemEdit}
        onItemDelete={mockOnItemDelete}
      />
    )
    
    const firstRow = screen.getByText('ITM-001').closest('tr')
    fireEvent.mouseEnter(firstRow!)
    
    await waitFor(async () => {
      const deleteButton = screen.getByLabelText('Delete item')
      await user.click(deleteButton)
    })
    
    expect(screen.getByText('Delete Item')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete "Laptop Computer"?')).toBeInTheDocument()
  })
})