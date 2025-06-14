'use client';

import React, { useState, useCallback } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, PDFViewer as ReactPDFViewer, Font } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Eye, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    color: '#4B5563',
  },
  value: {
    width: '70%',
    color: '#1F2937',
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#E5E7EB',
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 8,
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
    padding: 8,
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableCell: {
    fontSize: 10,
    color: '#1F2937',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 48,
    color: '#F3F4F6',
    opacity: 0.3,
    fontWeight: 'bold',
    zIndex: -1,
  },
});

// Document Types
export interface PDFDocumentData {
  title: string;
  subtitle?: string;
  date?: string;
  company?: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };
  customer?: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totals?: {
    subtotal: number;
    tax?: number;
    discount?: number;
    total: number;
  };
  notes?: string;
  watermark?: string;
  customFields?: Record<string, any>;
}

export interface PDFGeneratorProps {
  /** Document data */
  data: PDFDocumentData;
  /** Document filename */
  filename?: string;
  /** Show preview button */
  showPreview?: boolean;
  /** Show download button */
  showDownload?: boolean;
  /** Custom button text */
  downloadText?: string;
  previewText?: string;
  /** Button styling */
  buttonVariant?: 'default' | 'outline' | 'ghost';
  buttonSize?: 'sm' | 'default' | 'lg';
  /** Custom styling */
  className?: string;
  /** Callbacks */
  onPreview?: () => void;
  onDownload?: () => void;
  onError?: (error: Error) => void;
}

// PDF Document Component
const PDFDocument: React.FC<{ data: PDFDocumentData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Watermark */}
      {data.watermark && (
        <Text style={styles.watermark}>{data.watermark}</Text>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{data.title}</Text>
          {data.subtitle && <Text style={styles.subtitle}>{data.subtitle}</Text>}
        </View>
        <View>
          {data.date && <Text>Date: {data.date}</Text>}
        </View>
      </View>

      {/* Company Information */}
      {data.company && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From</Text>
          <Text>{data.company.name}</Text>
          <Text>{data.company.address}</Text>
          {data.company.phone && <Text>Phone: {data.company.phone}</Text>}
          {data.company.email && <Text>Email: {data.company.email}</Text>}
        </View>
      )}

      {/* Customer Information */}
      {data.customer && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To</Text>
          <Text>{data.customer.name}</Text>
          <Text>{data.customer.address}</Text>
          {data.customer.phone && <Text>Phone: {data.customer.phone}</Text>}
          {data.customer.email && <Text>Email: {data.customer.email}</Text>}
        </View>
      )}

      {/* Custom Fields */}
      {data.customFields && Object.keys(data.customFields).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          {Object.entries(data.customFields).map(([key, value]) => (
            <View style={styles.row} key={key}>
              <Text style={styles.label}>{key}:</Text>
              <Text style={styles.value}>{String(value)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Items Table */}
      {data.items && data.items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableRow}>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Description</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Quantity</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Unit Price</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Total</Text>
              </View>
            </View>
            
            {/* Table Rows */}
            {data.items.map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{item.description}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{item.quantity}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>${item.unitPrice.toFixed(2)}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>${item.total.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Totals */}
      {data.totals && (
        <View style={[styles.section, { alignItems: 'flex-end' }]}>
          <View style={{ width: '40%' }}>
            <View style={styles.row}>
              <Text style={styles.label}>Subtotal:</Text>
              <Text style={styles.value}>${data.totals.subtotal.toFixed(2)}</Text>
            </View>
            {data.totals.discount && (
              <View style={styles.row}>
                <Text style={styles.label}>Discount:</Text>
                <Text style={styles.value}>-${data.totals.discount.toFixed(2)}</Text>
              </View>
            )}
            {data.totals.tax && (
              <View style={styles.row}>
                <Text style={styles.label}>Tax:</Text>
                <Text style={styles.value}>${data.totals.tax.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 5 }]}>
              <Text style={[styles.label, { fontWeight: 'bold' }]}>Total:</Text>
              <Text style={[styles.value, { fontWeight: 'bold' }]}>${data.totals.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Notes */}
      {data.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text>{data.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Generated on {new Date().toLocaleDateString()} - {data.title}
      </Text>
    </Page>
  </Document>
);

export const PDFGenerator: React.FC<PDFGeneratorProps> = ({
  data,
  filename,
  showPreview = true,
  showDownload = true,
  downloadText = 'Download PDF',
  previewText = 'Preview PDF',
  buttonVariant = 'default',
  buttonSize = 'default',
  className,
  onPreview,
  onDownload,
  onError,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePreview = useCallback(() => {
    setIsPreviewOpen(true);
    onPreview?.();
  }, [onPreview]);

  const handleDownload = useCallback(() => {
    setIsGenerating(true);
    onDownload?.();
    // Reset generating state after a delay
    setTimeout(() => setIsGenerating(false), 2000);
  }, [onDownload]);

  const handleError = useCallback((error: Error) => {
    console.error('PDF Generation Error:', error);
    onError?.(error);
  }, [onError]);

  const pdfFilename = filename || `${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {/* Preview Button */}
      {showPreview && (
        <Button
          variant={buttonVariant}
          size={buttonSize}
          onClick={handlePreview}
        >
          <Eye className="h-4 w-4 mr-2" />
          {previewText}
        </Button>
      )}

      {/* Download Button */}
      {showDownload && (
        <PDFDownloadLink
          document={<PDFDocument data={data} />}
          fileName={pdfFilename}
          className="inline-flex"
        >
          {({ blob, url, loading, error }) => (
            <Button
              variant={buttonVariant}
              size={buttonSize}
              disabled={loading || isGenerating}
              onClick={handleDownload}
            >
              {loading || isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Generating...' : downloadText}
            </Button>
          )}
        </PDFDownloadLink>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-red-500" />
                <h3 className="text-lg font-medium">PDF Preview</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewOpen(false)}
              >
                ×
              </Button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ReactPDFViewer width="100%" height="100%">
                <PDFDocument data={data} />
              </ReactPDFViewer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PDFGenerator;