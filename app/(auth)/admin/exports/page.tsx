'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download, 
  FileText, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  BarChart3,
  Users,
  Activity
} from 'lucide-react';
import { PageLayout, PageHeader, PageSection, VStack, Grid } from '@/components/design-system';
import { format } from 'date-fns';
import { EXPORT_DATA_TYPES } from '@/lib/utils/export';

interface ExportJob {
  id: string;
  userId: string;
  dataType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRows: number;
  processedRows: number;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  user?: {
    username: string;
    email: string;
  };
}

interface ExportStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeJobs: number;
  totalDataExported: number;
  topDataTypes: Array<{ dataType: string; count: number }>;
  recentActivity: number;
}

export default function ExportsManagementPage(): React.JSX.Element {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const fetchJobs = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/exports');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to fetch export jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async (): Promise<void> => {
    setCleanupLoading(true);
    try {
      const response = await fetch('/api/exports/cleanup', { method: 'POST' });
      if (response.ok) {
        alert('Cleanup completed successfully');
        fetchJobs(); // Refresh the list
      } else {
        alert('Cleanup failed');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('Cleanup failed');
    } finally {
      setCleanupLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000); // Refresh every 30 seconds
    return (): void => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: ExportJob['status']): void => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ExportJob['status']): void => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
      pending: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status}
      </Badge>
    );
  };

  const formatDataType = (dataType: string): void => {
    const exportType = EXPORT_DATA_TYPES[dataType];
    return exportType?.label || dataType;
  };

  const formatFileSize = (rows: number): void => {
    const estimatedBytes = rows * 100; // Rough estimate
    if (estimatedBytes < 1024) return `${estimatedBytes} B`;
    if (estimatedBytes < 1024 * 1024) return `${(estimatedBytes / 1024).toFixed(1)} KB`;
    return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <PageLayout>
        <VStack gap="xl" className="py-6">
          <PageHeader title="Export Management" />
          <PageSection>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">Loading export data...</div>
              </CardContent>
            </Card>
          </PageSection>
        </VStack>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        <PageHeader
          title="Export Management"
          description="Monitor and manage data export jobs"
          centered={false}
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchJobs}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={handleCleanup}
                disabled={cleanupLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {cleanupLoading ? 'Cleaning...' : 'Cleanup Old Files'}
              </Button>
            </div>
          }
        />

        {/* Statistics */}
        {stats && (
          <PageSection>
            <Grid cols={4} gap="lg">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalJobs}</div>
                  <p className="text-xs text-muted-foreground">All export jobs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedJobs}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalJobs > 0 ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0}% success rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeJobs}</div>
                  <p className="text-xs text-muted-foreground">Currently processing</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Exported</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDataExported.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total rows exported</p>
                </CardContent>
              </Card>
            </Grid>
          </PageSection>
        )}

        {/* Top Data Types */}
        {stats?.topDataTypes && stats.topDataTypes.length > 0 && (
          <PageSection>
            <Card>
              <CardHeader>
                <CardTitle>Popular Export Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topDataTypes.map((item, index) => (
                    <div key={item.dataType} className="flex justify-between items-center">
                      <span className="text-sm">{formatDataType(item.dataType)}</span>
                      <Badge variant="secondary">{item.count} exports</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </PageSection>
        )}

        {/* Export Jobs Table */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Recent Export Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <div>No export jobs found</div>
                  <div className="text-sm">Export jobs will appear here when users create them</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Data Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Rows</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-mono text-xs">
                            {job.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium">
                                  {job.user?.username || 'Unknown'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {job.user?.email || job.userId}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{formatDataType(job.dataType)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(job.status)}
                              {getStatusBadge(job.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-16">
                              <div className="text-xs text-gray-500 mb-1">{job.progress}%</div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${job.progress}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {job.processedRows.toLocaleString()} / {job.totalRows.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatFileSize(job.totalRows)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(job.createdAt, 'MMM dd, HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {job.downloadUrl && job.status === 'completed' && (
                                <Button asChild size="sm" variant="outline">
                                  <a href={job.downloadUrl} download>
                                    <Download className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                              {job.error && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title={job.error}
                                >
                                  <XCircle className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </PageSection>
      </VStack>
    </PageLayout>
  );
}