import { BaseService } from './base.service';
import { prisma } from '@/lib/db/prisma';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import jsPDF from 'jspdf';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { AuthUser } from '@/lib/utils/auth';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  dateRange?: {
    from: Date;
    to: Date;
  };
  columns?: string[];
  filters?: Record<string, unknown>;
  includeHeaders?: boolean;
  maxRows?: number;
  emailDelivery?: {
    enabled: boolean;
    recipients: string[];
    subject?: string;
    message?: string;
  };
}

export interface ExportProgress {
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

export interface ExportJob {
  id: string;
  userId: string;
  dataType: string;
  options: ExportOptions;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRows: number;
  processedRows: number;
  filePath?: string;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class ExportService extends BaseService {
  private jobs: Map<string, ExportJob> = new Map();
  private readonly maxConcurrentJobs = 3;
  private readonly tempDir = path.join(process.cwd(), 'temp', 'exports');

  constructor() {
    super('ExportService');
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  async startExport(
    dataType: string,
    options: ExportOptions,
    user: AuthUser
  ): Promise<string> {
    return this.withLogging('startExport', async () => {
      const jobId = this.generateJobId();
      
      const job: ExportJob = {
        id: jobId,
        userId: user.id,
        dataType,
        options,
        status: 'pending',
        progress: 0,
        totalRows: 0,
        processedRows: 0,
        createdAt: new Date()
      };

      this.jobs.set(jobId, job);

      // Start processing in background
      this.processExport(jobId).catch(error => {
        console.error(`Export job ${jobId} failed:`, error);
        this.updateJobStatus(jobId, 'failed', error.message);
      });

      return jobId;
    });
  }

  async getExportStatus(jobId: string): Promise<ExportProgress | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      downloadUrl: job.downloadUrl,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    };
  }

  async getJobHistory(userId: string): Promise<ExportProgress[]> {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .map(job => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        downloadUrl: job.downloadUrl,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async processExport(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');

    try {
      this.updateJobStatus(jobId, 'processing');

      // Get data based on type
      const data = await this.fetchData(job.dataType, job.options);
      job.totalRows = data.length;
      this.jobs.set(jobId, job);

      // Generate file
      const filePath = await this.generateFile(data, job.options, jobId);
      job.filePath = filePath;
      job.downloadUrl = `/api/exports/download/${jobId}`;

      // Handle compression for large files
      if (data.length > 10000) {
        const compressedPath = await this.compressFile(filePath);
        job.filePath = compressedPath;
      }

      // Email delivery if requested
      if (job.options.emailDelivery?.enabled) {
        await this.sendEmailDelivery(job);
      }

      this.updateJobStatus(jobId, 'completed');
      job.completedAt = new Date();
      this.jobs.set(jobId, job);

    } catch (error) {
      this.updateJobStatus(jobId, 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async fetchData(dataType: string, options: ExportOptions): Promise<any[]> {
    const { dateRange, filters, maxRows = 50000 } = options;

    switch (dataType) {
      case 'customers':
        return this.fetchCustomers(dateRange, filters, maxRows);
      case 'leads':
        return this.fetchLeads(dateRange, filters, maxRows);
      case 'sales-orders':
        return this.fetchSalesOrders(dateRange, filters, maxRows);
      case 'quotations':
        return this.fetchQuotations(dateRange, filters, maxRows);
      case 'payments':
        return this.fetchPayments(dateRange, filters, maxRows);
      case 'inventory':
        return this.fetchInventory(dateRange, filters, maxRows);
      case 'purchase-orders':
        return this.fetchPurchaseOrders(dateRange, filters, maxRows);
      case 'invoices':
        return this.fetchInvoices(dateRange, filters, maxRows);
      case 'audit-logs':
        return this.fetchAuditLogs(dateRange, filters, maxRows);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  private async fetchCustomers(dateRange?: any, filters?: any, maxRows?: number): Promise<any[]> {
    const whereClause: any = {};
    
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    if (filters) {
      Object.assign(whereClause, filters);
    }

    return prisma.customer.findMany({
      where: whereClause,
      take: maxRows,
      include: {
        primaryContact: true,
        billingAddress: true,
        shippingAddress: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async fetchLeads(dateRange?: any, filters?: any, maxRows?: number): Promise<any[]> {
    const whereClause: any = {};
    
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    if (filters) {
      Object.assign(whereClause, filters);
    }

    return prisma.lead.findMany({
      where: whereClause,
      take: maxRows,
      include: {
        assignedTo: true,
        customer: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async fetchSalesOrders(dateRange?: { from: Date; to: Date }, filters?: Record<string, unknown>, maxRows?: number): Promise<unknown[]> {
    const whereClause: Record<string, unknown> = {};
    
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    if (filters) {
      Object.assign(whereClause, filters);
    }

    return prisma.salesOrder.findMany({
      where: whereClause,
      take: maxRows,
      include: {
        customer: true,
        items: {
          include: {
            item: true
          }
        },
        salesCase: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async fetchQuotations(dateRange?: { from: Date; to: Date }, filters?: Record<string, unknown>, maxRows?: number): Promise<unknown[]> {
    const whereClause: Record<string, unknown> = {};
    
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    if (filters) {
      Object.assign(whereClause, filters);
    }

    return prisma.quotation.findMany({
      where: whereClause,
      take: maxRows,
      include: {
        customer: true,
        items: {
          include: {
            item: true
          }
        },
        lead: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async fetchPayments(dateRange?: any, filters?: any, maxRows?: number): Promise<any[]> {
    const whereClause: any = {};
    
    if (dateRange) {
      whereClause.paymentDate = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    if (filters) {
      Object.assign(whereClause, filters);
    }

    return prisma.payment.findMany({
      where: whereClause,
      take: maxRows,
      include: {
        customer: true,
        invoice: true
      },
      orderBy: { paymentDate: 'desc' }
    });
  }

  private async fetchInventory(dateRange?: { from: Date; to: Date }, filters?: Record<string, unknown>, maxRows?: number): Promise<unknown[]> {
    const whereClause: Record<string, unknown> = {};
    
    if (filters) {
      Object.assign(whereClause, filters);
    }

    return prisma.item.findMany({
      where: whereClause,
      take: maxRows,
      include: {
        category: true,
        unitOfMeasure: true,
        stockMovements: dateRange ? {
          where: {
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to
            }
          }
        } : undefined
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async fetchPurchaseOrders(dateRange?: { from: Date; to: Date }, filters?: Record<string, unknown>, maxRows?: number): Promise<unknown[]> {
    const whereClause: Record<string, unknown> = {};
    
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    if (filters) {
      Object.assign(whereClause, filters);
    }

    return prisma.purchaseOrder.findMany({
      where: whereClause,
      take: maxRows,
      include: {
        supplier: true,
        items: {
          include: {
            item: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async fetchInvoices(dateRange?: any, filters?: any, maxRows?: number): Promise<any[]> {
    const whereClause: any = {};
    
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    if (filters) {
      Object.assign(whereClause, filters);
    }

    return prisma.invoice.findMany({
      where: whereClause,
      take: maxRows,
      include: {
        customer: true,
        salesOrder: true,
        items: {
          include: {
            item: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async fetchAuditLogs(dateRange?: any, filters?: any, maxRows?: number): Promise<any[]> {
    const whereClause: any = {};
    
    if (dateRange) {
      whereClause.timestamp = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    if (filters) {
      Object.assign(whereClause, filters);
    }

    return prisma.auditLog.findMany({
      where: whereClause,
      take: maxRows,
      include: {
        user: true
      },
      orderBy: { timestamp: 'desc' }
    });
  }

  private async generateFile(data: any[], options: ExportOptions, jobId: string): Promise<string> {
    const fileName = `export_${jobId}_${Date.now()}`;
    let filePath: string;

    switch (options.format) {
      case 'csv':
        filePath = path.join(this.tempDir, `${fileName}.csv`);
        await this.generateCSV(data, filePath, options);
        break;
      case 'excel':
        filePath = path.join(this.tempDir, `${fileName}.xlsx`);
        await this.generateExcel(data, filePath, options);
        break;
      case 'pdf':
        filePath = path.join(this.tempDir, `${fileName}.pdf`);
        await this.generatePDF(data, filePath, options);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    return filePath;
  }

  private async generateCSV(data: any[], filePath: string, options: ExportOptions): Promise<void> {
    const flattenedData = this.flattenData(data, options.columns);
    const csv = Papa.unparse(flattenedData, {
      header: options.includeHeaders !== false
    });
    
    await fs.writeFile(filePath, csv, 'utf8');
  }

  private async generateExcel(data: any[], filePath: string, options: ExportOptions): Promise<void> {
    const flattenedData = this.flattenData(data, options.columns);
    const ws = XLSX.utils.json_to_sheet(flattenedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Export');
    
    // Auto-fit columns
    const maxWidth = flattenedData.reduce((w, r) => Math.max(w, Object.values(r).join('').length), 10);
    ws['!cols'] = Object.keys(flattenedData[0] || {}).map(() => ({ wch: Math.min(maxWidth, 50) }));
    
    XLSX.writeFile(wb, filePath);
  }

  private async generatePDF(data: any[], filePath: string, options: ExportOptions): Promise<void> {
    const flattenedData = this.flattenData(data, options.columns);
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Data Export', 20, 20);
    
    // Add export info
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    doc.text(`Records: ${flattenedData.length}`, 20, 40);
    
    // Add table data (simplified for large datasets)
    let yPosition = 60;
    const pageHeight = doc.internal.pageSize.height;
    
    if (flattenedData.length > 0) {
      const headers = Object.keys(flattenedData[0]);
      const maxRowsPerPage = Math.floor((pageHeight - 80) / 10);
      
      // Headers
      doc.setFontSize(8);
      headers.forEach((header, index) => {
        doc.text(header, 20 + (index * 25), yPosition);
      });
      yPosition += 10;
      
      // Data rows (limit for PDF)
      const limitedData = flattenedData.slice(0, Math.min(500, flattenedData.length));
      
      limitedData.forEach((row, rowIndex) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        
        headers.forEach((header, colIndex) => {
          const value = String(row[header] || '').substring(0, 15);
          doc.text(value, 20 + (colIndex * 25), yPosition);
        });
        yPosition += 8;
      });
      
      if (flattenedData.length > 500) {
        doc.text(`Note: Only first 500 records shown. Total: ${flattenedData.length}`, 20, yPosition + 10);
      }
    }
    
    doc.save(filePath);
  }

  private flattenData(data: any[], selectedColumns?: string[]): any[] {
    if (!data.length) return [];

    return data.map(item => {
      const flattened = this.flattenObject(item);
      
      if (selectedColumns && selectedColumns.length > 0) {
        const filtered: any = {};
        selectedColumns.forEach(col => {
          if (flattened.hasOwnProperty(col)) {
            filtered[col] = flattened[col];
          }
        });
        return filtered;
      }
      
      return flattened;
    });
  }

  private flattenObject(obj: any, prefix = '', maxDepth = 3, currentDepth = 0): any {
    const flattened: any = {};
    
    if (currentDepth >= maxDepth) {
      flattened[prefix || 'data'] = JSON.stringify(obj);
      return flattened;
    }
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined) {
          flattened[newKey] = '';
        } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          Object.assign(flattened, this.flattenObject(value, newKey, maxDepth, currentDepth + 1));
        } else if (Array.isArray(value)) {
          flattened[newKey] = value.map(item => 
            typeof item === 'object' ? JSON.stringify(item) : String(item)
          ).join(', ');
        } else if (value instanceof Date) {
          flattened[newKey] = value.toISOString();
        } else {
          flattened[newKey] = String(value);
        }
      }
    }
    
    return flattened;
  }

  private async compressFile(filePath: string): Promise<string> {
    const compressedPath = filePath + '.zip';
    
    return new Promise((resolve, reject) => {
      const output = createWriteStream(compressedPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => resolve(compressedPath));
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.file(filePath, { name: path.basename(filePath) });
      archive.finalize();
    });
  }

  private async sendEmailDelivery(job: ExportJob): Promise<void> {
    // Email delivery implementation would go here
    // This would require configuring nodemailer with SMTP settings
    console.log('Email delivery requested for job:', job.id);
  }

  private updateJobStatus(jobId: string, status: ExportJob['status'], error?: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.progress = status === 'completed' ? 100 : status === 'failed' ? 0 : job.progress;
      if (error) job.error = error;
      this.jobs.set(jobId, job);
    }
  }

  private generateJobId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getAvailableColumns(dataType: string): Promise<string[]> {
    return this.withLogging('getAvailableColumns', async () => {
      switch (dataType) {
        case 'customers':
          return [
            'id', 'name', 'email', 'phone', 'status', 'creditLimit',
            'primaryContact.name', 'primaryContact.email', 'primaryContact.phone',
            'billingAddress.street', 'billingAddress.city', 'billingAddress.state',
            'createdAt', 'updatedAt'
          ];
        case 'leads':
          return [
            'id', 'title', 'status', 'priority', 'source', 'estimatedValue',
            'customer.name', 'assignedTo.username', 'createdAt', 'updatedAt'
          ];
        case 'sales-orders':
          return [
            'id', 'orderNumber', 'status', 'totalAmount', 'customer.name',
            'salesCase.title', 'createdAt', 'updatedAt'
          ];
        case 'quotations':
          return [
            'id', 'quotationNumber', 'status', 'totalAmount', 'validUntil',
            'customer.name', 'lead.title', 'createdAt', 'updatedAt'
          ];
        case 'payments':
          return [
            'id', 'amount', 'paymentMethod', 'paymentDate', 'status',
            'customer.name', 'invoice.invoiceNumber', 'createdAt'
          ];
        case 'inventory':
          return [
            'id', 'itemCode', 'name', 'category.name', 'unitOfMeasure.name',
            'unitPrice', 'stockQuantity', 'reorderLevel', 'createdAt', 'updatedAt'
          ];
        case 'purchase-orders':
          return [
            'id', 'orderNumber', 'status', 'totalAmount', 'supplier.name',
            'expectedDeliveryDate', 'createdAt', 'updatedAt'
          ];
        case 'invoices':
          return [
            'id', 'invoiceNumber', 'status', 'totalAmount', 'dueDate',
            'customer.name', 'salesOrder.orderNumber', 'createdAt', 'updatedAt'
          ];
        case 'audit-logs':
          return [
            'id', 'action', 'entityType', 'entityId', 'timestamp',
            'user.username', 'ipAddress', 'userAgent'
          ];
        default:
          return [];
      }
    });
  }

  async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old export file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error);
    }
  }
}