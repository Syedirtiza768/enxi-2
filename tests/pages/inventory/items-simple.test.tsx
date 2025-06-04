/**
 * Simplified TDD Test for Items Page - Basic functionality
 */

import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import ItemsPage from '@/app/(auth)/inventory/items/page'
import * as useAuthHook from '@/lib/hooks/use-auth'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))
jest.mock('@/lib/hooks/use-auth')

const mockUseAuth = useAuthHook as jest.Mocked<typeof useAuthHook>
const mockPush = jest.fn()

// Mock fetch
global.fetch = jest.fn()

describe('Items Page - Basic Tests', () => {
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

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 })
    })
  })

  it('🟢 should render page header and basic elements', () => {
    render(<ItemsPage />)
    
    expect(screen.getByText('Inventory Items')).toBeInTheDocument()
    expect(screen.getByText('New Item')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
  })

  it('🟢 should have all required filter elements', () => {
    render(<ItemsPage />)
    
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })

  it('🟢 should display statistics cards', () => {
    render(<ItemsPage />)
    
    expect(screen.getByText('Total Items')).toBeInTheDocument()
    expect(screen.getByText('Low Stock Items')).toBeInTheDocument()
    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
  })
})