/**
 * TDD Test Suite for Item Detail Page
 * Testing item view and edit functionality
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import ItemDetailPage from '@/app/(auth)/inventory/items/[id]/page'
import * as useAuthHook from '@/lib/hooks/use-auth'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn()
}))
jest.mock('@/lib/hooks/use-auth')

const mockUseAuth = useAuthHook as jest.Mocked<typeof useAuthHook>
const mockPush = jest.fn()

// Mock fetch
global.fetch = jest.fn()

describe('Item Detail Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: jest.fn()
    })

    ;(useParams as jest.Mock).mockReturnValue({
      id: 'item1'
    })
    
    mockUseAuth.useAuth.mockReturnValue({
      user: { id: 'user1', name: 'Test User' },
      loading: false
    })

    // Mock API responses
    ;(global.fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/api/inventory/items/item1')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
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
              },
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            })
          })
        }
        
        return Promise.reject(new Error('Unknown API endpoint'))
      })
  })

  describe('🔴 RED: Basic page structure tests', () => {
    it('should render item detail page with header', async () => {
      render(<ItemDetailPage />)
      
      expect(screen.getByText('Item Details')).toBeInTheDocument()
      expect(screen.getByText('Back to Items')).toBeInTheDocument()
    })

    it('should display item information', async () => {
      render(<ItemDetailPage />)
      
      expect(screen.getByText('ITM-001')).toBeInTheDocument()
      expect(screen.getByText('Test Item 1')).toBeInTheDocument()
      expect(screen.getByText('Test description')).toBeInTheDocument()
    })

    it('should have action buttons', async () => {
      render(<ItemDetailPage />)
      
      expect(screen.getByText('Edit Item')).toBeInTheDocument()
      expect(screen.getByText('Delete Item')).toBeInTheDocument()
    })

    it('should display stock information for inventory items', async () => {
      render(<ItemDetailPage />)
      
      expect(screen.getByText('Stock Summary')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument() // Total quantity
      expect(screen.getByText('20')).toBeInTheDocument() // Available
      expect(screen.getByText('5')).toBeInTheDocument()  // Reserved
    })

    it('should show item specifications', async () => {
      render(<ItemDetailPage />)
      
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Product')).toBeInTheDocument()
      expect(screen.getByText('Unit of Measure')).toBeInTheDocument()
      expect(screen.getByText('Pieces')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Navigation and actions tests', () => {
    it('should navigate back when back button clicked', () => {
      render(<ItemDetailPage />)
      
      const backButton = screen.getByText('Back to Items')
      fireEvent.click(backButton)
      
      expect(mockPush).toHaveBeenCalledWith('/inventory/items')
    })

    it('should navigate to edit page when edit button clicked', () => {
      render(<ItemDetailPage />)
      
      const editButton = screen.getByText('Edit Item')
      fireEvent.click(editButton)
      
      expect(mockPush).toHaveBeenCalledWith('/inventory/items/item1/edit')
    })

    it('should handle delete confirmation', () => {
      render(<ItemDetailPage />)
      
      const deleteButton = screen.getByText('Delete Item')
      fireEvent.click(deleteButton)
      
      // Should show confirmation dialog
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument()
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Stock and pricing display tests', () => {
    it('should display pricing information', async () => {
      render(<ItemDetailPage />)
      
      expect(screen.getByText('Pricing')).toBeInTheDocument()
      expect(screen.getByText('$50.00')).toBeInTheDocument() // Standard cost
      expect(screen.getByText('$100.00')).toBeInTheDocument() // List price
    })

    it('should show stock levels and alerts', async () => {
      render(<ItemDetailPage />)
      
      expect(screen.getByText('Stock Levels')).toBeInTheDocument()
      expect(screen.getByText('Min: 10')).toBeInTheDocument()
      expect(screen.getByText('Max: 100')).toBeInTheDocument()
      expect(screen.getByText('Reorder: 20')).toBeInTheDocument()
    })

    it('should display item status badges', async () => {
      render(<ItemDetailPage />)
      
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Saleable')).toBeInTheDocument()
      expect(screen.getByText('Purchaseable')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Error handling tests', () => {
    it('should handle item not found', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Item not found'))
      
      render(<ItemDetailPage />)
      
      expect(screen.getByText(/failed to load item/i)).toBeInTheDocument()
    })

    it('should show loading state initially', () => {
      render(<ItemDetailPage />)
      
      expect(screen.getByText('Loading item details...')).toBeInTheDocument()
    })
  })

  describe('🔴 RED: Tabs and sections tests', () => {
    it('should have tabbed interface', async () => {
      render(<ItemDetailPage />)
      
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Stock History')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })

    it('should switch between tabs', async () => {
      render(<ItemDetailPage />)
      
      const stockHistoryTab = screen.getByText('Stock History')
      fireEvent.click(stockHistoryTab)
      
      // Should show stock history content
      expect(screen.getByText('Recent Stock Movements')).toBeInTheDocument()
    })
  })
})