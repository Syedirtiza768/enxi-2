/**
 * TDD Test Suite for Inventory Items Page
 * Testing the main items list page functionality
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import ItemsPage from '@/app/(auth)/inventory/items/page'
import * as useAuthHook from '@/lib/hooks/use-auth'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

jest.mock('@/lib/hooks/use-auth')

const mockPush = jest.fn()
const mockUseAuth = useAuthHook as jest.Mocked<typeof useAuthHook>

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Inventory Items Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: jest.fn()
    })
    
    mockUseAuth.useAuth.mockReturnValue({
      user: { id: 'user1', name: 'Test User' },
      loading: false
    })

    // Mock API responses - items and categories
    ;(global.fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/api/inventory/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                { id: 'cat1', name: 'Electronics' },
                { id: 'cat2', name: 'Furniture' }
              ]
            })
          })
        }
        
        if (url.includes('/api/inventory/items')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'item1',
                  code: 'ITM-001',
                  name: 'Test Item 1',
                  description: 'Test description',
                  type: 'PRODUCT',
                  category: { id: 'cat1', name: 'Electronics' },
                  unitOfMeasure: { id: 'uom1', code: 'PCS', name: 'Pieces' },
                  trackInventory: true,
                  minStockLevel: 10,
                  maxStockLevel: 100,
                  reorderPoint: 20,
                  standardCost: 50,
                  listPrice: 100,
                  isActive: true,
                  isSaleable: true,
                  isPurchaseable: true,
                  stockSummary: {
                    totalQuantity: 25,
                    availableQuantity: 20,
                    reservedQuantity: 5,
                    totalValue: 1250
                  }
                }
              ],
              total: 1,
              page: 1,
              limit: 20
            })
          })
        }
        
        return Promise.reject(new Error('Unknown API endpoint'))
      })
  })

  describe('🔴 RED: Initial failing tests', () => {
    it('should render items page with header and create button', async () => {
      render(<ItemsPage />)
      
      // Should have page title
      expect(screen.getByText('Inventory Items')).toBeInTheDocument()
      
      // Should have create new item button
      expect(screen.getByText('New Item')).toBeInTheDocument()
      
      // Should have search functionality
      expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
    })

    it('should display loading state initially', () => {
      render(<ItemsPage />)
      
      expect(screen.getByText('Loading items...')).toBeInTheDocument()
    })

    it('should fetch and display items from API', async () => {
      render(<ItemsPage />)
      
      await waitFor(() => {
        // Use more specific selectors
        expect(screen.getByRole('cell', { name: 'ITM-001' })).toBeInTheDocument()
        expect(screen.getByRole('cell', { name: 'Test Item 1' })).toBeInTheDocument()
        expect(screen.getByRole('cell', { name: 'Electronics' })).toBeInTheDocument()
      })

      // Verify API was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/inventory/items'),
        expect.objectContaining({
          credentials: 'include'
        })
      )
    })

    it('should have filters for category and type', async () => {
      render(<ItemsPage />)
      
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
      expect(screen.getByLabelText('Type')).toBeInTheDocument()
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
    })

    it('should handle search functionality', async () => {
      render(<ItemsPage />)
      
      const searchInput = screen.getByPlaceholderText('Search items...')
      fireEvent.change(searchInput, { target: { value: 'test search' } })
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=test%20search'),
          expect.any(Object)
        )
      })
    })

    it('should navigate to new item page when create button clicked', () => {
      render(<ItemsPage />)
      
      const createButton = screen.getByText('New Item')
      fireEvent.click(createButton)
      
      expect(mockPush).toHaveBeenCalledWith('/inventory/items/new')
    })

    it('should show stock levels and alerts for inventory items', async () => {
      render(<ItemsPage />)
      
      await waitFor(() => {
        // Should show stock quantity
        expect(screen.getByText('25 PCS')).toBeInTheDocument()
        
        // Should show stock details if enabled
        expect(screen.getByText('Available: 20')).toBeInTheDocument()
        expect(screen.getByText('Reserved: 5')).toBeInTheDocument()
      })
    })

    it('should handle item selection for detail view', async () => {
      render(<ItemsPage />)
      
      await waitFor(() => {
        const itemRow = screen.getByText('Test Item 1').closest('tr')
        fireEvent.click(itemRow!)
      })
      
      expect(mockPush).toHaveBeenCalledWith('/inventory/items/item1')
    })

    it('should display error state when API fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
      
      render(<ItemsPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load items/i)).toBeInTheDocument()
      })
    })

    it('should handle empty state when no items exist', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], total: 0, page: 1, limit: 20 })
      })
      
      render(<ItemsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument()
        expect(screen.getByText('Create your first inventory item to get started')).toBeInTheDocument()
      })
    })

    it('should show pagination when items exceed page limit', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          data: new Array(20).fill(null).map((_, i) => ({
            id: `item${i}`,
            code: `ITM-${String(i).padStart(3, '0')}`,
            name: `Item ${i}`,
            type: 'PRODUCT',
            category: { id: 'cat1', name: 'Electronics' },
            unitOfMeasure: { id: 'uom1', code: 'PCS', name: 'Pieces' },
            trackInventory: true,
            isActive: true,
            standardCost: 50,
            listPrice: 100
          })),
          total: 45,
          page: 1,
          limit: 20
        })
      })
      
      render(<ItemsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
        expect(screen.getByText('Next')).toBeInTheDocument()
      })
    })
  })

  describe('🔴 RED: Advanced functionality tests', () => {
    it('should support bulk operations on selected items', async () => {
      render(<ItemsPage />)
      
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select item/i })
        fireEvent.click(checkbox)
      })
      
      expect(screen.getByText('1 item selected')).toBeInTheDocument()
      expect(screen.getByText('Export Selected')).toBeInTheDocument()
      expect(screen.getByText('Bulk Update')).toBeInTheDocument()
    })

    it('should filter items by low stock status', async () => {
      render(<ItemsPage />)
      
      const lowStockFilter = screen.getByLabelText('Show low stock only')
      fireEvent.click(lowStockFilter)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('lowStock=true'),
          expect.any(Object)
        )
      })
    })

    it('should export items data when export button clicked', async () => {
      // Mock URL.createObjectURL and related browser APIs
      global.URL.createObjectURL = jest.fn(() => 'blob:url')
      global.URL.revokeObjectURL = jest.fn()
      
      const mockLink = {
        click: jest.fn(),
        download: '',
        href: ''
      }
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      
      render(<ItemsPage />)
      
      const exportButton = screen.getByText('Export')
      fireEvent.click(exportButton)
      
      expect(mockLink.click).toHaveBeenCalled()
    })
  })
})

describe('Items Page Integration Tests', () => {
  it('should work end-to-end: load items, search, filter, and navigate', async () => {
    render(<ItemsPage />)
    
    // 1. Initial load
    await waitFor(() => {
      expect(screen.getByText('ITM-001')).toBeInTheDocument()
    })
    
    // 2. Search
    const searchInput = screen.getByPlaceholderText('Search items...')
    fireEvent.change(searchInput, { target: { value: 'electronics' } })
    
    // 3. Filter by category
    const categoryFilter = screen.getByLabelText('Category')
    fireEvent.change(categoryFilter, { target: { value: 'cat1' } })
    
    // 4. Navigate to detail
    const itemRow = screen.getByText('Test Item 1').closest('tr')
    fireEvent.click(itemRow!)
    
    expect(mockPush).toHaveBeenCalledWith('/inventory/items/item1')
  })
})