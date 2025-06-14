// Mock data generators for inventory analytics when real data is insufficient

import { format, subDays } from 'date-fns'

export function generateMockStockLevels(count: number = 10): unknown {
  const categories = ['Electronics', 'Raw Materials', 'Finished Goods', 'Consumables', 'Tools']
  
  return Array.from({ length: count }, (_, i) => ({
    name: `Item ${i + 1}`,
    currentStock: Math.floor(Math.random() * 1000) + 10,
    minStock: Math.floor(Math.random() * 50) + 5,
    maxStock: Math.floor(Math.random() * 500) + 100,
    reorderPoint: Math.floor(Math.random() * 100) + 20,
    category: categories[Math.floor(Math.random() * categories.length)],
    value: Math.floor(Math.random() * 50000) + 1000
  }))
}

export function generateMockLowStockAlerts(count: number = 15): unknown {
  const statuses: ('critical' | 'warning' | 'ok')[] = ['critical', 'warning', 'ok']
  
  return Array.from({ length: count }, (_, i) => ({
    name: `Item ${i + 1}`,
    value: Math.floor(Math.random() * 100),
    status: statuses[Math.floor(Math.random() * statuses.length)]
  }))
}

export function generateMockInventoryValue(): unknown {
  const categories = [
    'Electronics',
    'Raw Materials', 
    'Finished Goods',
    'Consumables',
    'Tools',
    'Packaging'
  ]
  
  const total = 500000 // Total inventory value
  let remaining = total
  
  return categories.map((category, index) => {
    const isLast = index === categories.length - 1
    const value = isLast ? remaining : Math.floor(Math.random() * remaining * 0.4) + 1000
    remaining -= value
    
    return {
      category,
      value,
      percentage: (value / total) * 100,
      items: Math.floor(Math.random() * 50) + 5
    }
  }).filter(item => item.value > 0)
}

export function generateMockStockMovements(days: number = 30): unknown {
  return Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - i - 1)
    const inbound = Math.floor(Math.random() * 200) + 50
    const outbound = Math.floor(Math.random() * 150) + 30
    
    return {
      date: format(date, 'MMM dd'),
      inbound,
      outbound,
      net: inbound - outbound
    }
  })
}

export function generateMockCategoryData(): unknown {
  const categories = [
    'Electronics',
    'Raw Materials',
    'Finished Goods', 
    'Consumables',
    'Tools',
    'Packaging',
    'Safety Equipment'
  ]
  
  return categories.map(category => ({
    category,
    quantity: Math.floor(Math.random() * 5000) + 100,
    value: Math.floor(Math.random() * 100000) + 5000,
    items: Math.floor(Math.random() * 50) + 5
  }))
}

export function generateMockABCAnalysis(count: number = 20): unknown {
  const classifications: ('A' | 'B' | 'C')[] = ['A', 'B', 'C']
  
  return Array.from({ length: count }, (_, i) => ({
    item: `Product ${i + 1}`,
    value: Math.floor(Math.random() * 50000) + 1000,
    volume: Math.floor(Math.random() * 1000) + 10,
    classification: classifications[Math.floor(Math.random() * classifications.length)]
  }))
}

export function generateMockBusinessMetrics(): unknown {
  return {
    totalInventoryValue: 750000,
    itemsBelowReorderPoint: 23,
    fastMovingItems: 45,
    slowMovingItems: 67,
    stockTurnoverRate: 4.2,
    wasteValue: 12500,
    totalItems: 234,
    activeItems: 210
  }
}