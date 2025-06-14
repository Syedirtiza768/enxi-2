'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, Grid3X3, TrendingUp, FileText, BarChart3, PackagePlus, PackageMinus, LineChart } from 'lucide-react'

export function InventoryNav() {
  const pathname = usePathname()

  const navItems = [
    {
      title: 'Overview',
      href: '/inventory',
      icon: BarChart3,
      description: 'Inventory dashboard'
    },
    {
      title: 'Categories',
      href: '/inventory/categories',
      icon: Grid3X3,
      description: 'Manage categories'
    },
    {
      title: 'Items',
      href: '/inventory/items',
      icon: Package,
      description: 'Manage inventory items'
    },
    {
      title: 'Stock In',
      href: '/inventory/stock-in',
      icon: PackagePlus,
      description: 'Record stock receipts'
    },
    {
      title: 'Stock Out',
      href: '/inventory/stock-out',
      icon: PackageMinus,
      description: 'Record stock issues'
    },
    {
      title: 'Movements',
      href: '/inventory/movements',
      icon: TrendingUp,
      description: 'Track all movements'
    },
    {
      title: 'Reports',
      href: '/inventory/reports',
      icon: FileText,
      description: 'Inventory reports'
    },
    {
      title: 'Analytics',
      href: '/inventory/analytics',
      icon: LineChart,
      description: 'Visual analytics dashboard'
    }
  ]

  return (
    <div className="bg-white border-b">
      <div className="px-6">
        <nav className="flex space-x-8 -mb-px">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${isActive 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}