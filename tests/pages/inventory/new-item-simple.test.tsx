/**
 * Simplified TDD Test for New Item Page - Basic functionality
 */

import { render, screen, fireEvent } from '@testing-library/react'
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

// Mock fetch
global.fetch = jest.fn()

describe('New Item Page - Basic Tests', () => {
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
      json: async () => ({ data: [] })
    })
  })

  it('🟢 should render page header and form elements', () => {
    render(<NewItemPage />)
    
    expect(screen.getByText('New Item')).toBeInTheDocument()
    expect(screen.getByText('Create a new inventory item')).toBeInTheDocument()
    expect(screen.getByText('Back to Items')).toBeInTheDocument()
  })

  it('🟢 should have ItemForm with basic fields', () => {
    render(<NewItemPage />)
    
    expect(screen.getByLabelText(/item code/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/item name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
  })

  it('🟢 should handle cancel navigation', () => {
    render(<NewItemPage />)
    
    const backButton = screen.getByText('Back to Items')
    fireEvent.click(backButton)
    
    expect(mockPush).toHaveBeenCalledWith('/inventory/items')
  })

  it('🟢 should have form action buttons', () => {
    render(<NewItemPage />)
    
    expect(screen.getByRole('button', { name: /create item/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })
})