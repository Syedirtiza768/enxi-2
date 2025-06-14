'use client'

import React from 'react'
import { PageLayout, PageHeader, PageSection } from '@/components/design-system/layout/PageLayout'
import { VStack } from '@/components/design-system'
import InventoryCharts from '@/components/inventory/charts'
import { TrendingUp, BarChart3, Activity } from 'lucide-react'

export default function InventoryAnalyticsPage(): React.JSX.Element {
  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title="Inventory Analytics"
          description="Comprehensive insights and analytics for your inventory management"
          actions={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Activity className="h-4 w-4" />
                Real-time Data
              </div>
            </div>
          }
          centered={false}
        />
        <PageSection>
          <InventoryCharts className="w-full" />
        </PageSection>
      </VStack>
    </PageLayout>
  )
}