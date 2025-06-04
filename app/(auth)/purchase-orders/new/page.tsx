'use client'

import { PageLayout, PageHeader, VStack } from '@/components/design-system'
import { PurchaseOrderForm } from '@/components/purchase-orders/purchase-order-form'

export default function NewPurchaseOrderPage() {
  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title="Create Purchase Order"
          description="Create a new purchase order for procurement"
          centered={false}
        />

        <PurchaseOrderForm />
      </VStack>
    </PageLayout>
  )
}