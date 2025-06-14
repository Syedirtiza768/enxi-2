'use client'

import { PageLayout, PageHeader, VStack } from '@/components/design-system'
import { GoodsReceiptForm } from '@/components/goods-receipts/goods-receipt-form'

export default function NewGoodsReceiptPage(): React.JSX.Element {
  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title="Create Goods Receipt"
          description="Record the receipt of goods from a purchase order"
          centered={false}
        />

        <GoodsReceiptForm />
      </VStack>
    </PageLayout>
  )
}