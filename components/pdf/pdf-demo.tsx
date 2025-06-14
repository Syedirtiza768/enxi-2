'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  PDFViewer, 
  PDFUpload, 
  PDFModal, 
  PDFGenerator,
  type PDFDocumentData 
} from '@/components/pdf';
import { pdfService } from '@/lib/services/pdf.service';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Settings, 
  Search,
  Merge,
  Split,
  Image as ImageIcon
} from 'lucide-react';

export const PDFDemo: React.FC = (): void => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Sample document data for PDF generation
  const [documentData, setDocumentData] = useState<PDFDocumentData>({
    title: 'Sample Invoice',
    subtitle: 'INV-2024-001',
    date: new Date().toLocaleDateString(),
    company: {
      name: 'Enxi ERP Solutions',
      address: '123 Business Street, Dubai, UAE',
      phone: '+971-4-123-4567',
      email: 'info@enxi.com',
    },
    customer: {
      name: 'ABC Trading LLC',
      address: '456 Commerce Ave, Dubai, UAE',
      phone: '+971-4-987-6543',
      email: 'contact@abctrading.com',
    },
    items: [
      {
        description: 'Marine Engine Service',
        quantity: 1,
        unitPrice: 2500.00,
        total: 2500.00,
      },
      {
        description: 'Replacement Parts',
        quantity: 3,
        unitPrice: 150.00,
        total: 450.00,
      },
      {
        description: 'Labor Hours',
        quantity: 8,
        unitPrice: 75.00,
        total: 600.00,
      },
    ],
    totals: {
      subtotal: 3550.00,
      tax: 177.50,
      total: 3727.50,
    },
    notes: 'Thank you for your business. Payment is due within 30 days.',
    watermark: 'SAMPLE',
    customFields: {
      'PO Number': 'PO-2024-ABC-001',
      'Due Date': '2024-01-30',
      'Payment Terms': 'Net 30',
    },
  });

  // File upload handler
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    toast({
      title: 'File Selected',
      description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
    });
  }, []);

  // File remove handler
  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    toast({
      title: 'File Removed',
      description: 'PDF file has been removed',
    });
  }, []);

  // PDF URL handler
  const handleUrlLoad = useCallback(() => {
    if (!pdfUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid PDF URL',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'PDF URL Loaded',
      description: 'PDF will be loaded from the provided URL',
    });
  }, [pdfUrl]);

  // PDF search handler
  const handlePDFSearch = useCallback(async () => {
    if (!selectedFile && !pdfUrl) {
      toast({
        title: 'Error',
        description: 'Please select a PDF file or enter a URL first',
        variant: 'destructive',
      });
      return;
    }

    if (!searchTerm.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a search term',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await pdfService.searchInPDF(
        selectedFile || pdfUrl,
        searchTerm,
        { caseSensitive: false }
      );

      if (result.success) {
        toast({
          title: 'Search Complete',
          description: `Found ${result.results?.length || 0} results`,
        });
      } else {
        throw new Error(result.error || 'Search failed');
      }
    } catch (error) {
      toast({
        title: 'Search Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, pdfUrl, searchTerm]);

  // PDF text extraction
  const handleExtractText = useCallback(async () => {
    if (!selectedFile && !pdfUrl) {
      toast({
        title: 'Error',
        description: 'Please select a PDF file or enter a URL first',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await pdfService.extractText(selectedFile || pdfUrl);

      if (result.success) {
        toast({
          title: 'Text Extracted',
          description: `Extracted ${result.text?.length || 0} characters`,
        });
        // You could display the extracted text in a modal or download it
      } else {
        throw new Error(result.error || 'Text extraction failed');
      }
    } catch (error) {
      toast({
        title: 'Extraction Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, pdfUrl]);

  // Convert PDF to images
  const handleConvertToImages = useCallback(async () => {
    if (!selectedFile && !pdfUrl) {
      toast({
        title: 'Error',
        description: 'Please select a PDF file or enter a URL first',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await pdfService.convertToImages(
        selectedFile || pdfUrl,
        { format: 'png', quality: 0.8 }
      );

      if (result.success) {
        toast({
          title: 'Images Generated',
          description: `Generated ${result.images?.length || 0} images`,
        });
      } else {
        throw new Error(result.error || 'Image conversion failed');
      }
    } catch (error) {
      toast({
        title: 'Conversion Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, pdfUrl]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">PDF Management System</h1>
        <p className="text-gray-600">
          Comprehensive PDF viewing, generation, and processing capabilities for the ERP system
        </p>
      </div>

      <Tabs defaultValue="viewer" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="viewer">Viewer</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="modal">Modal</TabsTrigger>
        </TabsList>

        {/* PDF Viewer Tab */}
        <TabsContent value="viewer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>PDF Viewer</span>
              </CardTitle>
              <CardDescription>
                Advanced PDF viewing with zoom, navigation, search, and full-screen capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* URL Input */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter PDF URL (e.g., https://example.com/sample.pdf)"
                    value={pdfUrl}
                    onChange={(e): void => setPdfUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleUrlLoad}>Load URL</Button>
                </div>

                {/* PDF Viewer */}
                <div className="border rounded-lg" style={{ height: '600px' }}>
                  <PDFViewer
                    file={selectedFile || (pdfUrl ? pdfUrl : null)}
                    title="Demo PDF Document"
                    showThumbnails={true}
                    allowFullScreen={true}
                    allowDownload={true}
                    allowPrint={true}
                    allowSearch={true}
                    onError={(error): void => {
                      toast({
                        title: 'PDF Error',
                        description: error.message,
                        variant: 'destructive',
                      });
                    }}
                    onLoadSuccess={(pdf): void => {
                      toast({
                        title: 'PDF Loaded',
                        description: `Document loaded with ${pdf.numPages} pages`,
                      });
                    }}
                    security={{
                      disableRightClick: false,
                      disableTextSelection: false,
                      watermark: 'DEMO',
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>PDF Upload</span>
              </CardTitle>
              <CardDescription>
                Upload PDF files with drag-and-drop support and file validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PDFUpload
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                selectedFile={selectedFile}
                maxSizeMB={50}
                showPreview={true}
                uploadText="Drop your PDF files here or click to browse"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF Generator Tab */}
        <TabsContent value="generator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>PDF Generator</span>
              </CardTitle>
              <CardDescription>
                Generate professional PDF documents from business data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Document Data Form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Document Title</Label>
                  <Input
                    value={documentData.title}
                    onChange={(e): void => setDocumentData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <Input
                    value={documentData.subtitle || ''}
                    onChange={(e): void => setDocumentData(prev => ({ ...prev, subtitle: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={documentData.notes || ''}
                  onChange={(e): void => setDocumentData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* PDF Generation Buttons */}
              <div className="flex space-x-2">
                <PDFGenerator
                  data={documentData}
                  filename={`${documentData.title.replace(/\s+/g, '_')}.pdf`}
                  showPreview={true}
                  showDownload={true}
                  onPreview={(): void => {
                    toast({
                      title: 'PDF Preview',
                      description: 'Opening PDF preview...',
                    });
                  }}
                  onDownload={(): void => {
                    toast({
                      title: 'PDF Download',
                      description: 'PDF download started',
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF Processing Tab */}
        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>PDF Processing</span>
              </CardTitle>
              <CardDescription>
                Advanced PDF processing operations like search, text extraction, and conversion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search in PDF</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter search term..."
                    value={searchTerm}
                    onChange={(e): void => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handlePDFSearch}
                    disabled={isProcessing}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>

              {/* Processing Actions */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={handleExtractText}
                  disabled={isProcessing}
                  className="h-20 flex-col"
                >
                  <FileText className="h-6 w-6 mb-2" />
                  Extract Text
                </Button>

                <Button
                  variant="outline"
                  onClick={handleConvertToImages}
                  disabled={isProcessing}
                  className="h-20 flex-col"
                >
                  <ImageIcon className="h-6 w-6 mb-2" />
                  Convert to Images
                </Button>
              </div>

              {/* Additional Processing Options */}
              <div className="flex space-x-2">
                <Button variant="outline" disabled>
                  <Merge className="h-4 w-4 mr-2" />
                  Merge PDFs
                </Button>
                <Button variant="outline" disabled>
                  <Split className="h-4 w-4 mr-2" />
                  Split PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF Modal Tab */}
        <TabsContent value="modal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>PDF Modal</span>
              </CardTitle>
              <CardDescription>
                PDF viewer in modal dialog for quick document preview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="mb-4">Click the button below to open the PDF in a modal dialog</p>
                
                <PDFModal
                  file={selectedFile || (pdfUrl ? pdfUrl : null)}
                  modalTitle="Sample PDF Document"
                  size="full"
                  showHeader={true}
                  allowFullScreen={true}
                  allowDownload={true}
                  allowPrint={true}
                  trigger={
                    <Button>
                      <Eye className="h-4 w-4 mr-2" />
                      Open PDF Modal
                    </Button>
                  }
                />
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Modal Features:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Full-screen and responsive modal</li>
                  <li>All PDF viewer features included</li>
                  <li>Customizable modal size</li>
                  <li>Auto-open functionality</li>
                  <li>Custom trigger elements</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Features Summary</CardTitle>
          <CardDescription>
            Complete PDF management solution for the Enxi ERP system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Core Viewing</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• PDF rendering</li>
                <li>• Zoom controls</li>
                <li>• Page navigation</li>
                <li>• Full-screen mode</li>
                <li>• Thumbnails sidebar</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">File Management</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Drag & drop upload</li>
                <li>• File validation</li>
                <li>• URL loading</li>
                <li>• Download support</li>
                <li>• Print functionality</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Advanced Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Text search</li>
                <li>• Text extraction</li>
                <li>• Image conversion</li>
                <li>• PDF merging</li>
                <li>• PDF splitting</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Security & Business</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Watermarking</li>
                <li>• Access controls</li>
                <li>• Document generation</li>
                <li>• Business templates</li>
                <li>• Audit logging</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFDemo;