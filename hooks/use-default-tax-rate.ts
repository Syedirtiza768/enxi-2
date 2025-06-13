import { useState, useEffect } from 'react'
import { TaxRate, TaxType } from '@/lib/generated/prisma'

interface UseDefaultTaxRateOptions {
  taxType?: TaxType
  enabled?: boolean
}

export function useDefaultTaxRate(options: UseDefaultTaxRateOptions = {}) {
  const { taxType = TaxType.SALES, enabled = true } = options
  const [defaultRate, setDefaultRate] = useState<TaxRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (enabled) {
      fetchDefaultTaxRate()
    }
  }, [taxType, enabled])

  const fetchDefaultTaxRate = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({ taxType })
      const response = await fetch(`/api/tax-rates/default?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setDefaultRate(data.data)
      } else {
        setError(data.error || 'Failed to load default tax rate')
      }
    } catch (err) {
      setError('Failed to load default tax rate')
      console.error('Error fetching default tax rate:', err)
    } finally {
      setLoading(false)
    }
  }

  return {
    defaultRate,
    loading,
    error,
    refetch: fetchDefaultTaxRate
  }
}