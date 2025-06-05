'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const InventoryReportsContent = dynamic(
  () => import('./reports-content').catch(() => ({ default: () => <div>Error loading reports</div> })),
  { 
    ssr: false,
    loading: () => <div className="p-4">Loading inventory reports...</div>
  }
)

export default function InventoryReportsPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <InventoryReportsContent />
    </Suspense>
  )
}