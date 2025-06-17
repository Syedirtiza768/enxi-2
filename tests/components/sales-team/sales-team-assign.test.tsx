import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import SalesTeamAssignPage from '@/app/(auth)/sales-team/assign/page'
import { apiClient } from '@/lib/api/client'
import { Role } from '@/lib/types/shared-enums'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/lib/api/client')

const mockPush = jest.fn()
const mockSearchParams = new URLSearchParams()

describe('Sales Team Assignment Page - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  })

  describe('Error Handling', () => {
    it('should handle API failure when loading data', async () => {
      // Mock API failures
      ;(apiClient as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<SalesTeamAssignPage />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load data/i)).toBeInTheDocument()
      })
    })

    it('should handle empty response from API', async () => {
      // Mock empty responses
      ;(apiClient as jest.Mock)
        .mockResolvedValueOnce({ ok: true, data: null })
        .mockResolvedValueOnce({ ok: true, data: null })

      render(<SalesTeamAssignPage />)

      await waitFor(() => {
        // Should render but with empty dropdowns
        expect(screen.getByText(/Choose a customer/i)).toBeInTheDocument()
      })
    })

    it('should display error when assigning already assigned customer', async () => {
      // Mock successful data load
      const mockUsers = [
        { id: 'sp1', username: 'john', email: 'john@example.com', role: Role.SALES_REP },
        { id: 'sp2', username: 'jane', email: 'jane@example.com', role: Role.SALES_REP },
      ]
      
      const mockCustomers = {
        data: [{
          id: 'c1',
          name: 'Customer 1',
          email: 'c1@example.com',
          customerNumber: 'C001',
          assignedTo: { id: 'sp1', username: 'john' },
        }],
      }

      ;(apiClient as jest.Mock)
        .mockResolvedValueOnce({ ok: true, data: { data: mockUsers } })
        .mockResolvedValueOnce({ ok: true, data: mockCustomers })

      render(<SalesTeamAssignPage />)

      await waitFor(() => {
        expect(screen.getByText(/Customer 1/i)).toBeInTheDocument()
      })

      // Select already assigned customer
      fireEvent.click(screen.getByText(/Choose a customer/i))
      fireEvent.click(screen.getByText(/Customer 1/i))

      // Note about current assignment should be visible
      expect(screen.getByText(/Currently assigned to john/i)).toBeInTheDocument()

      // Select different salesperson
      fireEvent.click(screen.getByText(/Choose a salesperson/i))
      fireEvent.click(screen.getByText(/jane/i))

      // Mock assignment failure
      ;(apiClient as jest.Mock).mockResolvedValueOnce({
        ok: false,
        error: 'Customer is already assigned to this salesperson',
      })

      // Submit form
      fireEvent.click(screen.getByText(/Assign/i))

      await waitFor(() => {
        expect(screen.getByText(/Customer is already assigned/i)).toBeInTheDocument()
      })
    })

    it('should handle validation errors', async () => {
      // Mock successful data load
      ;(apiClient as jest.Mock)
        .mockResolvedValueOnce({ ok: true, data: { data: [] } })
        .mockResolvedValueOnce({ ok: true, data: { data: [] } })

      render(<SalesTeamAssignPage />)

      await waitFor(() => {
        expect(screen.getByText(/Assign/i)).toBeInTheDocument()
      })

      // Try to submit without selecting anything
      fireEvent.click(screen.getByText(/Assign/i))

      await waitFor(() => {
        expect(screen.getByText(/Please select both a customer and a salesperson/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors during assignment', async () => {
      // Mock successful data load
      const mockUsers = [
        { id: 'sp1', username: 'john', email: 'john@example.com', role: Role.SALES_REP },
      ]
      
      const mockCustomers = {
        data: [{
          id: 'c1',
          name: 'Customer 1',
          email: 'c1@example.com',
          customerNumber: 'C001',
        }],
      }

      ;(apiClient as jest.Mock)
        .mockResolvedValueOnce({ ok: true, data: { data: mockUsers } })
        .mockResolvedValueOnce({ ok: true, data: mockCustomers })

      render(<SalesTeamAssignPage />)

      await waitFor(() => {
        expect(screen.getByText(/Customer 1/i)).toBeInTheDocument()
      })

      // Make selections
      fireEvent.click(screen.getByText(/Choose a customer/i))
      fireEvent.click(screen.getByText(/Customer 1/i))
      fireEvent.click(screen.getByText(/Choose a salesperson/i))
      fireEvent.click(screen.getByText(/john/i))

      // Mock network error
      ;(apiClient as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'))

      // Submit form
      fireEvent.click(screen.getByText(/Assign/i))

      await waitFor(() => {
        expect(screen.getByText(/Network timeout/i)).toBeInTheDocument()
      })
    })

    it('should handle permission denied errors', async () => {
      // Mock successful data load
      const mockUsers = [{ id: 'sp1', username: 'john', email: 'john@example.com', role: Role.SALES_REP }]
      const mockCustomers = { data: [{ id: 'c1', name: 'Customer 1', email: 'c1@example.com', customerNumber: 'C001' }] }

      ;(apiClient as jest.Mock)
        .mockResolvedValueOnce({ ok: true, data: { data: mockUsers } })
        .mockResolvedValueOnce({ ok: true, data: mockCustomers })

      render(<SalesTeamAssignPage />)

      await waitFor(() => {
        expect(screen.getByText(/Customer 1/i)).toBeInTheDocument()
      })

      // Make selections
      fireEvent.click(screen.getByText(/Choose a customer/i))
      fireEvent.click(screen.getByText(/Customer 1/i))
      fireEvent.click(screen.getByText(/Choose a salesperson/i))
      fireEvent.click(screen.getByText(/john/i))

      // Mock permission denied
      ;(apiClient as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        error: 'You do not have permission to update customers',
      })

      // Submit form
      fireEvent.click(screen.getByText(/Assign/i))

      await waitFor(() => {
        expect(screen.getByText(/You do not have permission/i)).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle managers in salesperson list', async () => {
      // Mock users with mixed roles
      const mockUsers = [
        { id: 'm1', username: 'manager1', email: 'm1@example.com', role: Role.MANAGER },
        { id: 'sp1', username: 'sales1', email: 'sp1@example.com', role: Role.SALES_REP },
      ]
      
      ;(apiClient as jest.Mock)
        .mockResolvedValueOnce({ ok: true, data: { data: mockUsers } })
        .mockResolvedValueOnce({ ok: true, data: { data: [] } })

      render(<SalesTeamAssignPage />)

      await waitFor(() => {
        expect(screen.getByText(/Choose a salesperson/i)).toBeInTheDocument()
      })

      // Both should appear in dropdown
      fireEvent.click(screen.getByText(/Choose a salesperson/i))
      expect(screen.getByText(/manager1/i)).toBeInTheDocument()
      expect(screen.getByText(/sales1/i)).toBeInTheDocument()
    })

    it('should handle preselected customer from URL', async () => {
      // Mock search params with customerId
      const mockParams = new URLSearchParams({ customerId: 'c123' })
      ;(useSearchParams as jest.Mock).mockReturnValue(mockParams)

      const mockUsers = [{ id: 'sp1', username: 'john', email: 'john@example.com', role: Role.SALES_REP }]
      const mockCustomers = {
        data: [
          { id: 'c123', name: 'Preselected Customer', email: 'pre@example.com', customerNumber: 'C123' },
          { id: 'c456', name: 'Other Customer', email: 'other@example.com', customerNumber: 'C456' },
        ],
      }

      ;(apiClient as jest.Mock)
        .mockResolvedValueOnce({ ok: true, data: { data: mockUsers } })
        .mockResolvedValueOnce({ ok: true, data: mockCustomers })

      render(<SalesTeamAssignPage />)

      await waitFor(() => {
        // Check if preselected customer is selected
        const selectTrigger = screen.getByRole('combobox', { name: /select customer/i })
        expect(selectTrigger).toHaveTextContent('Preselected Customer')
      })
    })

    it('should disable submit button during submission', async () => {
      const mockUsers = [{ id: 'sp1', username: 'john', email: 'john@example.com', role: Role.SALES_REP }]
      const mockCustomers = { data: [{ id: 'c1', name: 'Customer 1', email: 'c1@example.com', customerNumber: 'C001' }] }

      ;(apiClient as jest.Mock)
        .mockResolvedValueOnce({ ok: true, data: { data: mockUsers } })
        .mockResolvedValueOnce({ ok: true, data: mockCustomers })

      render(<SalesTeamAssignPage />)

      await waitFor(() => {
        expect(screen.getByText(/Customer 1/i)).toBeInTheDocument()
      })

      // Make selections
      fireEvent.click(screen.getByText(/Choose a customer/i))
      fireEvent.click(screen.getByText(/Customer 1/i))
      fireEvent.click(screen.getByText(/Choose a salesperson/i))
      fireEvent.click(screen.getByText(/john/i))

      // Mock slow API response
      ;(apiClient as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true }), 1000))
      )

      // Submit form
      const submitButton = screen.getByRole('button', { name: /^Assign$/i })
      fireEvent.click(submitButton)

      // Button should be disabled and show loading state
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/Assigning.../i)).toBeInTheDocument()
    })

    it('should handle manager assignment type correctly', async () => {
      const mockUsers = [
        { id: 'm1', username: 'manager1', email: 'm1@example.com', role: Role.MANAGER },
        { id: 'sp1', username: 'sales1', email: 'sp1@example.com', role: Role.SALES_REP },
      ]

      ;(apiClient as jest.Mock)
        .mockResolvedValueOnce({ ok: true, data: { data: mockUsers } })
        .mockResolvedValueOnce({ ok: true, data: { data: [] } })

      render(<SalesTeamAssignPage />)

      await waitFor(() => {
        expect(screen.getByText(/Assign Manager/i)).toBeInTheDocument()
      })

      // Switch to manager assignment
      fireEvent.click(screen.getByText(/Assign Manager/i))

      await waitFor(() => {
        expect(screen.getByText(/Select Salesperson/i)).toBeInTheDocument()
        expect(screen.getByText(/Assign To Manager/i)).toBeInTheDocument()
      })

      // Only sales reps should appear in salesperson dropdown
      fireEvent.click(screen.getByLabelText(/Select Salesperson/i))
      expect(screen.getByText(/sales1/i)).toBeInTheDocument()
      expect(screen.queryByText(/manager1.*SALES_REP/i)).not.toBeInTheDocument()
    })
  })

  describe('Data Format Handling', () => {
    it('should handle different API response formats', async () => {
      // Test various response formats the API might return
      const responseFormats = [
        { ok: true, data: { data: [] } }, // Standard format
        { ok: true, data: [] }, // Direct array
        { ok: true, data: { customers: [] } }, // Alternative property name
      ]

      for (const format of responseFormats) {
        jest.clearAllMocks()
        ;(apiClient as jest.Mock)
          .mockResolvedValueOnce({ ok: true, data: { data: [] } })
          .mockResolvedValueOnce(format)

        const { unmount } = render(<SalesTeamAssignPage />)

        await waitFor(() => {
          // Should not crash with different formats
          expect(screen.getByText(/Choose a customer/i)).toBeInTheDocument()
        })

        unmount()
      }
    })

    it('should sanitize special characters in customer names', async () => {
      const mockUsers = [{ id: 'sp1', username: 'john', email: 'john@example.com', role: Role.SALES_REP }]
      const mockCustomers = {
        data: [{
          id: 'c1',
          name: 'O\'Brien & Co. <script>alert("xss")</script>',
          email: 'obrien@example.com',
          customerNumber: 'C001',
        }],
      }

      ;(apiClient as jest.Mock)
        .mockResolvedValueOnce({ ok: true, data: { data: mockUsers } })
        .mockResolvedValueOnce({ ok: true, data: mockCustomers })

      render(<SalesTeamAssignPage />)

      await waitFor(() => {
        // Special characters should be displayed safely
        expect(screen.getByText(/O'Brien & Co/i)).toBeInTheDocument()
        // Script tag should not execute
        expect(screen.queryByText(/script/i)).not.toBeInTheDocument()
      })
    })
  })
})