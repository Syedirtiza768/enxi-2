'use client'

import React, { useState, useEffect } from 'react'
import { 
  AlertCircle, CheckCircle, Clock, TrendingDown, RefreshCw, 
  FileCode, Activity, Package, AlertTriangle, BarChart3,
  GitBranch, Zap, Database
} from 'lucide-react'

interface SystemStats {
  typeErrors: {
    current: {
      total: number
      byPriority: Record<string, number>
      fixed: number
      remaining: number
      progressPercentage: number
    }
    build: {
      success: boolean
      lastBuildTime: string | null
      ignoringErrors: boolean
    }
    topErrorTypes: Array<{
      code: string
      count: number
      description: string
    }>
    problemDirs: Array<{
      dir: string
      count: number
    }>
    trend: Array<{
      date: string
      errors: number
      fixed: number
    }>
  }
  performance: {
    buildTime: number
    bundleSize: number
    apiLatency: Record<string, number>
  }
  health: {
    database: 'healthy' | 'degraded' | 'down'
    api: 'healthy' | 'degraded' | 'down'
    cache: 'healthy' | 'degraded' | 'down'
  }
}

export default function SystemMonitoringDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'performance' | 'health'>('overview')

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch type error stats
      const typeErrorResponse = await fetch('/api/system/type-errors/stats')
      const typeErrors = await typeErrorResponse.json()
      
      // Mock other stats for now
      const mockStats: SystemStats = {
        typeErrors,
        performance: {
          buildTime: 216, // 3.6 minutes in seconds
          bundleSize: 779, // KB
          apiLatency: {
            avg: 45,
            p95: 120,
            p99: 250
          }
        },
        health: {
          database: 'healthy',
          api: 'healthy',
          cache: 'healthy'
        }
      }
      
      setStats(mockStats)
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Failed to load system statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Refresh every minute
    const interval = setInterval(fetchStats, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-500">{error || 'No data available'}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Retry
        </button>
      </div>
    )
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Type Errors</p>
              <p className="text-2xl font-bold">{stats.typeErrors.current.total}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.typeErrors.current.fixed} fixed
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Build Status</p>
              <p className="text-2xl font-bold">
                {stats.typeErrors.build.success ? 'Passing' : 'Failing'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.typeErrors.build.ignoringErrors ? 'With suppressed errors' : 'Clean'}
              </p>
            </div>
            <Package className={`h-8 w-8 ${stats.typeErrors.build.success ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">API Health</p>
              <p className="text-2xl font-bold capitalize">{stats.health.api}</p>
              <p className="text-xs text-gray-500 mt-1">
                Avg: {stats.performance.apiLatency.avg}ms
              </p>
            </div>
            <Activity className={`h-8 w-8 ${getHealthColor(stats.health.api)}`} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-2xl font-bold">{stats.typeErrors.current.progressPercentage}%</p>
              <p className="text-xs text-gray-500 mt-1">
                Errors fixed
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Type Error Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Type Error Trend</h3>
        <div className="h-64 flex items-end space-x-2">
          {stats.typeErrors.trend.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gray-200 rounded-t relative" style={{ height: '200px' }}>
                <div 
                  className="absolute bottom-0 w-full bg-red-400 rounded-t transition-all"
                  style={{ height: `${(day.errors / 2365) * 100}%` }}
                />
                <div 
                  className="absolute bottom-0 w-full bg-green-400 rounded-t transition-all"
                  style={{ height: `${(day.fixed / 2365) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 mt-2">
                {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-400 rounded" />
            <span className="text-sm text-gray-600">Remaining</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded" />
            <span className="text-sm text-gray-600">Fixed</span>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">System Health</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <Database className={`h-8 w-8 mx-auto mb-2 ${getHealthColor(stats.health.database)}`} />
            <p className="font-medium">Database</p>
            <p className={`text-sm capitalize ${getHealthColor(stats.health.database)}`}>
              {stats.health.database}
            </p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <Zap className={`h-8 w-8 mx-auto mb-2 ${getHealthColor(stats.health.api)}`} />
            <p className="font-medium">API</p>
            <p className={`text-sm capitalize ${getHealthColor(stats.health.api)}`}>
              {stats.health.api}
            </p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <GitBranch className={`h-8 w-8 mx-auto mb-2 ${getHealthColor(stats.health.cache)}`} />
            <p className="font-medium">Cache</p>
            <p className={`text-sm capitalize ${getHealthColor(stats.health.cache)}`}>
              {stats.health.cache}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderErrors = () => (
    <div className="space-y-6">
      {/* Error Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Error Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold text-red-600">{stats.typeErrors.current.byPriority.critical || 0}</p>
            <p className="text-sm text-gray-600">Critical</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold text-orange-600">{stats.typeErrors.current.byPriority.high || 0}</p>
            <p className="text-sm text-gray-600">High</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{stats.typeErrors.current.byPriority.medium || 0}</p>
            <p className="text-sm text-gray-600">Medium</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{stats.typeErrors.current.byPriority.low || 0}</p>
            <p className="text-sm text-gray-600">Low</p>
          </div>
        </div>
      </div>

      {/* Top Error Types */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Most Common Error Types</h3>
        <div className="space-y-3">
          {stats.typeErrors.topErrorTypes.map((error, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-mono text-sm font-medium">{error.code}</p>
                <p className="text-sm text-gray-600">{error.description}</p>
              </div>
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">
                {error.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Problem Directories */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Directories with Most Errors</h3>
        <div className="space-y-2">
          {stats.typeErrors.problemDirs.map((dir, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-gray-400" />
                <span className="font-mono text-sm">{dir.dir}/</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${(dir.count / stats.typeErrors.current.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{dir.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Real-time system health and type error tracking
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-8">
          {(['overview', 'errors', 'performance', 'health'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'errors' && renderErrors()}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Build Time</p>
              <p className="text-2xl font-bold">{Math.floor(stats.performance.buildTime / 60)}m {stats.performance.buildTime % 60}s</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bundle Size</p>
              <p className="text-2xl font-bold">{stats.performance.bundleSize} KB</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">API Latency (p95)</p>
              <p className="text-2xl font-bold">{stats.performance.apiLatency.p95}ms</p>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'health' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Detailed Health Status</h3>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className={`h-6 w-6 ${getHealthColor(stats.health.database)}`} />
                  <div>
                    <p className="font-medium">Database Connection</p>
                    <p className="text-sm text-gray-600">PostgreSQL via Prisma</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  stats.health.database === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {stats.health.database}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}