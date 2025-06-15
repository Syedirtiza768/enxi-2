import React from 'react'
import { render, screen } from '@testing-library/react'
import { CurrencyProvider, useCurrencyFormatter } from '@/lib/contexts/currency-context'

// Test component that uses the currency formatter
function TestComponent() {
  const { format: format } = useCurrencyFormatter()
  
  return (
    <div>
      <span data-testid="formatted-amount">{format(1000)}</span>
    </div>
  )
}

describe('Currency Formatter', () => {
  it('should format currency without errors', () => {
    render(
      <CurrencyProvider>
        <TestComponent />
      </CurrencyProvider>
    )
    
    const formattedAmount = screen.getByTestId('formatted-amount')
    expect(formattedAmount).toBeInTheDocument()
    expect(formattedAmount.textContent).toBeTruthy()
    expect(typeof formattedAmount.textContent).toBe('string')
  })
  
  it('should handle the destructuring pattern correctly', () => {
    const TestDestructuring = () => {
      const { format: formatter } = useCurrencyFormatter()
      
      // This should work
      const { format } = formatter
      
      // This would fail (the bug we fixed)
      // const format = formatter // ❌ Wrong
      
      return <div>{format(500)}</div>
    }
    
    expect(() => {
      render(
        <CurrencyProvider>
          <TestDestructuring />
        </CurrencyProvider>
      )
    }).not.toThrow()
  })
})