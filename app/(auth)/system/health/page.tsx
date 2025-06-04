'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  routes: {
    totalRoutes: number;
    healthyRoutes: number;
    degradedRoutes: number;
    unhealthyRoutes: number;
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    avgResponseTime: number;
    totalRequests: number;
    totalErrors: number;
  };
  errors: {
    total: number;
    unresolved: number;
  };
  database: {
    status: string;
    responseTime?: number;
    error?: string;
  };
  responseTime: number;
}

interface RouteMetric {
  route: string;
  method: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastHealthCheck: string;
  errors: Array<{
    timestamp: string;
    statusCode: number;
    errorType: string;
    message: string;
  }>;
}

interface ErrorReport {
  id: string;
  resolved: boolean;
  occurrenceCount: number;
  firstOccurrence: string;
  lastOccurrence: string;
  context: {
    route?: string;
    method?: string;
    userId?: string;
    requestId?: string;
  };
  errorMessage: string;
  errorType: string;
}

export default function SystemHealthPage() {
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [routeDetails, setRouteDetails] = useState<RouteMetric[]>([]);
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'routes' | 'errors'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchHealthData = async (includeDetails: boolean = false) => {
    try {
      const params = new URLSearchParams();
      if (includeDetails) {
        params.set('routes', 'true');
        params.set('errors', 'true');
      }

      const response = await fetch(`/api/system/health?${params}`);
      const data = await response.json();
      
      setHealthData(data);
      
      if (data.routeDetails) {
        setRouteDetails(data.routeDetails);
      }
      
      if (data.errorReports) {
        setErrorReports(data.errorReports);
      }

      console.log('Health data fetched', {
        status: data.status,
        totalRoutes: data.routes?.totalRoutes,
        totalErrors: data.errors?.total
      });

    } catch (error) {
      console.error('Failed to fetch health data', error);
    } finally {
      setLoading(false);
    }
  };

  const performHealthChecks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/health?checks=true');
      const data = await response.json();
      setHealthData(data);
      console.log('Active health checks completed');
    } catch (error) {
      console.error('Failed to perform health checks', error);
    } finally {
      setLoading(false);
    }
  };

  const markErrorResolved = async (errorId: string) => {
    try {
      const response = await fetch(`/api/system/errors?id=${errorId}`, {
        method: 'PATCH'
      });
      
      if (response.ok) {
        setErrorReports(prev => 
          prev.map(error => 
            error.id === errorId ? { ...error, resolved: true } : error
          )
        );
        console.log('Error marked as resolved', { errorId });
      }
    } catch (error) {
      console.error('Failed to mark error as resolved', error);
    }
  };

  useEffect(() => {
    fetchHealthData(true);
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchHealthData(activeTab !== 'overview');
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading && !healthData) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">System Health Dashboard</h1>
        <div className="text-center py-12">Loading system health data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Health Dashboard</h1>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={performHealthChecks} disabled={loading}>
            Run Health Checks
          </Button>
          <Button onClick={() => fetchHealthData(true)} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        {(['overview', 'routes', 'errors'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => setActiveTab(tab)}
            className="capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      {healthData && (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    System Status
                    <Badge className={getStatusColor(healthData.status)}>
                      {healthData.status.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>Uptime: {formatUptime(healthData.uptime)}</div>
                    <div>Response Time: {healthData.responseTime}ms</div>
                    <div>Database: 
                      <Badge className={`ml-2 ${getStatusColor(healthData.database.status === 'connected' ? 'healthy' : 'unhealthy')}`}>
                        {healthData.database.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Routes Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Routes Health
                    <Badge className={getStatusColor(healthData.routes.overallStatus)}>
                      {healthData.routes.overallStatus.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>Total Routes: {healthData.routes.totalRoutes}</div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-green-600">Healthy: {healthData.routes.healthyRoutes}</div>
                      <div className="text-yellow-600">Degraded: {healthData.routes.degradedRoutes}</div>
                      <div className="text-red-600">Unhealthy: {healthData.routes.unhealthyRoutes}</div>
                    </div>
                    <div>Avg Response: {healthData.routes.avgResponseTime}ms</div>
                    <div>Total Requests: {healthData.routes.totalRequests.toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Error Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Error Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>Total Errors: {healthData.errors.total}</div>
                    <div className="text-orange-600">Unresolved: {healthData.errors.unresolved}</div>
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

          {/* Routes Tab */}
          {activeTab === 'routes' && (
            <div className="space-y-4">
              {routeDetails.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Button onClick={() => fetchHealthData(true)}>
                      Load Route Details
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                routeDetails.map((route) => (
                  <Card key={`${route.method}-${route.route}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{route.method} {route.route}</span>
                        <Badge className={getStatusColor(route.status)}>
                          {route.status.toUpperCase()}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Last checked: {new Date(route.lastHealthCheck).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-600">Total Requests</div>
                          <div className="font-semibold">{route.totalRequests.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Success Rate</div>
                          <div className="font-semibold">
                            {route.totalRequests > 0 
                              ? Math.round((route.successCount / route.totalRequests) * 100)
                              : 0
                            }%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Avg Response</div>
                          <div className="font-semibold">{Math.round(route.avgResponseTime)}ms</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Error Count</div>
                          <div className="font-semibold text-red-600">{route.errorCount}</div>
                        </div>
                      </div>
                      
                      {route.errors.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Recent Errors:</h4>
                          <div className="space-y-1">
                            {route.errors.slice(0, 3).map((error, index) => (
                              <div key={index} className="text-sm bg-red-50 p-2 rounded">
                                <div className="flex justify-between">
                                  <span className="font-medium">{error.errorType}</span>
                                  <span className="text-gray-500">
                                    {new Date(error.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-gray-700">{error.message}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Errors Tab */}
          {activeTab === 'errors' && (
            <div className="space-y-4">
              {errorReports.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div>No error reports found</div>
                    <Button className="mt-2" onClick={() => fetchHealthData(true)}>
                      Load Error Reports
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                errorReports.map((error) => (
                  <Card key={error.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{error.errorType}: {error.errorMessage}</span>
                        <div className="flex gap-2">
                          {error.resolved && (
                            <Badge className="bg-green-500">RESOLVED</Badge>
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Occurred {error.occurrenceCount} times • Last: {new Date(error.lastOccurrence).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mt-4 flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          {error.context.route && (
                            <span>{error.context.method} {error.context.route}</span>
                          )}
                        </div>
                        
                        {!error.resolved && (
                          <Button
                            size="sm"
                            onClick={() => markErrorResolved(error.id)}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}