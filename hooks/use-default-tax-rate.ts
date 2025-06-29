import { TaxType } from '@/lib/types/shared-enums';
import { useState, useEffect } from 'react'
import { TaxRate } from "@/lib/types/shared-enums"

interface UseDefaultTaxRateOptions {
  taxType?: TaxType
  enabled?: boolean
}

export function useDefaultTaxRate(options: UseDefaultTaxRateOptions = {}): unknown {
  const { taxType = TaxType.SALES, enabled = true } = options
  const [defaultRate, setDefaultRate] = useState<TaxRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (enabled) {
      fetchDefaultTaxRate()
    }
  }, [taxType, enabled])

  const fetchDefaultTaxRate = async (): Promise<void> => {
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