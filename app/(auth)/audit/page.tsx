'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditLogViewer } from '@/components/audit/audit-log-viewer'
import { 
  useAuditStats, 
  useAuditCompliance, 
  useSecurityAudit 
} from '@/lib/hooks/use-audit'
import { 
  Shield, 
  Activity, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  Download,
  Eye,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react'
import { format, subDays, subMonths } from 'date-fns'

export default function AuditDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  
  // Get current date ranges
  const now = new Date()
  const startDate = selectedPeriod === 'week' 
    ? subDays(now, 7)
    : selectedPeriod === 'month'
    ? subMonths(now, 1)
    : subMonths(now, 12)

  // Hooks for different audit data
  const { stats, loading: statsLoading } = useAuditStats({
    period: selectedPeriod as 'day' | 'week' | 'month' | 'year',
    groupBy: 'action',
    startDate,
    endDate: now
  })

  const { 
    report: complianceReport, 
    loading: complianceLoading, 
    generateReport 
  } = useAuditCompliance()

  const { 
    securityEvents, 
    loading: securityLoading, 
    fetchSecurityEvents 
  } = useSecurityAudit()

  React.useEffect(() => {
    fetchSecurityEvents(startDate, now)
  }, [selectedPeriod])

  React.useEffect(() => {
    if (!complianceReport) {
      generateReport({
        startDate,
        endDate: now,
        includeFailedActions: true,
        includeSecurityEvents: true
      })
    }
  }, [selectedPeriod])

  // Stats calculations
  const totalLogs = stats?.totalLogs || 0
  const actionBreakdown = stats?.breakdown || {}
  const criticalEvents = securityEvents?.filter(event => 
    ['SECURITY_VIOLATION', 'LOGIN_FAILED', 'PERMISSION_REVOKED'].includes(event.action)
  )?.length || 0

  // Quick stats data
  const quickStats = [
    {
      title: 'Total Audit Logs',
      value: totalLogs.toLocaleString(),
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Security Events',
      value: securityEvents?.length || 0,
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Critical Events',
      value: criticalEvents,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Unique Users',
      value: complianceReport?.summary?.uniqueUsers || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ]

  const handleExportCompliance = async (): Promise<unknown> => {
    if (!complianceReport) return
    
    const blob = new Blob([JSON.stringify(complianceReport, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `compliance-report-${format(now, 'yyyy-MM-dd')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Audit Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitor system activity, security events, and compliance
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Period Selector */}
          <div className="flex rounded-lg border">
            {['week', 'month', 'year'].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className={`${selectedPeriod === period ? '' : 'border-0'}`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
          
          <Button onClick={handleExportCompliance} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Action Breakdown</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          
          {statsLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Loading stats...
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(actionBreakdown)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 8)
                .map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{action}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(((count as number) / Math.max(...Object.values(actionBreakdown) as number[])) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">{count as number}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>

        {/* Security Summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Security Summary</h3>
            <Shield className="h-5 w-5 text-gray-400" />
          </div>
          
          {securityLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Loading security events...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {securityEvents?.filter(e => e.action === 'LOGIN')?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Successful Logins</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {securityEvents?.filter(e => e.action === 'LOGIN_FAILED')?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Failed Logins</div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Recent Security Events</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {securityEvents?.slice(0, 5).map((event, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          event.action === 'LOGIN_FAILED' ? 'bg-red-500' : 'bg-green-500'
                        }`} />
                        <span>{event.action}</span>
                      </span>
                      <span className="text-gray-500">
                        {format(new Date(event.timestamp), 'HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Main Audit Log Viewer */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Comprehensive Audit Logs</h3>
          <AuditLogViewer 
            initialFilters={{
              startDate,
              endDate: now
            }}
            height="600px"
          />
        </div>
      </Card>
    </div>
  )
}