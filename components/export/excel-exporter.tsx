'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Download, 
  FileSpreadsheet, 
  Settings, 
  PieChart,
  BarChart3,
  LineChart,
  Mail, 
  Cloud,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Columns3,
  Palette,
  Image,
  Calculator,
  Zap,
  RefreshCw,
  Save,
  Eye,
  PlayCircle,
  StopCircle,
  Trash2,
  Copy,
  FileDown,
  Database,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  FileX,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

// Types for Excel Export Configuration
export interface ExcelCellStyle {
  font?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    size?: number;
    name?: string;
  };
  fill?: {
    type?: 'pattern' | 'gradient';
    pattern?: string;
    fgColor?: string;
    bgColor?: string;
  };
  border?: {
    top?: { style: string; color?: string };
    bottom?: { style: string; color?: string };
    left?: { style: string; color?: string };
    right?: { style: string; color?: string };
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
  };
  numFmt?: string;
}

export interface ExcelColumnConfig {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage' | 'formula';
  width?: number;
  style?: ExcelCellStyle;
  format?: string;
  formula?: string;
  conditionalFormatting?: ExcelConditionalFormat[];
  dataValidation?: ExcelDataValidation;
  hidden?: boolean;
  frozen?: boolean;
}

export interface ExcelConditionalFormat {
  type: 'cellValue' | 'formula' | 'colorScale' | 'dataBar' | 'iconSet';
  operator?: 'equal' | 'notEqual' | 'greaterThan' | 'lessThan' | 'between' | 'contains';
  value1?: any;
  value2?: any;
  format?: ExcelCellStyle;
  formula?: string;
  colorScale?: {
    minColor: string;
    midColor?: string;
    maxColor: string;
  };
  iconSet?: string;
}

export interface ExcelDataValidation {
  type: 'list' | 'decimal' | 'whole' | 'date' | 'time' | 'textLength' | 'custom';
  operator?: 'between' | 'notBetween' | 'equal' | 'notEqual' | 'greaterThan' | 'lessThan';
  formula1?: string;
  formula2?: string;
  showDropdown?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  inputTitle?: string;
  inputMessage?: string;
}

export interface ExcelChart {
  type: 'column' | 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'combo';
  title: string;
  dataRange: string;
  position: {
    col: number;
    row: number;
    colOffset?: number;
    rowOffset?: number;
  };
  size?: {
    width: number;
    height: number;
  };
  series?: Array<{
    name: string;
    values: string;
    categories?: string;
  }>;
  options?: {
    showLegend?: boolean;
    showDataLabels?: boolean;
    gridlines?: boolean;
    theme?: string;
  };
}

export interface ExcelSheet {
  name: string;
  data: any[];
  columns: ExcelColumnConfig[];
  style?: {
    headerStyle?: ExcelCellStyle;
    alternateRowStyle?: ExcelCellStyle;
    defaultStyle?: ExcelCellStyle;
  };
  charts?: ExcelChart[];
  images?: Array<{
    path: string;
    position: { col: number; row: number };
    size?: { width: number; height: number };
  }>;
  pageSetup?: {
    orientation?: 'portrait' | 'landscape';
    paperSize?: string;
    margins?: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    };
    header?: string;
    footer?: string;
  };
  protection?: {
    sheet?: boolean;
    password?: string;
    allowedActions?: string[];
  };
  autoFilter?: boolean;
  freezePanes?: {
    row?: number;
    col?: number;
  };
}

export interface ExcelTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'inventory' | 'sales' | 'custom';
  sheets: ExcelSheet[];
  metadata?: {
    author?: string;
    company?: string;
    title?: string;
    subject?: string;
    keywords?: string[];
    created?: Date;
    modified?: Date;
  };
  thumbnail?: string;
}

export interface ExcelExportOptions {
  template?: ExcelTemplate;
  filename?: string;
  compression?: boolean;
  password?: string;
  emailDelivery?: {
    enabled: boolean;
    recipients: string[];
    subject: string;
    message: string;
    attachPassword?: boolean;
  };
  cloudStorage?: {
    enabled: boolean;
    provider: 'gdrive' | 'onedrive' | 'dropbox' | 's3';
    path?: string;
  };
  backgroundProcessing?: boolean;
  scheduling?: {
    enabled: boolean;
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    startDate: Date;
    endDate?: Date;
    time?: string;
  };
  dataTransformation?: {
    filters?: Record<string, any>;
    aggregations?: Array<{
      column: string;
      function: 'sum' | 'count' | 'avg' | 'min' | 'max';
    }>;
    groupBy?: string[];
    sort?: Array<{
      column: string;
      direction: 'asc' | 'desc';
    }>;
  };
}

export interface ExcelExportJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalRows: number;
  processedRows: number;
  currentSheet?: string;
  estimatedTimeRemaining?: number;
  downloadUrl?: string;
  fileSize?: number;
  error?: string;
  warnings?: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  options: ExcelExportOptions;
}

// Predefined Excel Templates
const EXCEL_TEMPLATES: ExcelTemplate[] = [
  {
    id: 'financial-report',
    name: 'Financial Report',
    description: 'Comprehensive financial reporting with charts and analysis',
    category: 'financial',
    sheets: [
      {
        name: 'Summary',
        data: [],
        columns: [
          { key: 'period', label: 'Period', type: 'string', width: 15 },
          { key: 'revenue', label: 'Revenue', type: 'currency', width: 15 },
          { key: 'expenses', label: 'Expenses', type: 'currency', width: 15 },
          { key: 'profit', label: 'Net Profit', type: 'currency', width: 15, formula: '=B{row}-C{row}' },
          { key: 'margin', label: 'Profit Margin', type: 'percentage', width: 15, formula: '=D{row}/B{row}' }
        ],
        charts: [
          {
            type: 'column',
            title: 'Revenue vs Expenses',
            dataRange: 'A1:C13',
            position: { col: 6, row: 2 },
            size: { width: 400, height: 300 }
          }
        ]
      }
    ]
  },
  {
    id: 'inventory-report',
    name: 'Inventory Analysis',
    description: 'Stock levels, valuation, and movement analysis',
    category: 'inventory',
    sheets: [
      {
        name: 'Stock Summary',
        data: [],
        columns: [
          { key: 'itemCode', label: 'Item Code', type: 'string', width: 15 },
          { key: 'name', label: 'Item Name', type: 'string', width: 25 },
          { key: 'category', label: 'Category', type: 'string', width: 15 },
          { key: 'quantity', label: 'Stock Qty', type: 'number', width: 12 },
          { key: 'unitPrice', label: 'Unit Price', type: 'currency', width: 15 },
          { key: 'totalValue', label: 'Total Value', type: 'currency', width: 15, formula: '=D{row}*E{row}' },
          { key: 'reorderLevel', label: 'Reorder Level', type: 'number', width: 15 },
          { key: 'status', label: 'Status', type: 'string', width: 12,
            conditionalFormatting: [
              {
                type: 'cellValue',
                operator: 'equal',
                value1: 'Low Stock',
                format: { fill: { type: 'pattern', pattern: 'solid', fgColor: 'FFFF00' } }
              },
              {
                type: 'cellValue',
                operator: 'equal',
                value1: 'Out of Stock',
                format: { fill: { type: 'pattern', pattern: 'solid', fgColor: 'FF0000' } }
              }
            ]
          }
        ],
        autoFilter: true,
        freezePanes: { row: 1 }
      }
    ]
  },
  {
    id: 'sales-report',
    name: 'Sales Performance',
    description: 'Sales analysis with customer and product breakdowns',
    category: 'sales',
    sheets: [
      {
        name: 'Sales Summary',
        data: [],
        columns: [
          { key: 'date', label: 'Date', type: 'date', width: 12 },
          { key: 'customerName', label: 'Customer', type: 'string', width: 25 },
          { key: 'orderNumber', label: 'Order #', type: 'string', width: 15 },
          { key: 'totalAmount', label: 'Amount', type: 'currency', width: 15 },
          { key: 'status', label: 'Status', type: 'string', width: 12 },
          { key: 'salesperson', label: 'Salesperson', type: 'string', width: 20 }
        ],
        charts: [
          {
            type: 'line',
            title: 'Sales Trend',
            dataRange: 'A1:D100',
            position: { col: 8, row: 2 },
            size: { width: 500, height: 300 }
          }
        ]
      }
    ]
  }
];

// Chart Configuration Options
const CHART_TYPES = [
  { value: 'column', label: 'Column Chart', icon: BarChart3 },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'line', label: 'Line Chart', icon: LineChart },
  { value: 'pie', label: 'Pie Chart', icon: PieChart },
  { value: 'area', label: 'Area Chart', icon: TrendingUp },
  { value: 'scatter', label: 'Scatter Plot', icon: Target }
];

// Color Themes
const COLOR_THEMES = [
  { name: 'Professional', colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'] },
  { name: 'Corporate', colors: ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#5D737E'] },
  { name: 'Modern', colors: ['#6C5CE7', '#FD79A8', '#FDCB6E', '#6C5CE7', '#55A3FF'] },
  { name: 'Earth Tones', colors: ['#8B4513', '#CD853F', '#DEB887', '#F4A460', '#D2691E'] }
];

export interface ExcelExporterProps {
  dataSource: string | (() => Promise<any[]>);
  defaultColumns?: ExcelColumnConfig[];
  onExportComplete?: (result: { downloadUrl: string; fileSize: number }) => void;
  onExportError?: (error: string) => void;
  className?: string;
  trigger?: React.ReactNode;
  allowTemplateSelection?: boolean;
  allowCustomColumns?: boolean;
  allowCharts?: boolean;
  maxRows?: number;
}

export function ExcelExporter({
  dataSource,
  defaultColumns = [],
  onExportComplete,
  onExportError,
  className,
  trigger,
  allowTemplateSelection = true,
  allowCustomColumns = true,
  allowCharts = true,
  maxRows = 100000
}: ExcelExporterProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('configure');
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState<ExcelExportJob | null>(null);
  const [jobHistory, setJobHistory] = useState<ExcelExportJob[]>([]);
  
  // Configuration State
  const [selectedTemplate, setSelectedTemplate] = useState<ExcelTemplate | null>(null);
  const [customTemplate, setCustomTemplate] = useState<boolean>(false);
  const [sheets, setSheets] = useState<ExcelSheet[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [options, setOptions] = useState<ExcelExportOptions>({
    compression: true,
    backgroundProcessing: true
  });

  // Data Processing State
  const [rawData, setRawData] = useState<any[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [dataPreview, setDataPreview] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState<number>(0);

  // UI State
  const [showPreview, setShowPreview] = useState(false);
  const [previewSheet, setPreviewSheet] = useState<number>(0);

  // Load initial data
  useEffect(() => {
    if (open && !rawData.length) {
      loadData();
    }
  }, [open]);

  // Initialize default configuration
  useEffect(() => {
    if (defaultColumns.length > 0 && sheets.length === 0) {
      setSheets([{
        name: 'Data',
        data: [],
        columns: defaultColumns,
        autoFilter: true,
        freezePanes: { row: 1 }
      }]);
    }
  }, [defaultColumns]);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      let data: any[];
      
      if (typeof dataSource === 'string') {
        const response = await fetch(dataSource);
        if (!response.ok) throw new Error('Failed to fetch data');
        data = await response.json();
      } else {
        data = await dataSource();
      }
      
      setRawData(data);
      setRowCount(data.length);
      setDataPreview(data.slice(0, 10)); // Preview first 10 rows
      setProcessedData(data);
    } catch (error) {
      console.error('Failed to load data:', error);
      if (onExportError) {
        onExportError(`Failed to load data: ${error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template: ExcelTemplate) => {
    setSelectedTemplate(template);
    setSheets(template.sheets.map(sheet => ({
      ...sheet,
      data: processedData
    })));
    setFilename(template.name.replace(/\s+/g, '_') + '_' + format(new Date(), 'yyyy-MM-dd'));
  };

  const createCustomSheet = () => {
    const newSheet: ExcelSheet = {
      name: `Sheet${sheets.length + 1}`,
      data: processedData,
      columns: defaultColumns.length > 0 ? defaultColumns : [
        { key: 'column1', label: 'Column 1', type: 'string', width: 15 }
      ],
      autoFilter: true,
      freezePanes: { row: 1 }
    };
    setSheets([...sheets, newSheet]);
  };

  const updateSheet = (index: number, updates: Partial<ExcelSheet>) => {
    const updatedSheets = [...sheets];
    updatedSheets[index] = { ...updatedSheets[index], ...updates };
    setSheets(updatedSheets);
  };

  const addColumn = (sheetIndex: number) => {
    const sheet = sheets[sheetIndex];
    const newColumn: ExcelColumnConfig = {
      key: `column${sheet.columns.length + 1}`,
      label: `Column ${sheet.columns.length + 1}`,
      type: 'string',
      width: 15
    };
    
    updateSheet(sheetIndex, {
      columns: [...sheet.columns, newColumn]
    });
  };

  const updateColumn = (sheetIndex: number, columnIndex: number, updates: Partial<ExcelColumnConfig>) => {
    const sheet = sheets[sheetIndex];
    const updatedColumns = [...sheet.columns];
    updatedColumns[columnIndex] = { ...updatedColumns[columnIndex], ...updates };
    
    updateSheet(sheetIndex, { columns: updatedColumns });
  };

  const addChart = (sheetIndex: number) => {
    const sheet = sheets[sheetIndex];
    const newChart: ExcelChart = {
      type: 'column',
      title: 'Chart Title',
      dataRange: 'A1:B10',
      position: { col: sheet.columns.length + 2, row: 2 },
      size: { width: 400, height: 300 }
    };
    
    updateSheet(sheetIndex, {
      charts: [...(sheet.charts || []), newChart]
    });
  };

  const processDataWithTransformation = (data: any[], transformation: ExcelExportOptions['dataTransformation']) => {
    let result = [...data];
    
    if (!transformation) return result;

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
      // Implementation would depend on specific requirements
      // This is a simplified version
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

    return result.slice(0, maxRows);
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const generateExcelFile = async (): Promise<ArrayBuffer> => {
    const workbook = XLSX.utils.book_new();
    
    for (const sheet of sheets) {
      const data = processDataWithTransformation(sheet.data, options.dataTransformation);
      
      // Prepare worksheet data
      const wsData: any[][] = [];
      
      // Add headers
      const headers = sheet.columns.map(col => col.label);
      wsData.push(headers);
      
      // Add data rows
      data.forEach(row => {
        const rowData = sheet.columns.map(col => {
          let value = getNestedValue(row, col.key);
          
          // Apply column formatting
          if (col.type === 'currency' && typeof value === 'number') {
            return value;
          } else if (col.type === 'date' && value) {
            return new Date(value);
          } else if (col.type === 'boolean') {
            return value ? 'Yes' : 'No';
          } else if (col.formula) {
            // Handle formulas (simplified)
            return col.formula.replace('{row}', (wsData.length + 1).toString());
          }
          
          return value ?? '';
        });
        wsData.push(rowData);
      });
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Apply column widths
      const colWidths = sheet.columns.map(col => ({ wch: col.width || 15 }));
      ws['!cols'] = colWidths;
      
      // Apply auto filter
      if (sheet.autoFilter && wsData.length > 1) {
        ws['!autofilter'] = { ref: XLSX.utils.encode_range({
          s: { c: 0, r: 0 },
          e: { c: sheet.columns.length - 1, r: wsData.length - 1 }
        })};
      }
      
      // Apply freeze panes
      if (sheet.freezePanes) {
        ws['!freeze'] = {
          xSplit: sheet.freezePanes.col || 0,
          ySplit: sheet.freezePanes.row || 0
        };
      }
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
    }
    
    // Apply workbook metadata
    if (selectedTemplate?.metadata) {
      workbook.Props = {
        Title: selectedTemplate.metadata.title,
        Subject: selectedTemplate.metadata.subject,
        Author: selectedTemplate.metadata.author,
        Company: selectedTemplate.metadata.company,
        CreatedDate: new Date()
      };
    }
    
    // Generate buffer
    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      compression: options.compression
    });
    
    return buffer;
  };

  const startExport = async (): Promise<unknown> => {
    if (!sheets.length || !processedData.length) {
      if (onExportError) {
        onExportError('No data or sheets configured for export');
      }
      return;
    }

    setLoading(true);
    try {
      // Create export job
      const jobId = generateJobId();
      const job: ExcelExportJob = {
        id: jobId,
        status: 'processing',
        progress: 0,
        totalRows: processedData.length,
        processedRows: 0,
        createdAt: new Date(),
        startedAt: new Date(),
        options: { ...options }
      };
      
      setCurrentJob(job);
      setActiveTab('progress');

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setCurrentJob(prev => {
          if (!prev || prev.status !== 'processing') return prev;
          
          const newProgress = Math.min(prev.progress + Math.random() * 10, 95);
          return {
            ...prev,
            progress: newProgress,
            processedRows: Math.floor((newProgress / 100) * prev.totalRows)
          };
        });
      }, 500);

      // Generate Excel file
      const buffer = await generateExcelFile();
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      // Create download URL
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = URL.createObjectURL(blob);
      
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
      
      setCurrentJob(completedJob);
      setJobHistory(prev => [completedJob, ...prev.slice(0, 9)]); // Keep last 10 jobs
      
      // Handle email delivery
      if (options.emailDelivery?.enabled) {
        await handleEmailDelivery(completedJob);
      }
      
      // Handle cloud storage
      if (options.cloudStorage?.enabled) {
        await handleCloudStorage(completedJob);
      }
      
      if (onExportComplete) {
        onExportComplete({
          downloadUrl,
          fileSize: buffer.byteLength
        });
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      
      const failedJob: ExcelExportJob = {
        ...currentJob!,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        completedAt: new Date()
      };
      
      setCurrentJob(failedJob);
      
      if (onExportError) {
        onExportError(failedJob.error!);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateJobId = (): string => {
    return `excel_export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleEmailDelivery = async (job: ExcelExportJob): Promise<void> => {
    // Implementation for email delivery
    // This would integrate with your email service
    console.log('Email delivery would be implemented here', job);
  };

  const handleCloudStorage = async (job: ExcelExportJob): Promise<void> => {
    // Implementation for cloud storage upload
    // This would integrate with your cloud storage provider
    console.log('Cloud storage upload would be implemented here', job);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const estimatedFileSize = useMemo(() => {
    if (!sheets.length || !processedData.length) return 0;
    
    const avgCellSize = 20; // Average bytes per cell
    const totalCells = sheets.reduce((sum, sheet) => 
      sum + (sheet.columns.length * processedData.length), 0
    );
    
    return totalCells * avgCellSize * (options.compression ? 0.3 : 1); // Compression reduces size by ~70%
  }, [sheets, processedData, options.compression]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className={className}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel Export
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Advanced Excel Exporter
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="space-y-6">
            {/* Data Source Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Data Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Total Rows</div>
                    <div className="font-medium text-lg">{rowCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Estimated Size</div>
                    <div className="font-medium text-lg">{formatFileSize(estimatedFileSize)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Processing Time</div>
                    <div className="font-medium text-lg">~{Math.ceil(rowCount / 1000)}s</div>
                  </div>
                </div>
                
                {dataPreview.length > 0 && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {showPreview ? 'Hide' : 'Show'} Data Preview
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Preview */}
            {showPreview && dataPreview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Data Preview (First 10 Rows)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {Object.keys(dataPreview[0]).slice(0, 8).map(key => (
                            <th key={key} className="text-left p-2 font-medium">
                              {key}
                            </th>
                          ))}
                          {Object.keys(dataPreview[0]).length > 8 && (
                            <th className="text-left p-2 font-medium">...</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {dataPreview.map((row, index) => (
                          <tr key={index} className="border-b">
                            {Object.values(row).slice(0, 8).map((value: any, colIndex) => (
                              <td key={colIndex} className="p-2">
                                {String(value).substring(0, 50)}
                                {String(value).length > 50 && '...'}
                              </td>
                            ))}
                            {Object.keys(row).length > 8 && (
                              <td className="p-2 text-gray-400">...</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Template Selection */}
            {allowTemplateSelection && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Excel Templates
                  </CardTitle>
                  <CardDescription>
                    Choose a pre-built template or create a custom configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {EXCEL_TEMPLATES.map(template => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => applyTemplate(template)}
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {template.description}
                        </div>
                        <Badge variant="secondary" className="mt-2">
                          {template.category}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomTemplate(true);
                        setSelectedTemplate(null);
                        createCustomSheet();
                      }}
                    >
                      <Settings2 className="w-4 h-4 mr-2" />
                      Create Custom
                    </Button>
                    {selectedTemplate && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplate(null);
                          setSheets([]);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Clear Selection
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sheets Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Sheets Configuration
                  </span>
                  <Button size="sm" onClick={createCustomSheet}>
                    Add Sheet
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sheets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <div>No sheets configured</div>
                    <div className="text-sm">Select a template or create a custom sheet</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sheets.map((sheet, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Input
                            value={sheet.name}
                            onChange={(e) => updateSheet(index, { name: e.target.value })}
                            className="font-medium max-w-48"
                          />
                          <div className="flex gap-2">
                            <Badge variant="outline">
                              {sheet.columns.length} columns
                            </Badge>
                            {sheet.charts && sheet.charts.length > 0 && (
                              <Badge variant="outline">
                                {sheet.charts.length} charts
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSheets(sheets.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`autofilter-${index}`}
                              checked={sheet.autoFilter || false}
                              onCheckedChange={(checked) => 
                                updateSheet(index, { autoFilter: checked as boolean })
                              }
                            />
                            <Label htmlFor={`autofilter-${index}`}>Auto Filter</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`freeze-${index}`}
                              checked={!!sheet.freezePanes}
                              onCheckedChange={(checked) => 
                                updateSheet(index, { 
                                  freezePanes: checked ? { row: 1 } : undefined 
                                })
                              }
                            />
                            <Label htmlFor={`freeze-${index}`}>Freeze Header</Label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  File Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="filename">Filename</Label>
                  <Input
                    id="filename"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="Export_2024-01-01"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Final filename: {filename || 'Export_' + format(new Date(), 'yyyy-MM-dd')}.xlsx
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="columns" className="space-y-6">
            {sheets.map((sheet, sheetIndex) => (
              <Card key={sheetIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{sheet.name} - Columns</span>
                    <Button size="sm" onClick={() => addColumn(sheetIndex)}>
                      <Columns3 className="w-4 h-4 mr-2" />
                      Add Column
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sheet.columns.map((column, columnIndex) => (
                      <div key={columnIndex} className="grid grid-cols-5 gap-4 p-4 border rounded-lg">
                        <div>
                          <Label>Key</Label>
                          <Input
                            value={column.key}
                            onChange={(e) => updateColumn(sheetIndex, columnIndex, { key: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Label</Label>
                          <Input
                            value={column.label}
                            onChange={(e) => updateColumn(sheetIndex, columnIndex, { label: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select
                            value={column.type}
                            onValueChange={(value: any) => updateColumn(sheetIndex, columnIndex, { type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">String</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="currency">Currency</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="formula">Formula</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Width</Label>
                          <Input
                            type="number"
                            value={column.width || 15}
                            onChange={(e) => updateColumn(sheetIndex, columnIndex, { width: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updatedColumns = sheet.columns.filter((_, i) => i !== columnIndex);
                              updateSheet(sheetIndex, { columns: updatedColumns });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {column.type === 'formula' && (
                          <div className="col-span-5">
                            <Label>Formula</Label>
                            <Input
                              value={column.formula || ''}
                              onChange={(e) => updateColumn(sheetIndex, columnIndex, { formula: e.target.value })}
                              placeholder="=A{row}+B{row}"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              Use {'{row}'} placeholder for current row number
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            {allowCharts ? (
              sheets.map((sheet, sheetIndex) => (
                <Card key={sheetIndex}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{sheet.name} - Charts</span>
                      <Button size="sm" onClick={() => addChart(sheetIndex)}>
                        <PieChart className="w-4 h-4 mr-2" />
                        Add Chart
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!sheet.charts || sheet.charts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <div>No charts configured</div>
                        <div className="text-sm">Add charts to visualize your data</div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sheet.charts.map((chart, chartIndex) => (
                          <div key={chartIndex} className="border rounded-lg p-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label>Chart Type</Label>
                                <Select
                                  value={chart.type}
                                  onValueChange={(value: any) => {
                                    const updatedCharts = [...sheet.charts!];
                                    updatedCharts[chartIndex] = { ...chart, type: value };
                                    updateSheet(sheetIndex, { charts: updatedCharts });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CHART_TYPES.map(type => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Title</Label>
                                <Input
                                  value={chart.title}
                                  onChange={(e) => {
                                    const updatedCharts = [...sheet.charts!];
                                    updatedCharts[chartIndex] = { ...chart, title: e.target.value };
                                    updateSheet(sheetIndex, { charts: updatedCharts });
                                  }}
                                />
                              </div>
                              <div>
                                <Label>Data Range</Label>
                                <Input
                                  value={chart.dataRange}
                                  onChange={(e) => {
                                    const updatedCharts = [...sheet.charts!];
                                    updatedCharts[chartIndex] = { ...chart, dataRange: e.target.value };
                                    updateSheet(sheetIndex, { charts: updatedCharts });
                                  }}
                                  placeholder="A1:C10"
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-end mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const updatedCharts = sheet.charts!.filter((_, i) => i !== chartIndex);
                                  updateSheet(sheetIndex, { charts: updatedCharts });
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove Chart
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <FileX className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <div>Charts are not available</div>
                  <div className="text-sm">Chart functionality is disabled for this export</div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="options" className="space-y-6">
            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Export Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="compression"
                      checked={options.compression || false}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, compression: checked as boolean }))}
                    />
                    <Label htmlFor="compression">Enable Compression</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="background"
                      checked={options.backgroundProcessing || false}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, backgroundProcessing: checked as boolean }))}
                    />
                    <Label htmlFor="background">Background Processing</Label>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="password">Password Protection (Optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={options.password || ''}
                    onChange={(e) => setOptions(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Leave empty for no password"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Email Delivery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-enabled"
                    checked={options.emailDelivery?.enabled || false}
                    onCheckedChange={(checked) => setOptions(prev => ({
                      ...prev,
                      emailDelivery: {
                        ...prev.emailDelivery,
                        enabled: checked as boolean,
                        recipients: prev.emailDelivery?.recipients || [],
                        subject: prev.emailDelivery?.subject || 'Excel Export',
                        message: prev.emailDelivery?.message || 'Your Excel export is attached.'
                      }
                    }))}
                  />
                  <Label htmlFor="email-enabled">Enable Email Delivery</Label>
                </div>
                
                {options.emailDelivery?.enabled && (
                  <>
                    <div>
                      <Label htmlFor="email-recipients">Recipients</Label>
                      <Input
                        id="email-recipients"
                        value={options.emailDelivery.recipients.join(', ')}
                        onChange={(e) => setOptions(prev => ({
                          ...prev,
                          emailDelivery: {
                            ...prev.emailDelivery!,
                            recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                          }
                        }))}
                        placeholder="email1@example.com, email2@example.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email-subject">Subject</Label>
                      <Input
                        id="email-subject"
                        value={options.emailDelivery.subject}
                        onChange={(e) => setOptions(prev => ({
                          ...prev,
                          emailDelivery: {
                            ...prev.emailDelivery!,
                            subject: e.target.value
                          }
                        }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email-message">Message</Label>
                      <Textarea
                        id="email-message"
                        value={options.emailDelivery.message}
                        onChange={(e) => setOptions(prev => ({
                          ...prev,
                          emailDelivery: {
                            ...prev.emailDelivery!,
                            message: e.target.value
                          }
                        }))}
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Cloud Storage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="w-4 h-4" />
                  Cloud Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cloud-enabled"
                    checked={options.cloudStorage?.enabled || false}
                    onCheckedChange={(checked) => setOptions(prev => ({
                      ...prev,
                      cloudStorage: {
                        ...prev.cloudStorage,
                        enabled: checked as boolean,
                        provider: prev.cloudStorage?.provider || 'gdrive'
                      }
                    }))}
                  />
                  <Label htmlFor="cloud-enabled">Upload to Cloud Storage</Label>
                </div>
                
                {options.cloudStorage?.enabled && (
                  <>
                    <div>
                      <Label htmlFor="cloud-provider">Provider</Label>
                      <Select
                        value={options.cloudStorage.provider}
                        onValueChange={(value: any) => setOptions(prev => ({
                          ...prev,
                          cloudStorage: {
                            ...prev.cloudStorage!,
                            provider: value
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gdrive">Google Drive</SelectItem>
                          <SelectItem value="onedrive">OneDrive</SelectItem>
                          <SelectItem value="dropbox">Dropbox</SelectItem>
                          <SelectItem value="s3">Amazon S3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="cloud-path">Upload Path</Label>
                      <Input
                        id="cloud-path"
                        value={options.cloudStorage.path || ''}
                        onChange={(e) => setOptions(prev => ({
                          ...prev,
                          cloudStorage: {
                            ...prev.cloudStorage!,
                            path: e.target.value
                          }
                        }))}
                        placeholder="/exports/excel/"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Data Transformation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Data Transformation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Maximum Rows</Label>
                  <Input
                    type="number"
                    value={maxRows}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 100000;
                      // Update maxRows would need to be passed as prop or managed differently
                    }}
                    min={1}
                    max={1000000}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Current data: {processedData.length.toLocaleString()} rows
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4" />
                    <span className="font-medium">Advanced transformations available:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 ml-6">
                    <li>Data filtering and search</li>
                    <li>Column sorting and grouping</li>
                    <li>Aggregation functions (sum, count, avg, min, max)</li>
                    <li>Custom formulas and calculations</li>
                    <li>Conditional formatting</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {currentJob ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {currentJob.status === 'processing' && <Clock className="w-4 h-4 animate-spin" />}
                    {currentJob.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {currentJob.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                    {currentJob.status === 'cancelled' && <StopCircle className="w-4 h-4 text-orange-500" />}
                    Export Progress
                  </CardTitle>
                  <CardDescription>
                    Job ID: {currentJob.id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Progress</span>
                      <span>{currentJob.progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={currentJob.progress} className="h-3" />
                  </div>
                  
                  {/* Current Operation */}
                  {currentJob.currentSheet && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-center gap-2 text-blue-800">
                        <Zap className="w-4 h-4" />
                        <span className="font-medium">Processing Sheet: {currentJob.currentSheet}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Status</div>
                      <div className="font-medium capitalize flex items-center gap-2">
                        {currentJob.status}
                        {currentJob.status === 'processing' && (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Rows</div>
                      <div className="font-medium">{currentJob.totalRows.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Processed</div>
                      <div className="font-medium">{currentJob.processedRows.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Time Elapsed</div>
                      <div className="font-medium">
                        {currentJob.startedAt ? 
                          formatDuration(Date.now() - currentJob.startedAt.getTime()) : 
                          '0s'
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* File Size */}
                  {currentJob.fileSize && (
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm">
                        <strong>File Size:</strong> {formatFileSize(currentJob.fileSize)}
                      </div>
                    </div>
                  )}
                  
                  {/* Warnings */}
                  {currentJob.warnings && currentJob.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <div className="flex items-center gap-2 text-yellow-800 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">Warnings</span>
                      </div>
                      <ul className="text-yellow-700 text-sm space-y-1">
                        {currentJob.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Error */}
                  {currentJob.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="flex items-center gap-2 text-red-800 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Export Failed</span>
                      </div>
                      <div className="text-red-600 text-sm">{currentJob.error}</div>
                    </div>
                  )}
                  
                  {/* Success */}
                  {currentJob.downloadUrl && currentJob.status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-green-800 mb-1">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Export Complete!</span>
                          </div>
                          <div className="text-green-600 text-sm">
                            Your Excel file is ready for download
                            {currentJob.fileSize && ` (${formatFileSize(currentJob.fileSize)})`}
                          </div>
                        </div>
                        <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
                          <a href={currentJob.downloadUrl} download>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {currentJob.status === 'processing' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
                        }}
                      >
                        <StopCircle className="w-4 h-4 mr-2" />
                        Cancel Export
                      </Button>
                    )}
                    
                    {(currentJob.status === 'failed' || currentJob.status === 'cancelled') && (
                      <Button onClick={startExport}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry Export
                      </Button>
                    )}
                    
                    {currentJob.status === 'completed' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentJob(null);
                          setActiveTab('configure');
                        }}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        New Export
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <div>No active export job</div>
                <div className="text-sm">Configure your export and click "Start Export" to begin</div>
              </div>
            )}
            
            {/* Export History */}
            {jobHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Exports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {jobHistory.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          {job.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {job.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                          <div>
                            <div className="font-medium text-sm">
                              Excel Export
                              {job.fileSize && ` (${formatFileSize(job.fileSize)})`}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(job.createdAt, 'PPp')}
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
                                <FileDown className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={startExport}
            disabled={loading || !sheets.length || !processedData.length || currentJob?.status === 'processing'}
            className="min-w-32"
          >
            {loading || currentJob?.status === 'processing' ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Start Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExcelExporter;