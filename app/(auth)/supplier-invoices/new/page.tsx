'use client'

import { useRouter } from 'next/navigation'
import { PageLayout, PageHeader, VStack } from '@/components/design-system'
import { SupplierInvoiceForm } from '@/components/supplier-invoices/supplier-invoice-form'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/design-system'

export default function NewSupplierInvoicePage() {
  const router = useRouter()

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