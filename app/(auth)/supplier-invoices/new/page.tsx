'use client'

import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { PageLayout, PageHeader, VStack, Button } from '@/components/design-system'
import { ArrowLeft } from 'lucide-react'

const SupplierInvoiceForm = dynamic(
  () => import('@/components/supplier-invoices/supplier-invoice-form').then(mod => ({ default: mod.SupplierInvoiceForm })),
  { 
    ssr: false,
    loading: () => <div className="p-4">Loading form...</div>
  }
)

function NewSupplierInvoiceContent() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars

  const handleSuccess = () => {
    router.push('/supplier-invoices')
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title="New Supplier Invoice"
          description="Create a new supplier invoice from goods receipts"
          centered={false}
          actions={
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft />}
              onClick={handleCancel}
            >
              Back to Invoices
            </Button>
          }
        />

        <SupplierInvoiceForm onSuccess={handleSuccess} />
      </VStack>
    </PageLayout>
  )
}

export default function NewSupplierInvoicePage() {
  return (
    <Suspense fallback={<div className="p-4">Loading supplier invoice form...</div>}>
      <NewSupplierInvoiceContent />
    </Suspense>
  )
}