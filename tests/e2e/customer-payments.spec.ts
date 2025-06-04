import { test, expect } from '@playwright/test'

test.describe('Customer Payments E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent test data
    await page.route('**/api/customers/customer-e2e', async route => {
      await route.fulfill({
        json: {
          id: 'customer-e2e',
          name: 'E2E Test Customer',
          email: 'e2e@customer.com',
          phone: '+1-555-0199',
          createdAt: '2023-06-01',
          creditLimit: 20000,
          currentBalance: 5500.75,
          industry: 'E-commerce',
          leadSource: 'WEBSITE',
        }
      })
    })

    await page.route('**/api/customers/customer-e2e/transactions', async route => {
      await route.fulfill({
        json: [
          {
            id: 'txn-e2e-3',
            type: 'invoice',
            date: '2024-05-30',
            reference: 'INV-E2E-003',
            description: 'E-commerce Platform Development',
            debit: 3000.00,
            credit: 0,
            balance: 5500.75,
          },
          {
            id: 'txn-e2e-2',
            type: 'payment',
            date: '2024-05-25',
            reference: 'PAY-E2E-002',
            description: 'Payment for INV-E2E-002',
            debit: 0,
            credit: 2000.00,
            balance: 2500.75,
          },
          {
            id: 'txn-e2e-1',
            type: 'invoice',
            date: '2024-05-20',
            reference: 'INV-E2E-002',
            description: 'Monthly Maintenance',
            debit: 2000.00,
            credit: 0,
            balance: 4500.75,
          },
        ]
      })
    })

    await page.route('**/api/customers/customer-e2e/business-metrics', async route => {
      await route.fulfill({
        json: {
          totalRevenue: 85000.00,
          totalInvoices: 32,
          totalPayments: 28,
          averagePaymentDays: 15,
          creditUtilization: 0.275, // 27.5%
          relationshipMonths: 18,
          lastPaymentDate: '2024-05-25',
          lastInvoiceDate: '2024-05-30',
          paymentReliability: 0.92, // 92%
        }
      })
    })

    await page.route('**/api/customers/customer-e2e/activity-timeline', async route => {
      await route.fulfill({
        json: [
          {
            id: 1,
            type: 'invoice_created',
            date: '2024-05-30',
            description: 'Invoice INV-E2E-003 created for $3,000.00',
            amount: 3000.00,
            status: 'pending',
          },
          {
            id: 2,
            type: 'payment_received',
            date: '2024-05-25',
            description: 'Payment received for INV-E2E-002',
            amount: 2000.00,
            status: 'completed',
          },
        ]
      })
    })

    await page.route('**/api/customers/customer-e2e/payment-trends', async route => {
      await route.fulfill({
        json: {
          monthlyData: [
            { month: '2024-01', revenue: 5500, invoices: 3, avgDays: 12 },
            { month: '2024-02', revenue: 4200, invoices: 2, avgDays: 18 },
            { month: '2024-03', revenue: 6800, invoices: 4, avgDays: 10 },
            { month: '2024-04', revenue: 3100, invoices: 2, avgDays: 22 },
            { month: '2024-05', revenue: 3000, invoices: 1, avgDays: 15 },
          ],
          agingBreakdown: {
            current: 3000.00,
            days30: 1500.75,
            days60: 1000.00,
            days90Plus: 0,
          },
        }
      })
    })

    // Mock payment creation
    await page.route('**/api/invoices/*/payments', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: { id: 'payment-new-e2e', status: 'success' }
        })
      }
    })
  })

  test('should navigate through customer payments workflow', async ({ page }) => {
    // Navigate to customer ledger page
    await page.goto('/customers/customer-e2e')
    
    // Verify customer information is displayed
    await expect(page.getByText('E2E Test Customer')).toBeVisible()
    await expect(page.getByText('e2e@customer.com')).toBeVisible()
    
    // Navigate to customer ledger (assuming there's a link/button)
    await page.click('text=View Ledger')
    
    // Wait for ledger page to load
    await expect(page.getByText('Customer Ledger')).toBeVisible()
    
    // Verify customer summary information
    await expect(page.getByText('E2E Test Customer')).toBeVisible()
    await expect(page.getByText('$5,500.75')).toBeVisible() // Current balance
    await expect(page.getByText('$20,000.00')).toBeVisible() // Credit limit
    await expect(page.getByText('$14,499.25')).toBeVisible() // Available credit
    
    // Verify transaction history is displayed
    await expect(page.getByText('Transaction History')).toBeVisible()
    await expect(page.getByText('INV-E2E-003')).toBeVisible()
    await expect(page.getByText('E-commerce Platform Development')).toBeVisible()
    await expect(page.getByText('PAY-E2E-002')).toBeVisible()
    
    // Test transaction filtering
    await page.selectOption('select', 'payment')
    await expect(page.getByText('PAY-E2E-002')).toBeVisible()
    
    // Reset filter
    await page.selectOption('select', '')
    await expect(page.getByText('INV-E2E-003')).toBeVisible()
  })

  test('should complete payment recording workflow', async ({ page }) => {
    await page.goto('/customers/customer-e2e')
    
    // Navigate to ledger
    await page.click('text=View Ledger')
    await expect(page.getByText('Customer Ledger')).toBeVisible()
    
    // Click record payment button
    await page.click('button:has-text("Record Payment")')
    
    // Verify payment form is displayed
    await expect(page.getByText('Record New Payment')).toBeVisible()
    
    // Fill out payment form
    await page.fill('input[name="amount"]', '1500.00')
    await page.selectOption('select[name="paymentMethod"]', 'bank_transfer')
    await page.fill('textarea[name="description"]', 'E2E Test Payment')
    
    // Submit payment form
    await page.click('button:has-text("Record Payment")')
    
    // Verify success (assuming the form closes and returns to ledger)
    await expect(page.getByText('Customer Ledger')).toBeVisible()
    await expect(page.getByText('Record New Payment')).not.toBeVisible()
  })

  test('should display business history and metrics', async ({ page }) => {
    await page.goto('/customers/customer-e2e')
    
    // Navigate to business history (assuming there's a link/button)
    await page.click('text=Business History')
    
    // Wait for business history page to load
    await expect(page.getByText('Customer Business History')).toBeVisible()
    
    // Verify customer overview
    await expect(page.getByText('E2E Test Customer')).toBeVisible()
    await expect(page.getByText('e2e@customer.com')).toBeVisible()
    await expect(page.getByText('E-commerce')).toBeVisible()
    
    // Verify business metrics
    await expect(page.getByText('$85,000.00')).toBeVisible() // Total revenue
    await expect(page.getByText('32')).toBeVisible() // Total invoices
    await expect(page.getByText('15 days')).toBeVisible() // Average payment days
    await expect(page.getByText('18 months')).toBeVisible() // Relationship duration
    
    // Verify risk assessment
    await expect(page.getByText('Risk Assessment')).toBeVisible()
    await expect(page.getByText('Low Risk')).toBeVisible() // Based on 92% reliability and 27.5% utilization
    await expect(page.getByText('Excellent')).toBeVisible() // Based on 15 day average
    
    // Verify activity timeline
    await expect(page.getByText('Recent Activity')).toBeVisible()
    await expect(page.getByText('Invoice INV-E2E-003 created for $3,000.00')).toBeVisible()
    await expect(page.getByText('Payment received for INV-E2E-002')).toBeVisible()
    
    // Verify revenue trends
    await expect(page.getByText('Revenue Trends')).toBeVisible()
    await expect(page.getByText('Monthly Performance')).toBeVisible()
    
    // Verify aging analysis
    await expect(page.getByText('Aging Analysis')).toBeVisible()
    await expect(page.getByText('Current')).toBeVisible()
    await expect(page.getByText('$3,000.00')).toBeVisible() // Current aging amount
    
    // Test action buttons
    await expect(page.getByRole('button', { name: 'View Ledger' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Record Payment' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Invoice' })).toBeVisible()
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/customers/customer-error', async route => {
      await route.abort('failed')
    })

    await page.goto('/customers/customer-error')
    
    // Navigate to ledger
    await page.click('text=View Ledger')
    
    // Should show error message
    await expect(page.getByText(/error loading/i)).toBeVisible()
    
    // Component should not crash
    await expect(page.getByText('Customer Ledger')).toBeVisible()
  })

  test('should validate payment form inputs', async ({ page }) => {
    await page.goto('/customers/customer-e2e')
    
    // Navigate to ledger and open payment form
    await page.click('text=View Ledger')
    await page.click('button:has-text("Record Payment")')
    
    // Try to submit empty form
    await page.click('button:has-text("Record Payment")')
    
    // Should show validation errors
    await expect(page.getByText('Amount is required')).toBeVisible()
    await expect(page.getByText('Payment method is required')).toBeVisible()
    
    // Test invalid amount
    await page.fill('input[name="amount"]', '0')
    await page.click('button:has-text("Record Payment")')
    await expect(page.getByText('Amount must be positive')).toBeVisible()
    
    // Test amount exceeding balance
    await page.fill('input[name="amount"]', '10000')
    await page.click('button:has-text("Record Payment")')
    await expect(page.getByText('Amount cannot exceed balance')).toBeVisible()
    
    // Test valid form submission
    await page.fill('input[name="amount"]', '1000.00')
    await page.selectOption('select[name="paymentMethod"]', 'cash')
    await page.click('button:has-text("Record Payment")')
    
    // Should succeed and return to ledger
    await expect(page.getByText('Customer Ledger')).toBeVisible()
  })

  test('should maintain data consistency across components', async ({ page }) => {
    await page.goto('/customers/customer-e2e')
    
    // Check customer balance in ledger
    await page.click('text=View Ledger')
    await expect(page.getByText('$5,500.75')).toBeVisible()
    
    // Switch to business history
    await page.click('text=Business History')
    await expect(page.getByText('E2E Test Customer')).toBeVisible()
    
    // Customer information should be consistent
    await expect(page.getByText('e2e@customer.com')).toBeVisible()
    await expect(page.getByText('E-commerce')).toBeVisible()
    
    // Switch back to ledger
    await page.click('text=View Ledger')
    await expect(page.getByText('$5,500.75')).toBeVisible()
    
    // Data should remain consistent
    await expect(page.getByText('E2E Test Customer')).toBeVisible()
  })

  test('should support keyboard navigation and accessibility', async ({ page }) => {
    await page.goto('/customers/customer-e2e')
    
    // Navigate to ledger
    await page.click('text=View Ledger')
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Record payment button should be focusable
    await page.keyboard.press('Enter')
    await expect(page.getByText('Record New Payment')).toBeVisible()
    
    // Test form navigation
    await page.keyboard.press('Tab') // Amount field
    await page.keyboard.type('500.00')
    
    await page.keyboard.press('Tab') // Payment method
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    
    // Cancel form with keyboard
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter') // Cancel button
    
    await expect(page.getByText('Customer Ledger')).toBeVisible()
  })
})