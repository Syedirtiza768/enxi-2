import React from 'react'
import { InventoryNav } from '@/components/inventory/inventory-nav'

interface InventoryLayoutProps {
  children: React.ReactNode
}

export default function InventoryLayout({ children }: InventoryLayoutProps) {
  return (
    <div className="flex flex-col space-y-6">
      <InventoryNav />
      {/* Page content */}
      <div className="px-6 pb-6">
        {children}
      </div>
    </div>
  )
}