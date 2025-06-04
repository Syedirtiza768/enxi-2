'use client'

import { useRouter } from 'next/navigation'
import { PageLayout, PageHeader, VStack } from '@/components/design-system'
import { SupplierPaymentForm } from '@/components/supplier-payments/supplier-payment-form'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/design-system'

export default function NewSupplierPaymentPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/supplier-payments')
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title="New Supplier Payment"
          description="Process a payment to a supplier for invoices or prepayments"
          centered={false}
          actions={
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft />}
              onClick={handleCancel}
            >
              Back to Payments
            </Button>
          }
        />

        <SupplierPaymentForm onSuccess={handleSuccess} />
      </VStack>
    </PageLayout>
  )
}