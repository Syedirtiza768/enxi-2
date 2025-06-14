'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  DollarSign,
  BarChart3,
  ArrowRight,
  Grid3X3
} from 'lucide-react'

interface InventoryStats {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  categories: number
  recentMovements: number
}

export default function InventoryPage(): React.JSX.Element {
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    categories: 0,
    recentMovements: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch inventory statistics
    const fetchStats = async (): Promise<void> => {
      try {
        // For now, using mock data until APIs are implemented
        setStats({
          totalItems: 0,
          totalValue: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          categories: 0,
          recentMovements: 0
        })
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const quickActions = [
    {
      title: 'Manage Categories',
      description: 'Organize inventory items into categories',
      href: '/inventory/categories',
      icon: Grid3X3,
      color: 'blue'
    },
    {
      title: 'Add New Item',
      description: 'Create a new inventory item',
      href: '/inventory/items/new',
      icon: Package,
      color: 'green'
    },
    {
      title: 'Record Stock Movement',
      description: 'Record stock in or out',
      href: '/inventory/movements/new',
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: 'View Reports',
      description: 'Analyze inventory data',
      href: '/inventory/reports',
      icon: BarChart3,
      color: 'orange'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track and manage your inventory items, stock levels, and movements
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-semibold mt-1">{stats.totalItems}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-semibold mt-1">
                ${stats.totalValue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-semibold mt-1 text-yellow-600">
                {stats.lowStockItems}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-semibold mt-1 text-red-600">
                {stats.outOfStockItems}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="bg-white p-6 rounded-lg border hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-4">
                  <Icon className={`h-8 w-8 text-${action.color}-600`} />
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">Getting Started with Inventory</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>
            <Link href="/inventory/categories" className="underline hover:no-underline">
              Set up categories
            </Link> to organize your inventory items
          </li>
          <li>
            <Link href="/inventory/items/new" className="underline hover:no-underline">
              Add inventory items
            </Link> with SKUs, descriptions, and pricing
          </li>
          <li>Record initial stock levels for each item</li>
          <li>Track stock movements as items are received or sold</li>
          <li>Monitor low stock alerts and reorder when needed</li>
        </ol>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-medium text-gray-900 mb-3">Inventory Features</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              FIFO costing method for accurate valuation
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Automatic low stock alerts
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Batch and lot tracking support
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Integration with sales and purchasing
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-medium text-gray-900 mb-3">Recent Activity</h3>
          {stats.recentMovements === 0 ? (
            <p className="text-sm text-gray-500">No recent inventory movements</p>
          ) : (
            <p className="text-sm text-gray-600">
              {stats.recentMovements} movements in the last 7 days
            </p>
          )}
          <Link
            href="/inventory/movements"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mt-2"
          >
            View all movements
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}