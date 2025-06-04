import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMockCategory } from '../../helpers/render-utils'
import { CategoryForm } from '@/components/inventory/category-form'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('CategoryForm', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()
  
  const mockAccounts = [
    { id: '1130', code: '1130', name: 'Inventory Asset' },
    { id: '5100', code: '5100', name: 'Cost of Goods Sold' },
    { id: '5150', code: '5150', name: 'Inventory Variance' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockAccounts })
    })
  })

  describe('Create Mode', () => {
    it('should render empty form for creating new category', () => {
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      expect(screen.getByLabelText('Category Name *')).toHaveValue('')
      expect(screen.getByLabelText('Category Code *')).toHaveValue('')
      expect(screen.getByLabelText('Description')).toHaveValue('')
      expect(screen.getByRole('button', { name: 'Create Category' })).toBeInTheDocument()
    })

    it('should auto-generate category code from name', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      const nameInput = screen.getByLabelText('Category Name *')
      await user.type(nameInput, 'Consumer Electronics')

      // Should auto-generate code
      await waitFor(() => {
        expect(screen.getByLabelText('Category Code *')).toHaveValue('CONSUMER_ELECTRONICS')
      })
    })

    it('should allow manual code override', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      const codeInput = screen.getByLabelText('Category Code *')
      await user.type(codeInput, 'CUSTOM_CODE')

      expect(codeInput).toHaveValue('CUSTOM_CODE')
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Category name is required')).toBeInTheDocument()
        expect(screen.getByText('Category code is required')).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should validate code uniqueness', async () => {
      const user = userEvent.setup()
      const existingCategories = [
        createMockCategory({ code: 'EXISTING' })
      ]
      
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={existingCategories}
        />
      )

      await user.type(screen.getByLabelText('Category Name *'), 'Test Category')
      await user.clear(screen.getByLabelText('Category Code *'))
      await user.type(screen.getByLabelText('Category Code *'), 'EXISTING')

      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Category code already exists')).toBeInTheDocument()
      })
    })

    it('should show parent category selector when parentId provided', () => {
      const categories = [
        createMockCategory({ id: 'parent-1', name: 'Electronics' })
      ]
      
      render(
        <CategoryForm
          mode="create"
          parentId="parent-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={categories}
        />
      )

      expect(screen.getByText('Parent Category: Electronics')).toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    const existingCategory = createMockCategory({
      id: 'cat-1',
      name: 'Electronics',
      code: 'ELEC',
      description: 'Electronic devices',
      glAccounts: {
        inventoryAccount: '1130',
        cogsAccount: '5100',
        varianceAccount: '5150'
      }
    })

    it('should populate form with existing category data', () => {
      render(
        <CategoryForm
          mode="edit"
          category={existingCategory}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      expect(screen.getByLabelText('Category Name *')).toHaveValue('Electronics')
      expect(screen.getByLabelText('Category Code *')).toHaveValue('ELEC')
      expect(screen.getByLabelText('Description')).toHaveValue('Electronic devices')
      expect(screen.getByRole('button', { name: 'Update Category' })).toBeInTheDocument()
    })

    it('should not validate code uniqueness against itself', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryForm
          mode="edit"
          category={existingCategory}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[existingCategory]}
        />
      )

      const submitButton = screen.getByRole('button', { name: 'Update Category' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('GL Account Integration', () => {
    it('should load and display GL accounts', async () => {
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Inventory Asset (1130)')).toBeInTheDocument()
        expect(screen.getByText('Cost of Goods Sold (5100)')).toBeInTheDocument()
      })
    })

    it('should validate GL account assignments', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      await user.type(screen.getByLabelText('Category Name *'), 'Test Category')
      
      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Inventory account is required')).toBeInTheDocument()
        expect(screen.getByText('COGS account is required')).toBeInTheDocument()
      })
    })

    it('should submit form with all data', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      // Fill form
      await user.type(screen.getByLabelText('Category Name *'), 'New Category')
      await user.type(screen.getByLabelText('Description'), 'Test description')
      
      // Wait for GL accounts to load and select them
      await waitFor(() => {
        expect(screen.getByText('Inventory Asset (1130)')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByLabelText('Inventory Account *'), '1130')
      await user.selectOptions(screen.getByLabelText('COGS Account *'), '5100')
      await user.selectOptions(screen.getByLabelText('Variance Account *'), '5150')

      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'New Category',
          code: 'NEW_CATEGORY',
          description: 'Test description',
          parentId: undefined,
          glAccounts: {
            inventoryAccount: '1130',
            cogsAccount: '5100',
            varianceAccount: '5150'
          }
        })
      })
    })
  })

  describe('Form Actions', () => {
    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      let resolveSubmit: (value: any) => void
      const mockSlowSubmit = jest.fn(() => new Promise(resolve => { resolveSubmit = resolve }))
      
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockSlowSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      await user.type(screen.getByLabelText('Category Name *'), 'Test')
      
      // Wait for GL accounts and select required ones
      await waitFor(() => {
        expect(screen.getByText('Inventory Asset (1130)')).toBeInTheDocument()
      })
      
      await user.selectOptions(screen.getByLabelText('Inventory Account *'), '1130')
      await user.selectOptions(screen.getByLabelText('COGS Account *'), '5100')

      const submitButton = screen.getByRole('button', { name: 'Create Category' })
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

  describe('Accessibility', () => {
    it('should have proper ARIA labels and structure', () => {
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      expect(screen.getByRole('form')).toBeInTheDocument()
      expect(screen.getByLabelText('Category Name *')).toHaveAttribute('required')
      expect(screen.getByLabelText('Category Code *')).toHaveAttribute('required')
    })

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryForm
          mode="create"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableCategories={[]}
        />
      )

      const submitButton = screen.getByRole('button', { name: 'Create Category' })
      await user.click(submitButton)

      await waitFor(() => {
        const nameError = screen.getByText('Category name is required')
        expect(nameError).toHaveAttribute('role', 'alert')
      })
    })
  })
})