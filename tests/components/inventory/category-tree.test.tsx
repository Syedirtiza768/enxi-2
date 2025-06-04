import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMockCategory } from '../../helpers/render-utils'
import { CategoryTree } from '@/components/inventory/category-tree'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('CategoryTree', () => {
  const mockOnCategoryUpdate = jest.fn()
  const mockOnCategoryCreate = jest.fn()
  const mockOnCategoryDelete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render empty state when no categories', () => {
    render(
      <CategoryTree 
        categories={[]} 
        onCategoryUpdate={mockOnCategoryUpdate}
        onCategoryCreate={mockOnCategoryCreate}
        onCategoryDelete={mockOnCategoryDelete}
      />
    )
    
    expect(screen.getByText('No categories found')).toBeInTheDocument()
    expect(screen.getByText('Create your first category to organize inventory items')).toBeInTheDocument()
  })

  it('should render category hierarchy', () => {
    const categories = [
      createMockCategory({ 
        id: 'cat-1', 
        name: 'Electronics', 
        parentId: null,
        children: [
          createMockCategory({ 
            id: 'cat-2', 
            name: 'Computers', 
            parentId: 'cat-1',
            children: []
          })
        ]
      })
    ]

    render(
      <CategoryTree 
        categories={categories}
        onCategoryUpdate={mockOnCategoryUpdate}
        onCategoryCreate={mockOnCategoryCreate}
        onCategoryDelete={mockOnCategoryDelete}
      />
    )
    
    expect(screen.getByText('Electronics')).toBeInTheDocument()
    expect(screen.getByText('Computers')).toBeInTheDocument()
  })

  it('should show expand/collapse for categories with children', () => {
    const categories = [
      createMockCategory({ 
        id: 'cat-1', 
        name: 'Electronics', 
        children: [
          createMockCategory({ id: 'cat-2', name: 'Computers', children: [] })
        ]
      })
    ]

    render(
      <CategoryTree 
        categories={categories}
        onCategoryUpdate={mockOnCategoryUpdate}
        onCategoryCreate={mockOnCategoryCreate}
        onCategoryDelete={mockOnCategoryDelete}
      />
    )
    
    // Component starts expanded, so should show collapse button
    const collapseButton = screen.getByLabelText('Collapse Electronics')
    expect(collapseButton).toBeInTheDocument()
  })

  it('should expand and collapse categories', async () => {
    const categories = [
      createMockCategory({ 
        id: 'cat-1', 
        name: 'Electronics', 
        children: [
          createMockCategory({ id: 'cat-2', name: 'Computers', children: [] })
        ]
      })
    ]

    render(
      <CategoryTree 
        categories={categories}
        onCategoryUpdate={mockOnCategoryUpdate}
        onCategoryCreate={mockOnCategoryCreate}
        onCategoryDelete={mockOnCategoryDelete}
      />
    )
    
    // Initially, children should be visible
    expect(screen.getByText('Computers')).toBeInTheDocument()
    
    // Click collapse
    const collapseButton = screen.getByLabelText('Collapse Electronics')
    fireEvent.click(collapseButton)
    
    // Children should be hidden
    expect(screen.queryByText('Computers')).not.toBeInTheDocument()
    
    // Click expand again
    const expandButton = screen.getByLabelText('Expand Electronics')
    fireEvent.click(expandButton)
    
    // Children should be visible again
    expect(screen.getByText('Computers')).toBeInTheDocument()
  })

  it('should show category actions on hover', async () => {
    const categories = [
      createMockCategory({ id: 'cat-1', name: 'Electronics' })
    ]

    render(
      <CategoryTree 
        categories={categories}
        onCategoryUpdate={mockOnCategoryUpdate}
        onCategoryCreate={mockOnCategoryCreate}
        onCategoryDelete={mockOnCategoryDelete}
      />
    )
    
    const categoryRow = screen.getByText('Electronics').closest('[data-testid="category-row"]')
    expect(categoryRow).toBeInTheDocument()
    
    // Hover over category
    fireEvent.mouseEnter(categoryRow!)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Edit category')).toBeInTheDocument()
      expect(screen.getByLabelText('Add subcategory')).toBeInTheDocument()
      expect(screen.getByLabelText('Delete category')).toBeInTheDocument()
    })
  })

  it('should call onCategoryCreate when add subcategory clicked', async () => {
    const categories = [
      createMockCategory({ id: 'cat-1', name: 'Electronics' })
    ]

    render(
      <CategoryTree 
        categories={categories}
        onCategoryUpdate={mockOnCategoryUpdate}
        onCategoryCreate={mockOnCategoryCreate}
        onCategoryDelete={mockOnCategoryDelete}
      />
    )
    
    const categoryRow = screen.getByText('Electronics').closest('[data-testid="category-row"]')
    fireEvent.mouseEnter(categoryRow!)
    
    await waitFor(() => {
      const addButton = screen.getByLabelText('Add subcategory')
      fireEvent.click(addButton)
    })
    
    expect(mockOnCategoryCreate).toHaveBeenCalledWith('cat-1')
  })

  it('should show confirmation dialog before deleting category', async () => {
    const categories = [
      createMockCategory({ id: 'cat-1', name: 'Electronics' })
    ]

    render(
      <CategoryTree 
        categories={categories}
        onCategoryUpdate={mockOnCategoryUpdate}
        onCategoryCreate={mockOnCategoryCreate}
        onCategoryDelete={mockOnCategoryDelete}
      />
    )
    
    const categoryRow = screen.getByText('Electronics').closest('[data-testid="category-row"]')
    fireEvent.mouseEnter(categoryRow!)
    
    await waitFor(() => {
      const deleteButton = screen.getByLabelText('Delete category')
      fireEvent.click(deleteButton)
    })
    
    expect(screen.getByText('Delete Category')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete "Electronics"?')).toBeInTheDocument()
  })

  it('should prevent deleting category with children', async () => {
    const categories = [
      createMockCategory({ 
        id: 'cat-1', 
        name: 'Electronics',
        children: [
          createMockCategory({ id: 'cat-2', name: 'Computers', children: [] })
        ]
      })
    ]

    render(
      <CategoryTree 
        categories={categories}
        onCategoryUpdate={mockOnCategoryUpdate}
        onCategoryCreate={mockOnCategoryCreate}
        onCategoryDelete={mockOnCategoryDelete}
      />
    )
    
    const categoryRow = screen.getByText('Electronics').closest('[data-testid="category-row"]')
    fireEvent.mouseEnter(categoryRow!)
    
    await waitFor(() => {
      const deleteButton = screen.getByLabelText('Delete category')
      fireEvent.click(deleteButton)
    })
    
    expect(screen.getByText('Cannot delete category with subcategories')).toBeInTheDocument()
  })

  it('should display GL account assignments', () => {
    const categories = [
      createMockCategory({ 
        id: 'cat-1', 
        name: 'Electronics',
        glAccounts: {
          inventoryAccount: '1130',
          cogsAccount: '5100',
          varianceAccount: '5150'
        }
      })
    ]

    render(
      <CategoryTree 
        categories={categories}
        onCategoryUpdate={mockOnCategoryUpdate}
        onCategoryCreate={mockOnCategoryCreate}
        onCategoryDelete={mockOnCategoryDelete}
        showGLAccounts={true}
      />
    )
    
    expect(screen.getByText('1130')).toBeInTheDocument() // Inventory account
    expect(screen.getByText('5100')).toBeInTheDocument() // COGS account
  })

  it('should allow inline editing of category name', async () => {
    const categories = [
      createMockCategory({ id: 'cat-1', name: 'Electronics' })
    ]

    render(
      <CategoryTree 
        categories={categories}
        onCategoryUpdate={mockOnCategoryUpdate}
        onCategoryCreate={mockOnCategoryCreate}
        onCategoryDelete={mockOnCategoryDelete}
      />
    )
    
    // Double click to edit
    const categoryName = screen.getByText('Electronics')
    fireEvent.doubleClick(categoryName)
    
    // Should show input field
    const input = screen.getByDisplayValue('Electronics')
    expect(input).toBeInTheDocument()
    
    // Change name and submit
    fireEvent.change(input, { target: { value: 'Consumer Electronics' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    
    await waitFor(() => {
      expect(mockOnCategoryUpdate).toHaveBeenCalledWith('cat-1', {
        name: 'Consumer Electronics'
      })
    })
  })

  it('should cancel inline editing on Escape', async () => {
    const categories = [
      createMockCategory({ id: 'cat-1', name: 'Electronics' })
    ]

    render(
      <CategoryTree 
        categories={categories}
        onCategoryUpdate={mockOnCategoryUpdate}
        onCategoryCreate={mockOnCategoryCreate}
        onCategoryDelete={mockOnCategoryDelete}
      />
    )
    
    // Double click to edit
    const categoryName = screen.getByText('Electronics')
    fireEvent.doubleClick(categoryName)
    
    const input = screen.getByDisplayValue('Electronics')
    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    
    // Should show original name
    expect(screen.getByText('Electronics')).toBeInTheDocument()
    expect(mockOnCategoryUpdate).not.toHaveBeenCalled()
  })
})