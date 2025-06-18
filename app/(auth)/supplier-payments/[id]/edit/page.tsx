'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PageLayout, PageHeader, VStack, Text, Button } from '@/components/design-system'
import { SupplierPaymentForm } from '@/components/supplier-payments/supplier-payment-form'
import { ArrowLeft, CreditCard, AlertTriangle } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface SupplierPaymentFormData {
  id: string
  supplierId: string
  supplierInvoiceId?: string
  amount: number
  paymentDate: string
  paymentMethod: 'BANK_TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'CASH' | 'WIRE_TRANSFER'
  reference?: string
  notes?: string
  currency: string
  exchangeRate?: number
  bankAccountId: string
}

export default function EditSupplierPaymentPage() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const params = useParams()
  const paymentId = params.id as string

  const [payment, setPayment] = useState<SupplierPaymentFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (paymentId) {
      fetchPayment()
    }
  }, [fetchPayment, paymentId])

  const fetchPayment = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient<{ data: any[] }>(`/api/supplier-payments/${paymentId}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch supplier payment')
      }
      
      const paymentData = response?.data
      
      // Transform the data for the form
      const formData: SupplierPaymentFormData = {
        id: paymentData.id,
        supplierId: paymentData.supplierId,
        supplierInvoiceId: paymentData.supplierInvoiceId,
        amount: paymentData.amount,
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
        reference: paymentData.reference,
        notes: paymentData.notes,
        currency: paymentData.currency,
        exchangeRate: paymentData.exchangeRate,
        bankAccountId: paymentData.bankAccountId || ''
      }
      
      setPayment(formData)
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  const handleSuccess = () => {
    router.push(`/supplier-payments/${paymentId}`)
  }

  const handleCancel = () => {
    router.push(`/supplier-payments/${paymentId}`)
  }

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <CreditCard className="h-8 w-8 animate-pulse text-[var(--color-brand-primary-600)]" />
          <Text color="secondary">Loading supplier payment...</Text>
        </VStack>
      </PageLayout>
    )
  }

  if (error || !payment) {
    return (
      <PageLayout>
        <VStack gap="lg" align="center" className="py-12">
          <AlertTriangle className="h-12 w-12 text-[var(--color-semantic-error-600)]" />
          <VStack gap="sm" align="center">
            <Text size="lg" weight="semibold">Cannot edit supplier payment</Text>
            <Text color="secondary">{error || 'Supplier payment not found or not editable'}</Text>
          </VStack>
          <VStack gap="sm">
            <Button variant="primary" onClick={() => router.push(`/supplier-payments/${paymentId}`)}>
              View Payment
            </Button>
            <Button variant="ghost" onClick={() => router.push('/supplier-payments')}>
              Back to Payments
            </Button>
          </VStack>
        </VStack>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title={`Edit Payment ${payment.id.slice(-8)}`}
          description="Update payment reference, notes, and method details"
          centered={false}
          actions={
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft />}
              onClick={handleCancel}
            >
              Back to Payment
            </Button>
          }
        />

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <VStack gap="xs">
            <Text size="sm" weight="medium" className="text-yellow-800">
              Edit Limitations
            </Text>
            <Text size="sm" className="text-yellow-700">
              For security and audit purposes, payment amounts, dates, and supplier information cannot be modified. 
              You can only update the reference, notes, and payment method.
            </Text>
          </VStack>
        </div>

        <SupplierPaymentForm 
          supplierPayment={payment}
          onSuccess={handleSuccess} 
        />
      </VStack>
    </PageLayout>
  )
}