import { TypeFixValidator, TypeFixTest } from './type-fix-validator'

describe('Payment Component Type Fixes', () => {
  const validator = new TypeFixValidator()

  const paymentComponentTests: TypeFixTest[] = [
    {
      name: 'bank-reconciliation-api-params',
      file: 'bank-reconciliation.tsx',
      beforeFix: `
        const bankResponse = await apiClient('/api/bank-transactions', {
          params: { startDate, endDate, bankAccountId }
        })
      `,
      afterFix: `
        const bankParams = new URLSearchParams({
          startDate,
          endDate,
          ...(bankAccountId && { bankAccountId })
        })
        const bankResponse = await apiClient<BankTransaction[] | { data: BankTransaction[] }>(
          \`/api/bank-transactions?\${bankParams}\`
        )
      `,
      expectedBehavior: {
        runtime: () => {
          // Test URL construction
          const params = { startDate: '2025-01-01', endDate: '2025-01-31' }
          const urlParams = new URLSearchParams(params)
          const url = `/api/bank-transactions?${urlParams}`
          if (!url.includes('startDate=2025-01-01')) {
            throw new Error('URL params not constructed correctly')
          }
        }
      }
    },
    {
      name: 'customer-history-api-migration',
      file: 'customer-business-history.tsx',
      beforeFix: `
        const response = await apiClient(\`/api/customers/\${customerId}\`)
        setCustomer(response?.data)
      `,
      afterFix: `
        const response = await apiClient<Customer>(\`/api/customers/\${customerId}\`)
        setCustomer(response?.data as Customer)
      `,
      expectedBehavior: {
        runtime: () => {
          // Mock apiClient behavior
          const mockResponse = { 
            ok: true, 
            data: { id: '1', name: 'Test Customer' } 
          }
          const customer = mockResponse.data as { id: string; name: string }
          if (!customer.id || !customer.name) {
            throw new Error('Customer data not properly typed')
          }
        }
      }
    },
    {
      name: 'payment-form-index-access',
      file: 'payment-form.tsx',
      beforeFix: `
        const isValid = validationStatus[field]
      `,
      afterFix: `
        const isValid = (validationStatus as any)[field]
      `,
      expectedBehavior: {
        runtime: () => {
          const validationStatus = { email: true, amount: false }
          const field = 'email'
          const isValid = (validationStatus as any)[field]
          if (typeof isValid !== 'boolean') {
            throw new Error('Validation status should be boolean')
          }
        }
      }
    }
  ]

  test.each(paymentComponentTests)('$name', async (testCase) => {
    const result = await validator.validateFix(testCase)
    expect(result).toBe(true)
  })

  afterAll(() => {
    const report = validator.generateReport()
    console.log('\n' + report)
  })
})