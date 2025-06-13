'use client'

import { useState, useEffect } from 'react'
import { TaxRate, TaxType } from '@/lib/generated/prisma'

interface TaxRateSelectorProps {
  value?: string
  onChange: (taxRateId: string | undefined, taxRate: number) => void
  taxType?: TaxType
  className?: string
  disabled?: boolean
  required?: boolean
  placeholder?: string
}

export function TaxRateSelector({
  value,
  onChange,
  taxType = TaxType.SALES,
  className = '',
  disabled = false,
  required = false,
  placeholder = 'Select tax rate'
}: TaxRateSelectorProps) {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTaxRates()
  }, [taxType])

  const fetchTaxRates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        isActive: 'true',
        taxType: taxType
      })
      
      const response = await fetch(`/api/tax-rates?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setTaxRates(data.data)
      } else {
        setError(data.error || 'Failed to load tax rates')
      }
    } catch (err) {
      setError('Failed to load tax rates')
      console.error('Error fetching tax rates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    const selectedRate = taxRates.find(rate => rate.id === selectedId)
    
    if (selectedId === '') {
      onChange(undefined, 0)
    } else if (selectedRate) {
      onChange(selectedRate.id, selectedRate.rate)
    }
  }

  if (loading) {
    return (
      <select 
        className={`rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${className}`}
        disabled
      >
        <option>Loading...</option>
      </select>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}
      </div>
    )
  }

  // Group tax rates by category
  const groupedRates = taxRates.reduce((acc, rate) => {
    const categoryName = rate.category?.name || 'Other'
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(rate)
    return acc
  }, {} as Record<string, TaxRate[]>)

  return (
    <select
      value={value || ''}
      onChange={handleChange}
      disabled={disabled}
      required={required}
      className={`rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${className}`}
    >
      <option value="">{placeholder}</option>
      {Object.entries(groupedRates).map(([category, rates]) => (
        <optgroup key={category} label={category}>
          {rates.map(rate => (
            <option key={rate.id} value={rate.id}>
              {rate.name} ({rate.rate}%)
              {rate.isDefault && ' (Default)'}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}