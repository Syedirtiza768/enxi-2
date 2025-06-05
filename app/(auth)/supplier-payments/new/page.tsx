'use client'

import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { PageLayout, PageHeader, VStack, Button } from '@/components/design-system'
import { ArrowLeft } from 'lucide-react'

const SupplierPaymentForm = dynamic(
  () => import('@/components/supplier-payments/supplier-payment-form').then(mod => ({ default: mod.SupplierPaymentForm })),
  { 
    ssr: false,
    loading: () => <div className="p-4">Loading form...</div>
  }
)

function NewSupplierPaymentContent() {
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

export default function NewSupplierPaymentPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading supplier payment form...</div>}>
      <NewSupplierPaymentContent />
    </Suspense>
  )
}