/**
 * Integration Test for Complete Inventory Workflow
 * Tests the full inventory management flow: List → Create → View → Edit
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import ItemsPage from '@/app/(auth)/inventory/items/page'
import NewItemPage from '@/app/(auth)/inventory/items/new/page'
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

describe('Inventory Workflow Integration', () => {
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
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/inventory/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [{ id: 'cat1', name: 'Electronics' }] })
        })
      }
      
      if (url.includes('/api/inventory/units-of-measure')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [{ id: 'uom1', code: 'PCS', name: 'Pieces' }] })
        })
      }
      
      if (url.includes('/api/accounting/accounts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] })
        })
      }
      
      if (url.includes('/api/inventory/items')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            data: [{
              id: 'item1',
              code: 'ITM-001',
              name: 'Test Item',
              category: { name: 'Electronics' },
              unitOfMeasure: { code: 'PCS' },
              listPrice: 100,
              isActive: true
            }],
            total: 1
          })
        })
      }
      
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  describe('🔄 Complete Inventory Management Flow', () => {
    it('should support the full inventory workflow', () => {
      // 1. Items List Page
      const { unmount: unmountList } = render(<ItemsPage />)
      
      expect(screen.getByText('Inventory Items')).toBeInTheDocument()
      expect(screen.getByText('New Item')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
      
      // Verify navigation to create new item
      const newItemButton = screen.getByText('New Item')
      fireEvent.click(newItemButton)
      expect(mockPush).toHaveBeenCalledWith('/inventory/items/new')
      
      unmountList()

      // 2. New Item Page
      const { unmount: unmountNew } = render(<NewItemPage />)
      
      expect(screen.getByText('New Item')).toBeInTheDocument()
      expect(screen.getByText('Create a new inventory item')).toBeInTheDocument()
      expect(screen.getByLabelText(/item code/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/item name/i)).toBeInTheDocument()
      
      // Verify navigation back to items
      const backButton = screen.getByText('Back to Items')
      fireEvent.click(backButton)
      expect(mockPush).toHaveBeenCalledWith('/inventory/items')
      
      unmountNew()

      // 3. Item Detail Page
      const { unmount: unmountDetail } = render(<ItemDetailPage />)
      
      // Should show loading initially
      expect(screen.getByText('Loading item details...')).toBeInTheDocument()
      
      // Verify navigation elements exist
      expect(screen.getByText('Back to Items')).toBeInTheDocument()
      
      unmountDetail()
    })

    it('should have consistent navigation patterns', () => {
      // Test Items List
      render(<ItemsPage />)
      const newItemBtn = screen.getByText('New Item')
      fireEvent.click(newItemBtn)
      expect(mockPush).toHaveBeenCalledWith('/inventory/items/new')
    })

    it('should integrate with existing inventory components', () => {
      // Verify existing ItemForm and ItemList components are used
      render(<NewItemPage />)
      expect(screen.getByRole('form')).toBeInTheDocument()
      
      render(<ItemsPage />)
      expect(screen.getByText('Total Items')).toBeInTheDocument()
    })

    it('should support full CRUD operations through navigation', () => {
      // Create
      render(<NewItemPage />)
      expect(screen.getByRole('button', { name: /create item/i })).toBeInTheDocument()
      
      // Read (List)
      render(<ItemsPage />)
      expect(screen.getByText('Search items...')).toBeInTheDocument()
      
      // Read (Detail)
      render(<ItemDetailPage />)
      expect(screen.getByText('Back to Items')).toBeInTheDocument()
      
      // Update
      const editButton = screen.getByText('Edit Item')
      fireEvent.click(editButton)
      expect(mockPush).toHaveBeenCalledWith('/inventory/items/item1/edit')
      
      // Delete
      expect(screen.getByText('Delete Item')).toBeInTheDocument()
    })
  })

  describe('🔗 API Integration Consistency', () => {
    it('should call correct API endpoints across pages', () => {
      // Items list should fetch items
      render(<ItemsPage />)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/inventory/items'),
        expect.objectContaining({ credentials: 'include' })
      )
      
      // Detail page should fetch specific item
      render(<ItemDetailPage />)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/items/item1',
        expect.objectContaining({ credentials: 'include' })
      )
    })
  })

  describe('🎨 UI Consistency', () => {
    it('should maintain consistent styling across pages', () => {
      // All pages should have consistent header structure
      render(<ItemsPage />)
      expect(screen.getByText('Inventory Items')).toHaveClass('text-2xl', 'font-semibold')
      
      render(<NewItemPage />)
      expect(screen.getByText('New Item')).toHaveClass('text-2xl', 'font-semibold')
      
      render(<ItemDetailPage />)
      expect(screen.getByText('Back to Items')).toBeInTheDocument()
    })

    it('should have consistent button patterns', () => {
      render(<ItemsPage />)
      expect(screen.getByText('New Item')).toHaveClass('bg-blue-600')
      
      render(<NewItemPage />)
      expect(screen.getByRole('button', { name: /create item/i })).toHaveClass('bg-blue-600')
    })
  })
})