'use client';

import { useState, useCallback, useRef } from 'react';
import { ExcelWorkbookBuilder, ExcelUtils } from '@/lib/utils/excel-utils';
import type { 
  ExcelExportOptions, 
  ExcelExportJob, 
  ExcelSheet,
  ExcelColumnConfig 
} from '@/components/export/excel-exporter';

export interface UseExcelExportOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (result: { downloadUrl: string; fileSize: number }) => void;
  onError?: (error: string) => void;
  onWarning?: (warning: string) => void;
  maxConcurrentJobs?: number;
}

export interface ExcelExportResult {
  downloadUrl: string;
  fileSize: number;
  duration: number;
  warnings: string[];
}

export function useExcelExport(options: UseExcelExportOptions = {}) {
  const [jobs, setJobs] = useState<Map<string, ExcelExportJob>>(new Map());
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExcelExportJob[]>([]);
  
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const maxConcurrentJobs = options.maxConcurrentJobs || 3;

  const generateJobId = useCallback((): string => {
    return `excel_export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const updateJob = useCallback((jobId: string, updates: Partial<ExcelExportJob>) => {
    setJobs(prev => {
      const newJobs = new Map(prev);
      const existingJob = newJobs.get(jobId);
      if (existingJob) {
        const updatedJob = { ...existingJob, ...updates };
        newJobs.set(jobId, updatedJob);
        
        // Call callbacks
        if (updates.progress !== undefined && options.onProgress) {
          options.onProgress(updates.progress);
        }
        
        if (updates.status === 'completed' && updates.downloadUrl && options.onComplete) {
          options.onComplete({
            downloadUrl: updates.downloadUrl,
            fileSize: updates.fileSize || 0
          });
        }
        
        if (updates.status === 'failed' && updates.error && options.onError) {
          options.onError(updates.error);
        }
        
        if (updates.warnings && updates.warnings.length > 0 && options.onWarning) {
          updates.warnings.forEach(warning => options.onWarning!(warning));
        }
      }
      return newJobs;
    });
  }, [options]);

  const addToHistory = useCallback((job: ExcelExportJob) => {
    setExportHistory(prev => {
      const newHistory = [job, ...prev];
      return newHistory.slice(0, 50); // Keep last 50 exports
    });
  }, []);

  const processDataTransformation = useCallback((
    data: any[],
    transformation?: ExcelExportOptions['dataTransformation']
  ): any[] => {
    if (!transformation) return data;

    let result = [...data];

    // Apply filters
    if (transformation.filters) {
      Object.entries(transformation.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          result = result.filter(item => {
            const itemValue = getNestedValue(item, key);
            if (typeof value === 'string') {
              return itemValue?.toString().toLowerCase().includes(value.toLowerCase());
            }
            return itemValue === value;
          });
        }
      });
    }

    // Apply sorting
    if (transformation.sort && transformation.sort.length > 0) {
      result.sort((a, b) => {
        for (const sortConfig of transformation.sort!) {
          const aValue = getNestedValue(a, sortConfig.column);
          const bValue = getNestedValue(b, sortConfig.column);
          
          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;
          
          if (comparison !== 0) {
            return sortConfig.direction === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    // Apply grouping and aggregation
    if (transformation.groupBy && transformation.groupBy.length > 0) {
      const groups = result.reduce((acc, item) => {
        const groupKey = transformation.groupBy!.map(col => getNestedValue(item, col)).join('|');
        if (!acc[groupKey]) {
          acc[groupKey] = [];
        }
        acc[groupKey].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      result = Object.entries(groups).map(([key, items]) => {
        const groupData: any = {};
        transformation.groupBy!.forEach((col, index) => {
          groupData[col] = key.split('|')[index];
        });

        // Apply aggregations
        if (transformation.aggregations) {
          transformation.aggregations.forEach(agg => {
            const values = items.map(item => getNestedValue(item, agg.column)).filter(v => typeof v === 'number');
            switch (agg.function) {
              case 'sum':
                groupData[`${agg.column}_sum`] = values.reduce((sum, val) => sum + val, 0);
                break;
              case 'count':
                groupData[`${agg.column}_count`] = values.length;
                break;
              case 'avg':
                groupData[`${agg.column}_avg`] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
                break;
              case 'min':
                groupData[`${agg.column}_min`] = values.length > 0 ? Math.min(...values) : 0;
                break;
              case 'max':
                groupData[`${agg.column}_max`] = values.length > 0 ? Math.max(...values) : 0;
                break;
            }
          });
        }

        return groupData;
      });
    }

    return result;
  }, []);

  const getNestedValue = useCallback((obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }, []);

  const buildExcelFile = useCallback(async (
    sheets: ExcelSheet[],
    data: any[],
    exportOptions: ExcelExportOptions,
    abortSignal?: AbortSignal
  ): Promise<ArrayBuffer> => {
    const builder = new ExcelWorkbookBuilder();
    const warnings: string[] = [];

    // Process each sheet
    for (const sheet of sheets) {
      if (abortSignal?.aborted) {
        throw new Error('Export cancelled');
      }

      // Transform data for this sheet
      const processedData = processDataTransformation(data, exportOptions.dataTransformation);
      
      // Limit rows if specified
      const maxRows = exportOptions.dataTransformation?.filters ? processedData.length : 100000;
      const limitedData = processedData.slice(0, maxRows);
      
      if (limitedData.length < processedData.length) {
        warnings.push(`Sheet "${sheet.name}" was limited to ${maxRows.toLocaleString()} rows (${processedData.length.toLocaleString()} total)`);
      }

      // Convert object data to format expected by builder
      builder.addWorksheetFromObjects(
        sheet.name,
        limitedData,
        sheet.columns.map(col => ({
          key: col.key as keyof typeof limitedData[0],
          label: col.label,
          type: col.type,
          width: col.width,
          style: col.style,
          format: col.format,
          formula: col.formula
        })),
        {
          autoFilter: sheet.autoFilter,
          freezePanes: sheet.freezePanes,
          protection: sheet.protection,
          pageSetup: sheet.pageSetup
        }
      );

      // Add charts if any
      if (sheet.charts && sheet.charts.length > 0) {
        builder.addChartsToWorksheet(sheet.name, sheet.charts);
      }

      // Add images if any
      if (sheet.images && sheet.images.length > 0) {
        builder.addImagesToWorksheet(sheet.name, sheet.images);
      }
    }

    // Set workbook metadata
    if (exportOptions.template?.metadata) {
      builder.setMetadata(exportOptions.template.metadata);
    }

    // Build the file
    return builder.build({
      compression: exportOptions.compression,
      password: exportOptions.password
    });
  }, [processDataTransformation]);

  const createDownloadUrl = useCallback((buffer: ArrayBuffer, filename: string): string => {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    return URL.createObjectURL(blob);
  }, []);

  const handleEmailDelivery = useCallback(async (
    job: ExcelExportJob,
    downloadUrl: string
  ): Promise<void> => {
    if (!job.options.emailDelivery?.enabled) return;

    try {
      // In a real implementation, this would call your email service
      const response = await fetch('/api/exports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          downloadUrl,
          recipients: job.options.emailDelivery.recipients,
          subject: job.options.emailDelivery.subject,
          message: job.options.emailDelivery.message,
          attachPassword: job.options.emailDelivery.attachPassword && job.options.password
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Email delivery failed:', error);
      updateJob(job.id, {
        warnings: [...(job.warnings || []), `Email delivery failed: ${error}`]
      });
    }
  }, [updateJob]);

  const handleCloudStorage = useCallback(async (
    job: ExcelExportJob,
    buffer: ArrayBuffer
  ): Promise<void> => {
    if (!job.options.cloudStorage?.enabled) return;

    try {
      // In a real implementation, this would upload to cloud storage
      const response = await fetch('/api/exports/cloud-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer
      });

      if (!response.ok) {
        throw new Error('Failed to upload to cloud storage');
      }

      const result = await response.json();
      updateJob(job.id, {
        warnings: [...(job.warnings || []), `File uploaded to ${job.options.cloudStorage.provider}: ${result.url}`]
      });
    } catch (error) {
      console.error('Cloud storage upload failed:', error);
      updateJob(job.id, {
        warnings: [...(job.warnings || []), `Cloud storage upload failed: ${error}`]
      });
    }
  }, [updateJob]);

  const exportToExcel = useCallback(async (
    data: any[],
    sheets: ExcelSheet[],
    filename: string = 'export.xlsx',
    exportOptions: ExcelExportOptions = {}
  ): Promise<string> => {
    // Check concurrent job limit
    const activeJobs = Array.from(jobs.values()).filter(job => 
      job.status === 'processing' || job.status === 'queued'
    );
    
    if (activeJobs.length >= maxConcurrentJobs) {
      throw new Error(`Maximum concurrent exports (${maxConcurrentJobs}) reached. Please wait for current exports to complete.`);
    }

    const jobId = generateJobId();
    const abortController = new AbortController();
    abortControllers.current.set(jobId, abortController);

    // Create initial job
    const job: ExcelExportJob = {
      id: jobId,
      status: 'queued',
      progress: 0,
      totalRows: data.length,
      processedRows: 0,
      createdAt: new Date(),
      options: exportOptions,
      warnings: []
    };

    setJobs(prev => new Map(prev).set(jobId, job));
    setIsExporting(true);

    try {
      // Start processing
      updateJob(jobId, { 
        status: 'processing', 
        startedAt: new Date(),
        currentSheet: sheets[0]?.name
      });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        if (abortController.signal.aborted) {
          clearInterval(progressInterval);
          return;
        }

        setJobs(prev => {
          const currentJob = prev.get(jobId);
          if (!currentJob || currentJob.status !== 'processing') {
            clearInterval(progressInterval);
            return prev;
          }

          const newProgress = Math.min(currentJob.progress + Math.random() * 5, 95);
          const newJobs = new Map(prev);
          newJobs.set(jobId, {
            ...currentJob,
            progress: newProgress,
            processedRows: Math.floor((newProgress / 100) * currentJob.totalRows)
          });
          
          if (options.onProgress) {
            options.onProgress(newProgress);
          }
          
          return newJobs;
        });
      }, 200);

      // Build Excel file
      const buffer = await buildExcelFile(sheets, data, exportOptions, abortController.signal);
      
      clearInterval(progressInterval);

      if (abortController.signal.aborted) {
        throw new Error('Export cancelled');
      }

      // Create download URL
      const downloadUrl = createDownloadUrl(buffer, filename);
      
      // Complete the job
      const completedJob: ExcelExportJob = {
        ...job,
        status: 'completed',
        progress: 100,
        processedRows: job.totalRows,
        downloadUrl,
        fileSize: buffer.byteLength,
        completedAt: new Date()
      };

      updateJob(jobId, completedJob);
      addToHistory(completedJob);

      // Handle additional delivery options
      await Promise.allSettled([
        handleEmailDelivery(completedJob, downloadUrl),
        handleCloudStorage(completedJob, buffer)
      ]);

      return downloadUrl;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      const failedJob: ExcelExportJob = {
        ...job,
        status: 'failed',
        error: errorMessage,
        completedAt: new Date()
      };

      updateJob(jobId, failedJob);
      addToHistory(failedJob);
      
      throw error;
    } finally {
      abortControllers.current.delete(jobId);
      setIsExporting(false);
    }
  }, [
    jobs, 
    maxConcurrentJobs, 
    generateJobId, 
    updateJob, 
    addToHistory, 
    buildExcelFile, 
    createDownloadUrl, 
    handleEmailDelivery, 
    handleCloudStorage,
    options
  ]);

  const cancelExport = useCallback((jobId: string) => {
    const abortController = abortControllers.current.get(jobId);
    if (abortController) {
      abortController.abort();
      updateJob(jobId, { 
        status: 'cancelled', 
        completedAt: new Date() 
      });
    }
  }, [updateJob]);

  const cancelAllExports = useCallback(() => {
    abortControllers.current.forEach((controller, jobId) => {
      controller.abort();
      updateJob(jobId, { 
        status: 'cancelled', 
        completedAt: new Date() 
      });
    });
    abortControllers.current.clear();
    setIsExporting(false);
  }, [updateJob]);

  const getActiveJobs = useCallback(() => {
    return Array.from(jobs.values()).filter(job => 
      job.status === 'processing' || job.status === 'queued'
    );
  }, [jobs]);

  const getCompletedJobs = useCallback(() => {
    return exportHistory.filter(job => job.status === 'completed');
  }, [exportHistory]);

  const getFailedJobs = useCallback(() => {
    return exportHistory.filter(job => job.status === 'failed');
  }, [exportHistory]);

  const clearHistory = useCallback(() => {
    setExportHistory([]);
  }, []);

  const estimateFileSize = useCallback((
    sheets: ExcelSheet[],
    dataLength: number,
    compression: boolean = true
  ): number => {
    const totalColumns = sheets.reduce((sum, sheet) => sum + sheet.columns.length, 0);
    const hasFormulas = sheets.some(sheet => 
      sheet.columns.some(col => col.type === 'formula' || col.formula)
    );
    const hasCharts = sheets.some(sheet => sheet.charts && sheet.charts.length > 0);
    
    return ExcelUtils.estimateFileSize(dataLength, totalColumns, hasFormulas, hasCharts, compression);
  }, []);

  return {
    // Main export function
    exportToExcel,
    
    // Job management
    jobs: Array.from(jobs.values()),
    activeJobs: getActiveJobs(),
    completedJobs: getCompletedJobs(),
    failedJobs: getFailedJobs(),
    exportHistory,
    
    // State
    isExporting,
    
    // Actions
    cancelExport,
    cancelAllExports,
    clearHistory,
    
    // Utilities
    estimateFileSize,
    
    // Statistics
    stats: {
      totalExports: exportHistory.length,
      successfulExports: getCompletedJobs().length,
      failedExports: getFailedJobs().length,
      activeExports: getActiveJobs().length
    }
  };
}

export default useExcelExport;