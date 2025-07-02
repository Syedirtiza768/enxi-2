'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircle, Clock, Package, FileText, CreditCard, 
  AlertCircle, Truck, XCircle, Calendar, User,
  ChevronDown, ChevronUp, ExternalLink, MoreVertical, History
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/client'

interface TimelineEvent {
  id: string
  type: 'created' | 'updated' | 'approved' | 'shipped' | 'delivered' | 'invoiced' | 
        'cancelled' | 'shipment_created' | 'invoice_created' | 'payment_received' | 'status_changed'
  timestamp: string
  title: string
  description: string
  metadata?: Record<string, any>
  user?: {
    id: string
    name: string
    email: string
  }
  relatedEntity?: {
    type: 'shipment' | 'invoice' | 'payment'
    id: string
    number: string
  }
}

interface OrderTimelineEnhancedProps {
  salesOrderId: string
  onRefresh?: () => void
}

export function OrderTimelineEnhanced({ salesOrderId, onRefresh }: OrderTimelineEnhancedProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [filter, setFilter] = useState<'all' | 'important'>('all')

  useEffect(() => {
    fetchTimeline()
  }, [salesOrderId])

  const fetchTimeline = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient(`/api/sales-orders/${salesOrderId}/timeline`)
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch timeline')
      }
      
      setTimeline(response.data || [])
    } catch (err) {
      console.error('Error fetching timeline:', err)
      setError(err instanceof Error ? err.message : 'Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (type: TimelineEvent['type']) => {
    const iconMap = {
      created: <CheckCircle className="w-5 h-5" />,
      updated: <Clock className="w-5 h-5" />,
      approved: <CheckCircle className="w-5 h-5" />,
      shipped: <Truck className="w-5 h-5" />,
      delivered: <Package className="w-5 h-5" />,
      invoiced: <FileText className="w-5 h-5" />,
      cancelled: <XCircle className="w-5 h-5" />,
      shipment_created: <Truck className="w-5 h-5" />,
      invoice_created: <FileText className="w-5 h-5" />,
      payment_received: <CreditCard className="w-5 h-5" />,
      status_changed: <AlertCircle className="w-5 h-5" />
    }
    return iconMap[type] || <Clock className="w-5 h-5" />
  }

  const getEventColor = (type: TimelineEvent['type']) => {
    const colorMap = {
      created: 'text-green-600 bg-green-100',
      updated: 'text-blue-600 bg-blue-100',
      approved: 'text-green-600 bg-green-100',
      shipped: 'text-purple-600 bg-purple-100',
      delivered: 'text-green-600 bg-green-100',
      invoiced: 'text-orange-600 bg-orange-100',
      cancelled: 'text-red-600 bg-red-100',
      shipment_created: 'text-purple-600 bg-purple-100',
      invoice_created: 'text-orange-600 bg-orange-100',
      payment_received: 'text-green-600 bg-green-100',
      status_changed: 'text-gray-600 bg-gray-100'
    }
    return colorMap[type] || 'text-gray-600 bg-gray-100'
  }

  const importantEventTypes = ['created', 'approved', 'shipped', 'delivered', 'invoiced', 'cancelled', 'payment_received']
  
  const filteredTimeline = filter === 'important' 
    ? timeline.filter(event => importantEventTypes.includes(event.type))
    : timeline

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button onClick={fetchTimeline} size="sm" variant="outline" className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Order Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'ghost'}
                className="rounded-r-none"
                onClick={() => setFilter('all')}
              >
                All Events
              </Button>
              <Button
                size="sm"
                variant={filter === 'important' ? 'default' : 'ghost'}
                className="rounded-l-none"
                onClick={() => setFilter('important')}
              >
                Key Events
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="px-6 pb-6">
          {filteredTimeline.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              {filter === 'important' ? 'No key events yet' : 'No timeline events yet'}
            </p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {/* Timeline events */}
              <div className="space-y-6">
                {filteredTimeline.map((event, index) => (
                  <div key={event.id} className="relative flex items-start">
                    {/* Event icon */}
                    <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${getEventColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    
                    {/* Event content */}
                    <div className="ml-6 flex-1">
                      <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{event.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                            
                            {/* Metadata */}
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <div className="mt-2 space-y-1">
                                {Object.entries(event.metadata).map(([key, value]) => (
                                  <div key={key} className="text-xs text-gray-500">
                                    <span className="font-medium">{formatMetadataKey(key)}:</span> {formatMetadataValue(value)}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Related entity */}
                            {event.relatedEntity && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {event.relatedEntity.type}: {event.relatedEntity.number}
                                </Badge>
                              </div>
                            )}
                            
                            {/* User and timestamp */}
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              {event.user && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>{event.user.name}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span title={new Date(event.timestamp).toLocaleString()}>
                                  {getRelativeTime(new Date(event.timestamp))}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action menu */}
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function formatMetadataKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim()
}

function formatMetadataValue(value: any): string {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString()
  if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
    return new Date(value).toLocaleDateString()
  }
  return String(value)
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}