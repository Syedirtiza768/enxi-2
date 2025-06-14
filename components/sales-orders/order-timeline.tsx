'use client'

import React from 'react'
import { 
  Clock, CheckCircle, XCircle, Package, Truck, 
  FileText, AlertTriangle, User, Calendar
} from 'lucide-react'

interface TimelineEvent {
  id: string
  type: 'created' | 'approved' | 'rejected' | 'processing' | 'shipped' | 'delivered' | 'invoiced' | 'cancelled' | 'modified'
  timestamp: string
  user?: {
    name: string
    email: string
  }
  description: string
  metadata?: Record<string, any>
}

interface OrderTimelineProps {
  events: TimelineEvent[]
  className?: string
}

export function OrderTimeline({ events, className = '' }: OrderTimelineProps) {
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return <Clock className="h-5 w-5 text-gray-400" />
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'processing':
        return <Package className="h-5 w-5 text-blue-500" />
      case 'shipped':
        return <Truck className="h-5 w-5 text-purple-500" />
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'invoiced':
        return <FileText className="h-5 w-5 text-indigo-500" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'modified':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'approved':
      case 'delivered':
        return 'bg-green-50 border-green-200'
      case 'rejected':
      case 'cancelled':
        return 'bg-red-50 border-red-200'
      case 'processing':
        return 'bg-blue-50 border-blue-200'
      case 'shipped':
        return 'bg-purple-50 border-purple-200'
      case 'invoiced':
        return 'bg-indigo-50 border-indigo-200'
      case 'modified':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  if (events.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        No timeline events available
      </div>
    )
  }

  return (
    <div className={`flow-root ${className}`}>
      <ul className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span
                  className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex items-start space-x-3">
                <div className="relative">
                  <div
                    className={`h-10 w-10 rounded-full border-2 flex items-center justify-center ${getEventColor(event.type)}`}
                  >
                    {getEventIcon(event.type)}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-900">{event.description}</p>
                    {event.user && (
                      <div className="mt-1 flex items-center text-xs text-gray-500">
                        <User className="h-3 w-3 mr-1" />
                        <span>{event.user.name}</span>
                      </div>
                    )}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <div key={key} className="mt-1">
                            <span className="font-medium">{key}:</span>{' '}
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <time dateTime={event.timestamp}>{formatDate(event.timestamp)}</time>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}