'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, Package, TrendingDown, RefreshCw, Filter, Bell } from 'lucide-react'

interface StockAlert {
  id: string
  itemId: string
  itemCode: string
  itemName: string
  alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRING' | 'EXPIRED'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  currentStock: number
  minStock: number
  maxStock: number
  reorderPoint: number
  unitOfMeasure?: string
  location?: string
  expiryDate?: Date
  daysUntilExpiry?: number
  lastNotified?: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
  notes?: string
}

interface StockAlertsProps {
  onItemClick?: (itemId: string) => void
  onCreatePO?: (itemId: string) => void
}

export function StockAlerts({ onItemClick, onCreatePO }: StockAlertsProps): React.JSX.Element {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [filteredAlerts, setFilteredAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL')
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAlerts()
  }, [])

  useEffect(() => {
    filterAlerts()
  }, [alerts, selectedType, selectedSeverity, showAcknowledged])

  const loadAlerts = async (): Promise<void> => {
    setLoading(true)
    try {
      const response = await fetch('/api/inventory/stock-alerts')
      if (response.ok) {
        const data = await response.json()
        const alertsData = data.alerts || data.data || data || []
        setAlerts(Array.isArray(alertsData) ? alertsData : [])
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshAlerts = async (): Promise<void> => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/inventory/stock-alerts/refresh', {
        method: 'POST'
      })
      if (response.ok) {
        await loadAlerts()
      }
    } catch (error) {
      console.error('Error refreshing alerts:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const filterAlerts = (): void => {
    let filtered = [...alerts]

    if (selectedType !== 'ALL') {
      filtered = filtered.filter(alert => alert.alertType === selectedType)
    }

    if (selectedSeverity !== 'ALL') {
      filtered = filtered.filter(alert => alert.severity === selectedSeverity)
    }

    if (!showAcknowledged) {
      filtered = filtered.filter(alert => !alert.acknowledged)
    }

    // Sort by severity and date
    filtered.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff
      
      // Then by stock level (lower is more urgent)
      if (a.alertType === 'LOW_STOCK' || a.alertType === 'OUT_OF_STOCK') {
        return a.currentStock - b.currentStock
      }
      
      return 0
    })

    setFilteredAlerts(filtered)
  }

  const acknowledgeAlert = async (alertId: string): void => {
    try {
      const response = await fetch(`/api/inventory/stock-alerts/${alertId}/acknowledge`, {
        method: 'POST'
      })
      if (response.ok) {
        setAlerts(prev => 
          prev.map(alert => 
            alert.id === alertId 
              ? { ...alert, acknowledged: true, acknowledgedAt: new Date() }
              : alert
          )
        )
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  const getAlertIcon = (type: string): void => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return <Package className="h-5 w-5" />
      case 'LOW_STOCK':
        return <TrendingDown className="h-5 w-5" />
      case 'OVERSTOCK':
        return <AlertTriangle className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getAlertColor = (severity: string): void => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50'
      case 'HIGH':
        return 'text-orange-600 bg-orange-50'
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50'
      case 'LOW':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getAlertMessage = (alert: StockAlert): void => {
    switch (alert.alertType) {
      case 'OUT_OF_STOCK':
        return `Out of stock at ${alert.location || 'all locations'}`
      case 'LOW_STOCK':
        return `Stock level (${alert.currentStock}) below reorder point (${alert.reorderPoint})`
      case 'OVERSTOCK':
        return `Stock level (${alert.currentStock}) exceeds maximum (${alert.maxStock})`
      case 'EXPIRING':
        return `Expires in ${alert.daysUntilExpiry} days`
      case 'EXPIRED':
        return `Expired ${alert.daysUntilExpiry ? Math.abs(alert.daysUntilExpiry) + ' days ago' : ''}`
      default:
        return 'Stock alert'
    }
  }

  const alertStats = {
    total: alerts.length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length,
    critical: alerts.filter(a => a.severity === 'CRITICAL' && !a.acknowledged).length,
    outOfStock: alerts.filter(a => a.alertType === 'OUT_OF_STOCK' && !a.acknowledged).length
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Stock Alerts</h2>
            <p className="mt-1 text-sm text-gray-600">
              {alertStats.unacknowledged} unacknowledged alerts
              {alertStats.critical > 0 && (
                <span className="ml-2 text-red-600 font-medium">
                  ({alertStats.critical} critical)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={refreshAlerts}
            disabled={refreshing}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Alerts</p>
              <p className="text-2xl font-semibold text-gray-900">{alertStats.total}</p>
            </div>
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Out of Stock</p>
              <p className="text-2xl font-semibold text-red-900">{alertStats.outOfStock}</p>
            </div>
            <Package className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600">Critical Alerts</p>
              <p className="text-2xl font-semibold text-orange-900">{alertStats.critical}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Unacknowledged</p>
              <p className="text-2xl font-semibold text-blue-900">{alertStats.unacknowledged}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-t border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <Filter className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <select
            value={selectedType}
            onChange={(e): void => setSelectedType(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OVERSTOCK">Overstock</option>
            <option value="EXPIRING">Expiring</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e): void => setSelectedSeverity(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(e): void => setShowAcknowledged(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
            />
            <span className="text-gray-700">Show Acknowledged</span>
          </label>
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Loading alerts...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No alerts to display
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`px-6 py-4 hover:bg-gray-50 ${alert.acknowledged ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${getAlertColor(alert.severity)}`}>
                    {getAlertIcon(alert.alertType)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(): void => onItemClick?.(alert.itemId)}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {alert.itemCode} - {alert.itemName}
                      </button>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getAlertColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {getAlertMessage(alert)}
                    </p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Current: {alert.currentStock} {alert.unitOfMeasure}</span>
                      {alert.reorderPoint > 0 && (
                        <span>Reorder: {alert.reorderPoint}</span>
                      )}
                      {alert.location && (
                        <span>Location: {alert.location}</span>
                      )}
                    </div>
                    {alert.acknowledged && alert.acknowledgedAt && (
                      <p className="mt-1 text-xs text-gray-500">
                        Acknowledged by {alert.acknowledgedBy} on {new Date(alert.acknowledgedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!alert.acknowledged && (
                    <>
                      <button
                        onClick={(): void => acknowledgeAlert(alert.id)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Acknowledge
                      </button>
                      {alert.alertType === 'LOW_STOCK' && onCreatePO && (
                        <button
                          onClick={(): void => onCreatePO(alert.itemId)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Create PO
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}