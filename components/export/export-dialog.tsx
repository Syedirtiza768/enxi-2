'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Download, Mail, Settings, Calendar, FileText, Table, FileSpreadsheet, Filter, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { 
  EXPORT_DATA_TYPES, 
  DATE_RANGE_PRESETS, 
  formatCellValue, 
  getExportFileName, 
  estimateExportSize, 
  shouldCompress, 
  getMaxRowsForFormat,
  type ColumnConfig,
  type DateRangePreset 
} from '@/lib/utils/export';

export interface ExportDialogProps {
  dataType: string;
  trigger?: React.ReactNode;
  defaultFilters?: Record<string, any>;
  onExportComplete?: (downloadUrl: string) => void;
}

interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRows: number;
  processedRows: number;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export function ExportDialog({ 
  dataType, 
  trigger, 
  defaultFilters = {},
  onExportComplete 
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);
  const [jobHistory, setJobHistory] = useState<ExportJob[]>([]);
  
  // Export configuration state
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [customDateRange, setCustomDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: ''
  });
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [maxRows, setMaxRows] = useState<number>(10000);
  const [emailDelivery, setEmailDelivery] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<string>('');

  const exportConfig = EXPORT_DATA_TYPES[dataType];

  useEffect(() => {
    if (exportConfig && selectedColumns.length === 0) {
      // Select first 10 columns by default
      setSelectedColumns(exportConfig.columns.slice(0, 10).map(col => col.key));
    }
  }, [exportConfig, selectedColumns.length]);

  useEffect(() => {
    if (currentJob && currentJob.status === 'processing') {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/exports/status/${currentJob.id}`);
          if (response.ok) {
            const updatedJob = await response.json();
            setCurrentJob(updatedJob);
            
            if (updatedJob.status === 'completed' && updatedJob.downloadUrl) {
              if (onExportComplete) {
                onExportComplete(updatedJob.downloadUrl);
              }
              clearInterval(interval);
            } else if (updatedJob.status === 'failed') {
              clearInterval(interval);
            }
          }
        } catch (error) {
          console.error('Error checking export status:', error);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentJob, onExportComplete]);

  const handleDateRangePreset = (preset: DateRangePreset) => {
    const range = preset.getRange();
    setDateRange(range);
    setCustomDateRange({
      from: formatDate(range.from, 'yyyy-MM-dd'),
      to: formatDate(range.to, 'yyyy-MM-dd')
    });
  };

  const handleCustomDateRange = () => {
    if (customDateRange.from && customDateRange.to) {
      setDateRange({
        from: new Date(customDateRange.from),
        to: new Date(customDateRange.to)
      });
    }
  };

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    setSelectedColumns(prev => {
      if (checked) {
        return [...prev, columnKey];
      } else {
        return prev.filter(key => key !== columnKey);
      }
    });
  };

  const handleSelectAllColumns = () => {
    if (selectedColumns.length === exportConfig.columns.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(exportConfig.columns.map(col => col.key));
    }
  };

  const calculateEstimatedSize = () => {
    if (!exportConfig) return 0;
    return estimateExportSize(maxRows, selectedColumns.length, format);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const handleExport = async (): Promise<void> => {
    if (!exportConfig || selectedColumns.length === 0) return;

    setLoading(true);
    try {
      const exportOptions = {
        format,
        columns: selectedColumns,
        dateRange: dateRange || undefined,
        filters: defaultFilters,
        includeHeaders,
        maxRows: Math.min(maxRows, getMaxRowsForFormat(format, dataType)),
        emailDelivery: emailDelivery ? {
          enabled: true,
          recipients: emailRecipients.split(',').map(email => email.trim()).filter(Boolean),
          subject: `${exportConfig.label} Export - ${format.toUpperCase()}`,
          message: `Your requested ${exportConfig.label} export is attached.`
        } : undefined
      };

      const response = await fetch('/api/exports/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataType,
          options: exportOptions
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start export');
      }

      const { jobId } = await response.json();
      
      // Start monitoring the job
      const jobResponse = await fetch(`/api/exports/status/${jobId}`);
      if (jobResponse.ok) {
        const job = await jobResponse.json();
        setCurrentJob(job);
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadJobHistory = async (): Promise<void> => {
    try {
      const response = await fetch('/api/exports/history');
      if (response.ok) {
        const history = await response.json();
        setJobHistory(history);
      }
    } catch (error) {
      console.error('Failed to load job history:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadJobHistory();
    }
  }, [open]);

  if (!exportConfig) {
    return null;
  }

  const estimatedSize = calculateEstimatedSize();
  const willCompress = shouldCompress(estimatedSize);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export {exportConfig.label}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="configure" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="space-y-6">
            {/* Export Format */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Export Format
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      format === 'csv' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setFormat('csv')}
                  >
                    <Table className="w-8 h-8 mb-2 mx-auto" />
                    <div className="text-center">
                      <div className="font-medium">CSV</div>
                      <div className="text-sm text-gray-500">Comma-separated values</div>
                    </div>
                  </div>
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      format === 'excel' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setFormat('excel')}
                  >
                    <FileSpreadsheet className="w-8 h-8 mb-2 mx-auto" />
                    <div className="text-center">
                      <div className="font-medium">Excel</div>
                      <div className="text-sm text-gray-500">Excel spreadsheet</div>
                    </div>
                  </div>
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      format === 'pdf' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setFormat('pdf')}
                  >
                    <FileText className="w-8 h-8 mb-2 mx-auto" />
                    <div className="text-center">
                      <div className="font-medium">PDF</div>
                      <div className="text-sm text-gray-500">Portable document</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date Range */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date Range
                </CardTitle>
                <CardDescription>
                  Filter records by date range (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {DATE_RANGE_PRESETS.map((preset) => (
                    <Button
                      key={preset.key}
                      variant="outline"
                      size="sm"
                      onClick={() => handleDateRangePreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date-from">From Date</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={customDateRange.from}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
                      onBlur={handleCustomDateRange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-to">To Date</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={customDateRange.to}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
                      onBlur={handleCustomDateRange}
                    />
                  </div>
                </div>
                {dateRange && (
                  <div className="text-sm text-gray-600">
                    Selected range: {formatDate(dateRange.from, 'PPP')} to {formatDate(dateRange.to, 'PPP')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Column Selection
                </CardTitle>
                <CardDescription>
                  Choose which columns to include in the export
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Button variant="outline" size="sm" onClick={handleSelectAllColumns}>
                    {selectedColumns.length === exportConfig.columns.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <span className="ml-2 text-sm text-gray-500">
                    ({selectedColumns.length} of {exportConfig.columns.length} selected)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {exportConfig.columns.map((column) => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={column.key}
                        checked={selectedColumns.includes(column.key)}
                        onChange={(e) => handleColumnToggle(column.key, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={column.key} className="text-sm">
                        {column.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max-rows">Maximum Rows</Label>
                    <Input
                      id="max-rows"
                      type="number"
                      value={maxRows}
                      onChange={(e) => setMaxRows(parseInt(e.target.value) || 10000)}
                      min={1}
                      max={getMaxRowsForFormat(format, dataType)}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Max allowed for {format.toUpperCase()}: {getMaxRowsForFormat(format, dataType).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="include-headers"
                        checked={includeHeaders}
                        onChange={(e) => setIncludeHeaders(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="include-headers">Include Headers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="email-delivery"
                        checked={emailDelivery}
                        onChange={(e) => setEmailDelivery(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="email-delivery">Email Delivery</Label>
                    </div>
                  </div>
                </div>

                {emailDelivery && (
                  <div>
                    <Label htmlFor="email-recipients">Email Recipients</Label>
                    <Input
                      id="email-recipients"
                      placeholder="email1@example.com, email2@example.com"
                      value={emailRecipients}
                      onChange={(e) => setEmailRecipients(e.target.value)}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Separate multiple emails with commas
                    </div>
                  </div>
                )}

                {/* File Size Estimate */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm">
                    <strong>Estimated file size:</strong> {formatFileSize(estimatedSize)}
                    {willCompress && (
                      <Badge variant="secondary" className="ml-2">
                        Will be compressed
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Based on {maxRows.toLocaleString()} rows and {selectedColumns.length} columns
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={loading || selectedColumns.length === 0}
                className="min-w-32"
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Start Export
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {currentJob ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {currentJob.status === 'processing' && <Clock className="w-4 h-4 animate-spin" />}
                    {currentJob.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {currentJob.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                    Export Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{currentJob.progress}%</span>
                    </div>
                    <Progress value={currentJob.progress} />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Status</div>
                      <div className="font-medium capitalize">{currentJob.status}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Rows</div>
                      <div className="font-medium">{currentJob.totalRows.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Processed</div>
                      <div className="font-medium">{currentJob.processedRows.toLocaleString()}</div>
                    </div>
                  </div>

                  {currentJob.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Export Failed</span>
                      </div>
                      <div className="text-red-600 text-sm mt-1">{currentJob.error}</div>
                    </div>
                  )}

                  {currentJob.downloadUrl && currentJob.status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Export Complete!</span>
                          </div>
                          <div className="text-green-600 text-sm">Your file is ready for download</div>
                        </div>
                        <Button asChild size="sm">
                          <a href={currentJob.downloadUrl} download>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <div>No active export job</div>
                <div className="text-sm">Configure and start an export to see progress here</div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {jobHistory.length > 0 ? (
              <div className="space-y-3">
                {jobHistory.map((job) => (
                  <Card key={job.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {job.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {job.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                          {job.status === 'processing' && <Clock className="w-4 h-4 animate-spin" />}
                          <div>
                            <div className="font-medium">
                              {exportConfig.label} Export
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(job.createdAt, 'PPp')}
                              {job.completedAt && ` - ${formatDate(job.completedAt, 'PPp')}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'failed' ? 'destructive' : 
                            'secondary'
                          }>
                            {job.status}
                          </Badge>
                          {job.downloadUrl && job.status === 'completed' && (
                            <Button asChild size="sm" variant="outline">
                              <a href={job.downloadUrl} download>
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <div>No export history</div>
                <div className="text-sm">Your export history will appear here</div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}