'use client'

import { PageLayout, PageHeader, VStack } from '@/components/design-system'
import { ThreeWayMatchingDashboard } from '@/components/three-way-matching/three-way-matching-dashboard'

export default function ThreeWayMatchingPage() {
  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title="Three-Way Matching"
          description="Monitor and manage procurement document matching exceptions"
          centered={false}
        />

        <ThreeWayMatchingDashboard />
      </VStack>
    </PageLayout>
  )
}