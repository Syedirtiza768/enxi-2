'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { VStack, HStack, Input, Textarea, Button, Select, Text, Card, CardContent } from '@/components/design-system'
import { apiClient } from '@/lib/api/client'

interface SupplierFormData {
  code: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  taxId?: string
  paymentTerms?: number
  creditLimit?: number
  currency?: string
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  notes?: string
}

interface SupplierFormProps {
  supplier?: SupplierFormData & { id: string }
  onSuccess?: () => void
}

export function SupplierForm({ supplier, onSuccess }: SupplierFormProps) {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<SupplierFormData>({
    code: supplier?.code || '',
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    city: supplier?.city || '',
    state: supplier?.state || '',
    country: supplier?.country || 'USA',
    postalCode: supplier?.postalCode || '',
    taxId: supplier?.taxId || '',
    paymentTerms: supplier?.paymentTerms || 30,
    creditLimit: supplier?.creditLimit || 0,
    currency: supplier?.currency || 'USD',
    status: supplier?.status || 'ACTIVE',
    notes: supplier?.notes || ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'paymentTerms' || name === 'creditLimit' ? 
        (value ? parseFloat(value) : 0) : 
        value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers'
      const method = supplier ? 'PUT' : 'POST'

      const response = await apiClient(url, {
        method,
        body: formData
      })

      if (response.ok) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/suppliers')
        }
      } else {
        throw new Error(response.data?.error || 'Failed to save supplier')
      }
    } catch (err) {
      console.error('Error saving supplier:', err)
      setError(err instanceof Error ? err.message : 'Failed to save supplier')
    } finally {
      setLoading(false)
    }
  }

  const generateSupplierCode = () => {
    const prefix = 'SUP'
    const timestamp = Date.now().toString().slice(-6)
    setFormData(prev => ({ ...prev, code: `${prefix}-${timestamp}` }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap="xl">
        {error && (
          <Card variant="elevated" className="border-[var(--color-semantic-error-200)] bg-[var(--color-semantic-error-50)]">
            <CardContent>
              <Text color="error">{error}</Text>
            </CardContent>
          </Card>
        )}

        {/* Basic Information */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Basic Information</Text>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Supplier Code *
                  </label>
                  <HStack gap="sm">
                    <Input
                      name="code"
                      value={formData.code}
                      onChange={handleChange}
                      placeholder="SUP-001"
                      required
                      fullWidth
                    />
                    {!supplier && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateSupplierCode}
                      >
                        Generate
                      </Button>
                    )}
                  </HStack>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Supplier Name *
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="ABC Suppliers Ltd."
                    required
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contact Person
                  </label>
                  <Input
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="John Smith"
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INACTIVE', label: 'Inactive' },
                      { value: 'BLOCKED', label: 'Blocked' }
                    ]}
                    fullWidth
                  />
                </div>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Contact Information</Text>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="supplier@example.com"
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone
                  </label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 234 567 8900"
                    fullWidth
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Address
                  </label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Main Street"
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    City
                  </label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="New York"
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    State/Province
                  </label>
                  <Input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="NY"
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Country
                  </label>
                  <Input
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="USA"
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Postal Code
                  </label>
                  <Input
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="10001"
                    fullWidth
                  />
                </div>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Financial Information</Text>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tax ID
                  </label>
                  <Input
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    placeholder="XX-XXXXXXX"
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Currency
                  </label>
                  <Select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    options={[
                      { value: 'USD', label: 'USD - US Dollar' },
                      { value: 'EUR', label: 'EUR - Euro' },
                      { value: 'GBP', label: 'GBP - British Pound' },
                      { value: 'CAD', label: 'CAD - Canadian Dollar' }
                    ]}
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Payment Terms (days)
                  </label>
                  <Input
                    type="number"
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    placeholder="30"
                    min="0"
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Credit Limit
                  </label>
                  <Input
                    type="number"
                    name="creditLimit"
                    value={formData.creditLimit}
                    onChange={handleChange}
                    placeholder="10000"
                    min="0"
                    step="0.01"
                    fullWidth
                  />
                </div>
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card variant="elevated">
          <CardContent>
            <VStack gap="lg">
              <Text size="lg" weight="semibold">Additional Information</Text>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes
                </label>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes about this supplier..."
                  rows={4}
                  fullWidth
                />
              </div>
            </VStack>
          </CardContent>
        </Card>

        {/* Actions */}
        <HStack gap="md" justify="end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/suppliers')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : supplier ? 'Update Supplier' : 'Create Supplier'}
          </Button>
        </HStack>
      </VStack>
    </form>
  )
}