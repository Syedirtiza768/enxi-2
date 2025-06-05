'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AuditLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  metadata?: Record<string, unknown>
  timestamp: string
  ipAddress?: string
  userAgent?: string
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    fetchLogs()
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/audit?page=${page}&limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setLogs(data.data)
        setTotal(data.total)
      }
} catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-600'
      case 'UPDATE': return 'text-blue-600'
      case 'DELETE': return 'text-red-600'
      case 'LOGIN': return 'text-purple-600'
      case 'LOGOUT': return 'text-gray-600'
      default: return 'text-gray-700'
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Audit Trail</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>System Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading...</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="border-b pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="ml-2 text-gray-700">
                        {log.entityType} ({log.entityId})
                      </span>
                      {log.metadata?.username && (
                        <span className="ml-2 text-gray-600">
                          - User: {log.metadata.username}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(log.timestamp)}
                    </span>
                  </div>
                  {log.metadata && (
                    <div className="text-sm text-gray-600 mt-1">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>
              ))}
              
              {logs.length === 0 && (
                <p className="text-center text-gray-500 py-4">No audit logs found</p>
              )}
            </div>
          )}
          
          {total > limit && (
            <div className="flex justify-between items-center mt-4">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <Button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}