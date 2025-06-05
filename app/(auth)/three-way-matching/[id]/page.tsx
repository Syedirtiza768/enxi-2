'use client'

import { useRouter, useParams } from 'next/navigation'
import { PageLayout, PageHeader, VStack, Button } from '@/components/design-system'
import { ThreeWayMatchingDetail } from '@/components/three-way-matching/three-way-matching-detail'
import { ArrowLeft } from 'lucide-react'

export default function ThreeWayMatchingDetailPage() {
  const router = useRouter() // eslint-disable-line @typescript-eslint/no-unused-vars
  const params = useParams()
  const purchaseOrderId = params.id as string

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title="Three-Way Matching Analysis"
          description="Detailed analysis of purchase order, goods receipt, and invoice matching"
          centered={false}
          actions={
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft />}
              onClick={() => router.push('/three-way-matching')}
            >
              Back to Dashboard
            </Button>
          }
        />

        <ThreeWayMatchingDetail purchaseOrderId={purchaseOrderId} />
      </VStack>
    </PageLayout>
  )
}