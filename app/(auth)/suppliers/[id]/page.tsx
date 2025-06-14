'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageLayout, PageHeader, VStack, Text, Button } from '@/components/design-system'
import { SupplierForm } from '@/components/suppliers/supplier-form'
import { ArrowLeft, Building2 } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface Supplier {
  id: string
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

export default function SupplierDetailPage() {
  const params = useParams()
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchSupplier(params.id as string)
    }
  }, [params.id])

  const fetchSupplier = async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient<{ data: any[] }>(`/api/suppliers/${id}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch supplier')
      }
      
      setSupplier(response.data)
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    router.push('/suppliers')
  }

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <Building2 className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading supplier...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error || !supplier) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <Building2 className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Error loading supplier</Text>
            <Text color="secondary">{error || 'Supplier not found'}</Text>
          </VStack>
          <Button variant="primary" onClick={() => router.push('/suppliers')}>
            Back to Suppliers
          </Button>
        </VStack>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title={`Edit Supplier: ${supplier.name}`}
          description={`Supplier Code: ${supplier.code}`}
          centered={false}
          actions={
            <Button
              variant="outline"
              leftIcon={<ArrowLeft />}
              onClick={() => router.push('/suppliers')}
            >
              Back to Suppliers
            </Button>
          }
        />

        <SupplierForm supplier={supplier} onSuccess={handleSuccess} />
      </VStack>
    </PageLayout>
  )
}