/**
 * Inventory Module - Core inventory management functionality for Enxi ERP
 */

export interface InventoryItem {
  id: string
  sku: string
  name: string
  description?: string
  category: string
  unit: string
  minimumStock: number
  maximumStock: number
  reorderPoint: number
  reorderQuantity: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StockLevel {
  id: string
  itemId: string
  warehouseId: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  lastUpdated: Date
}

export interface StockMovement {
  id: string
  itemId: string
  warehouseId: string
  type: 'in' | 'out' | 'transfer' | 'adjustment'
  quantity: number
  reference: string
  referenceType: 'purchase_order' | 'sales_order' | 'transfer' | 'adjustment' | 'production'
  date: Date
  notes?: string
  createdBy: string
}

export interface Warehouse {
  id: string
  code: string
  name: string
  address?: string
  isActive: boolean
  isDefault: boolean
}

export interface StockValuation {
  itemId: string
  method: 'FIFO' | 'LIFO' | 'AVERAGE'
  unitCost: number
  totalValue: number
  lastUpdated: Date
}

export interface InventoryCount {
  id: string
  countDate: Date
  warehouseId: string
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled'
  items: InventoryCountItem[]
  createdBy: string
  completedBy?: string
  completedAt?: Date
}

export interface InventoryCountItem {
  id: string
  countId: string
  itemId: string
  expectedQuantity: number
  countedQuantity: number
  variance: number
  notes?: string
}

// Utility functions
export const calculateAvailableStock = (stockLevel: StockLevel): number => {
  return stockLevel.quantityOnHand - stockLevel.quantityReserved
}

export const isStockBelowReorderPoint = (
  item: InventoryItem,
  stockLevel: StockLevel
): boolean => {
  const available = calculateAvailableStock(stockLevel)
  return available <= item.reorderPoint
}

export const calculateStockValue = (
  quantity: number,
  unitCost: number
): number => {
  return quantity * unitCost
}

export const getStockStatus = (
  item: InventoryItem,
  stockLevel: StockLevel
): 'out_of_stock' | 'low_stock' | 'normal' | 'overstock' => {
  const available = calculateAvailableStock(stockLevel)
  
  if (available === 0) return 'out_of_stock'
  if (available <= item.minimumStock) return 'low_stock'
  if (available >= item.maximumStock) return 'overstock'
  return 'normal'
}

export const calculateReorderQuantity = (
  item: InventoryItem,
  currentStock: number
): number => {
  if (currentStock >= item.reorderPoint) return 0
  
  // Calculate quantity needed to reach maximum stock
  const quantityNeeded = item.maximumStock - currentStock
  
  // Round up to reorder quantity multiple
  if (item.reorderQuantity > 0) {
    return Math.ceil(quantityNeeded / item.reorderQuantity) * item.reorderQuantity
  }
  
  return quantityNeeded
}

export const validateStockMovement = (
  movement: StockMovement,
  currentStock: number
): boolean => {
  if (movement.type === 'out' && movement.quantity > currentStock) {
    return false
  }
  return movement.quantity > 0
}

export const calculateInventoryTurnover = (
  costOfGoodsSold: number,
  averageInventoryValue: number
): number => {
  if (averageInventoryValue === 0) return 0
  return costOfGoodsSold / averageInventoryValue
}

export const calculateDaysInventoryOutstanding = (
  inventoryTurnover: number
): number => {
  if (inventoryTurnover === 0) return 0
  return 365 / inventoryTurnover
}

// Export default for compatibility
export default {
  calculateAvailableStock,
  isStockBelowReorderPoint,
  calculateStockValue,
  getStockStatus,
  calculateReorderQuantity,
  validateStockMovement,
  calculateInventoryTurnover,
  calculateDaysInventoryOutstanding
}