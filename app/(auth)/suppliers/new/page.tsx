'use client'

import { PageLayout, PageHeader, VStack } from '@/components/design-system'
import { SupplierForm } from '@/components/suppliers/supplier-form'

export default function NewSupplierPage() {
  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title="Add New Supplier"
          description="Create a new supplier profile"
          centered={false}
        />

        <SupplierForm />
      </VStack>
    </PageLayout>
  )
}