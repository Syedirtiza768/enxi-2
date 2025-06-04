/**
 * TDD Test Suite for New Item Page
 * Testing item creation functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import NewItemPage from '@/app/(auth)/inventory/items/new/page'
import * as useAuthHook from '@/lib/hooks/use-auth'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))
jest.mock('@/lib/hooks/use-auth')

const mockUseAuth = useAuthHook as jest.Mocked<typeof useAuthHook>
const mockPush = jest.fn()
const mockRefresh = jest.fn()

// Mock fetch
global.fetch = jest.fn()

describe('New Item Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh
    })
    
    mockUseAuth.useAuth.mockReturnValue({
      user: { id: 'user1', name: 'Test User' },
      loading: false
    })

    // Mock API responses for reference data
    ;(global.fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/api/inventory/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                { id: 'cat1', name: 'Electronics', code: 'ELEC' },
                { id: 'cat2', name: 'Furniture', code: 'FURN' }
              ]
            })
          })
        }
        
        if (url.includes('/api/inventory/units-of-measure')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                { id: 'uom1', code: 'PCS', name: 'Pieces', symbol: 'pcs' },
                { id: 'uom2', code: 'KG', name: 'Kilograms', symbol: 'kg' }
              ]
            })
          })
        }
        
        if (url.includes('/api/accounting/accounts')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                { id: 'acc1', code: '1200', name: 'Inventory Asset', type: 'ASSET' },
                { id: 'acc2', code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
                { id: 'acc3', code: '4000', name: 'Sales Revenue', type: 'INCOME' }
              ]
            })
          })
        }
        
        if (url.includes('/api/inventory/items') && url.includes('generate-code')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ code: 'ITM-001' })
          })
        }
        
        return Promise.reject(new Error('Unknown API endpoint'))
      })
  })

  describe('🔴 RED: Basic page structure tests', () => {
    it('should render new item page with header', () => {
      render(<NewItemPage />)
      
      expect(screen.getByText('New Item')).toBeInTheDocument()
      expect(screen.getByText('Create a new inventory item')).toBeInTheDocument()
    })

    it('should display item form component', () => {
      render(<NewItemPage />)
      
      // Check for ItemForm presence by looking for key form fields
      expect(screen.getByLabelText(/item code/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/item name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    })

    it('should have save and cancel buttons', () => {
      render(<NewItemPage />)
      
      expect(screen.getByRole('button', { name: /create item/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Form functionality tests', () => {
    it('should populate form fields and validate required fields', async () => {
      render(<NewItemPage />)
      
      // Try to submit empty form
      const createButton = screen.getByRole('button', { name: /create item/i })
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(screen.getByText(/item code is required/i)).toBeInTheDocument()
        expect(screen.getByText(/item name is required/i)).toBeInTheDocument()
      })
    })

    it('should handle code generation', async () => {
      render(<NewItemPage />)
      
      // First select a category
      const categorySelect = screen.getByLabelText(/category/i)
      fireEvent.change(categorySelect, { target: { value: 'cat1' } })
      
      // Then generate code
      const generateButton = screen.getByRole('button', { name: /generate code/i })
      fireEvent.click(generateButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('generate-code?categoryId=cat1')
        )
      })
    })

    it('should load reference data on mount', async () => {
      render(<NewItemPage />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/inventory/categories')
        expect(global.fetch).toHaveBeenCalledWith('/api/inventory/units-of-measure')
        expect(global.fetch).toHaveBeenCalledWith('/api/accounting/accounts')
      })
    })

    it('should create item when form is submitted with valid data', async () => {
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce((url) => {
          if (url.includes('/api/inventory/items') && !url.includes('generate-code')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({ id: 'item1', code: 'ITM-001' })
            })
          }
          return Promise.reject(new Error('Unexpected API call'))
        })
      
      render(<NewItemPage />)
      
      // Fill form with valid data
      const codeInput = screen.getByLabelText(/item code/i)
      const nameInput = screen.getByLabelText(/item name/i)
      const categorySelect = screen.getByLabelText(/category/i)
      const unitSelect = screen.getByLabelText(/unit of measure/i)
      
      fireEvent.change(codeInput, { target: { value: 'ITM-001' } })
      fireEvent.change(nameInput, { target: { value: 'Test Item' } })
      fireEvent.change(categorySelect, { target: { value: 'cat1' } })
      fireEvent.change(unitSelect, { target: { value: 'uom1' } })
      
      // Submit form
      const createButton = screen.getByRole('button', { name: /create item/i })
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/inventory/items',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          })
        )
      })
    })

    it('should navigate back to items list after successful creation', async () => {
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce((url) => {
          if (url.includes('/api/inventory/items') && !url.includes('generate-code')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({ id: 'item1', code: 'ITM-001' })
            })
          }
          return Promise.reject(new Error('Unexpected API call'))
        })
      
      render(<NewItemPage />)
      
      // Fill and submit form (simplified)
      const codeInput = screen.getByLabelText(/item code/i)
      const nameInput = screen.getByLabelText(/item name/i)
      const categorySelect = screen.getByLabelText(/category/i)
      const unitSelect = screen.getByLabelText(/unit of measure/i)
      
      fireEvent.change(codeInput, { target: { value: 'ITM-001' } })
      fireEvent.change(nameInput, { target: { value: 'Test Item' } })
      fireEvent.change(categorySelect, { target: { value: 'cat1' } })
      fireEvent.change(unitSelect, { target: { value: 'uom1' } })
      
      const createButton = screen.getByRole('button', { name: /create item/i })
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/inventory/items')
      })
    })

    it('should navigate back when cancel is clicked', () => {
      render(<NewItemPage />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)
      
      expect(mockPush).toHaveBeenCalledWith('/inventory/items')
    })

    it('should handle form submission errors', async () => {
      ;(global.fetch as jest.Mock)
        .mockImplementationOnce(() => {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: 'Item code already exists' })
          })
        })
      
      render(<NewItemPage />)
      
      // Fill and submit form
      const codeInput = screen.getByLabelText(/item code/i)
      const nameInput = screen.getByLabelText(/item name/i)
      const categorySelect = screen.getByLabelText(/category/i)
      const unitSelect = screen.getByLabelText(/unit of measure/i)
      
      fireEvent.change(codeInput, { target: { value: 'ITM-001' } })
      fireEvent.change(nameInput, { target: { value: 'Test Item' } })
      fireEvent.change(categorySelect, { target: { value: 'cat1' } })
      fireEvent.change(unitSelect, { target: { value: 'uom1' } })
      
      const createButton = screen.getByRole('button', { name: /create item/i })
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(screen.getByText(/item code already exists/i)).toBeInTheDocument()
      })
    })
  })

  describe('🔴 RED: Form integration tests', () => {
    it('should disable inventory settings for service items', async () => {
      render(<NewItemPage />)
      
      const typeSelect = screen.getByLabelText(/type/i)
      fireEvent.change(typeSelect, { target: { value: 'SERVICE' } })
      
      await waitFor(() => {
        const trackInventoryCheckbox = screen.getByLabelText(/track inventory/i)
        expect(trackInventoryCheckbox).toBeDisabled()
      })
    })

    it('should show GL account dropdowns with filtered options', async () => {
      render(<NewItemPage />)
      
      await waitFor(() => {
        // Should have inventory account dropdown with ASSET accounts
        const inventorySelect = screen.getByLabelText(/inventory account/i)
        expect(inventorySelect).toBeInTheDocument()
        
        // Should have COGS account dropdown with EXPENSE accounts
        const cogsSelect = screen.getByLabelText(/cogs account/i)
        expect(cogsSelect).toBeInTheDocument()
        
        // Should have sales account dropdown with INCOME accounts
        const salesSelect = screen.getByLabelText(/sales account/i)
        expect(salesSelect).toBeInTheDocument()
      })
    })
  })
})