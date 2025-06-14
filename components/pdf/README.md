# PDF Management System

A comprehensive PDF viewing, generation, and processing solution for the Enxi ERP system. This system provides enterprise-grade PDF capabilities including viewing, uploading, generating, and advanced processing operations.

## Features

### 🔍 PDF Viewer (`PDFViewer`)
- **Core Functionality**: PDF rendering, zoom controls, page navigation, full-screen mode
- **Advanced Features**: Thumbnails sidebar, search within PDF, rotation, fit-to-width/height/page options
- **Performance**: Loading progress indicators, error handling, keyboard shortcuts
- **Security**: Watermarking, access controls, right-click disable, text selection control

### 📁 PDF Upload (`PDFUpload`)
- **File Management**: Drag & drop upload, file validation, size limits
- **User Experience**: Visual feedback, error messages, file preview
- **Integration**: Support for File objects and URLs

### 🖼️ PDF Modal (`PDFModal`)
- **Modal Integration**: Responsive modal dialogs with PDF viewer
- **Customization**: Multiple sizes (sm, md, lg, xl, full), custom triggers
- **Features**: Auto-open, controlled/uncontrolled state, custom headers

### 📄 PDF Generator (`PDFGenerator`)
- **Document Creation**: Professional PDF generation from business data
- **Templates**: Invoice, quotation, purchase order, delivery note templates
- **Customization**: Company branding, watermarks, custom fields
- **Output**: Download and preview capabilities

## Installation

The PDF system is already integrated into the project with the following dependencies:

```bash
npm install react-pdf pdfjs-dist @react-pdf/renderer
```

## Usage

### Basic PDF Viewer

```tsx
import { PDFViewer } from '@/components/pdf';

function MyComponent() {
  return (
    <PDFViewer
      file="/path/to/document.pdf"
      title="Sample Document"
      showThumbnails={true}
      allowFullScreen={true}
      allowDownload={true}
      allowPrint={true}
      allowSearch={true}
    />
  );
}
```

### PDF Upload

```tsx
import { PDFUpload } from '@/components/pdf';

function UploadComponent() {
  const handleFileSelect = (file: File) => {
    console.log('File selected:', file);
  };

  return (
    <PDFUpload
      onFileSelect={handleFileSelect}
      maxSizeMB={50}
      showPreview={true}
      uploadText="Drop your PDF files here"
    />
  );
}
```

### PDF Modal

```tsx
import { PDFModal } from '@/components/pdf';
import { Button } from '@/components/ui/button';

function ModalComponent() {
  return (
    <PDFModal
      file="/path/to/document.pdf"
      modalTitle="Document Preview"
      size="xl"
      trigger={
        <Button>View PDF</Button>
      }
    />
  );
}
```

### PDF Generation

```tsx
import { PDFGenerator, type PDFDocumentData } from '@/components/pdf';

function GenerateComponent() {
  const documentData: PDFDocumentData = {
    title: 'Invoice',
    subtitle: 'INV-2024-001',
    date: new Date().toLocaleDateString(),
    company: {
      name: 'Your Company',
      address: '123 Business St, City, Country',
      phone: '+1-234-567-8900',
      email: 'info@company.com',
    },
    customer: {
      name: 'Customer Name',
      address: '456 Customer Ave, City, Country',
    },
    items: [
      {
        description: 'Product 1',
        quantity: 2,
        unitPrice: 100.00,
        total: 200.00,
      },
    ],
    totals: {
      subtotal: 200.00,
      tax: 20.00,
      total: 220.00,
    },
    notes: 'Thank you for your business!',
  };

  return (
    <PDFGenerator
      data={documentData}
      filename="invoice.pdf"
      showPreview={true}
      showDownload={true}
    />
  );
}
```

### Using Hooks

```tsx
import { usePDF } from '@/lib/hooks/use-pdf';

function PDFHookExample() {
  const [pdfState, pdfActions] = usePDF({
    autoLoad: true,
    enableCache: true,
  });

  const handleFileChange = (file: File) => {
    pdfActions.setFile(file);
  };

  const handleSearch = async (term: string) => {
    await pdfActions.searchText(term);
    console.log('Search results:', pdfState.searchResults);
  };

  return (
    <div>
      {pdfState.isLoading && <p>Loading PDF...</p>}
      {pdfState.error && <p>Error: {pdfState.error}</p>}
      {pdfState.numPages > 0 && (
        <p>Document has {pdfState.numPages} pages</p>
      )}
    </div>
  );
}
```

## PDF Service

The `PDFService` provides backend operations:

```tsx
import { pdfService } from '@/lib/services/pdf.service';

// Generate PDF
const result = await pdfService.generatePDF(documentData);

// Extract text
const textResult = await pdfService.extractText(file);

// Search in PDF
const searchResult = await pdfService.searchInPDF(file, 'search term');

// Convert to images
const imagesResult = await pdfService.convertToImages(file, {
  format: 'png',
  quality: 0.8
});

// Merge PDFs
const mergeResult = await pdfService.mergePDFs([file1, file2]);

// Split PDF
const splitResult = await pdfService.splitPDF(file, {
  pages: [1, 3, 5]
});
```

## Configuration

### Security Settings

```tsx
<PDFViewer
  file={file}
  security={{
    disableRightClick: true,
    disableTextSelection: true,
    watermark: 'CONFIDENTIAL'
  }}
/>
```

### Performance Settings

```tsx
<PDFViewer
  file={file}
  performance={{
    enableVirtualization: true,
    maxCacheSize: 100
  }}
/>
```

## API Integration

### Upload Endpoint (`/api/pdf/upload`)

```typescript
// POST /api/pdf/upload
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // Store file and return result
  return NextResponse.json({
    success: true,
    url: '/path/to/stored/file.pdf',
    filename: file.name,
    size: file.size
  });
}
```

### Document Generation (`/api/pdf/generate/[type]/[id]`)

```typescript
// POST /api/pdf/generate/invoice/123
export async function POST(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  const { type, id } = params;
  const options = await request.json();
  
  // Generate PDF for business document
  const result = await generateBusinessPDF(type, id, options);
  
  return NextResponse.json(result);
}
```

## Business Use Cases

### 1. Invoice Management
```tsx
// Generate invoice PDF
const invoiceData = await getInvoiceData(invoiceId);
const pdfData = transformInvoiceToPDF(invoiceData);

<PDFGenerator
  data={pdfData}
  filename={`invoice-${invoiceData.number}.pdf`}
  onDownload={() => trackDownload('invoice', invoiceId)}
/>
```

### 2. Document Review
```tsx
// Review contracts and agreements
<PDFViewer
  file={contractUrl}
  allowAnnotations={true}
  security={{
    disableDownload: !canDownload,
    watermark: userRole === 'guest' ? 'REVIEW ONLY' : undefined
  }}
/>
```

### 3. Report Distribution
```tsx
// Generate and distribute reports
const reportData = await generateReportData(params);

<PDFGenerator
  data={reportData}
  onGenerate={async (pdf) => {
    await emailReport(recipientList, pdf);
    await storeReport(reportId, pdf);
  }}
/>
```

## Styling and Theming

The PDF components use Tailwind CSS and are fully compatible with the existing design system:

```tsx
<PDFViewer
  className="border-2 border-blue-500 rounded-lg"
  file={file}
/>

<PDFModal
  modalClassName="max-w-7xl"
  file={file}
/>
```

## Error Handling

```tsx
<PDFViewer
  file={file}
  onError={(error) => {
    console.error('PDF Error:', error);
    toast({
      title: 'PDF Error',
      description: error.message,
      variant: 'destructive'
    });
  }}
  onLoadSuccess={(pdf) => {
    console.log('PDF loaded successfully:', pdf.numPages, 'pages');
  }}
/>
```

## Performance Considerations

1. **Lazy Loading**: Components only load PDF.js when needed
2. **Caching**: Automatic caching of processed PDFs
3. **Virtualization**: Large document support with virtual scrolling
4. **Compression**: Optimized PDF generation with configurable quality
5. **Memory Management**: Automatic cleanup of resources

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Troubleshooting

### Common Issues

1. **PDF.js Worker Error**
   ```typescript
   // Ensure worker is properly configured
   pdfjs.GlobalWorkerOptions.workerSrc = 
     `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
   ```

2. **CORS Issues with External PDFs**
   ```typescript
   // Use proxy endpoint for external PDFs
   const proxyUrl = `/api/pdf/proxy?url=${encodeURIComponent(externalUrl)}`;
   <PDFViewer file={proxyUrl} />
   ```

3. **Large File Performance**
   ```typescript
   // Enable performance optimizations
   <PDFViewer
     file={largeFile}
     performance={{
       enableVirtualization: true,
       maxCacheSize: 50
     }}
   />
   ```

## Security Considerations

1. **File Validation**: Always validate file types and sizes
2. **Access Control**: Implement proper authentication for sensitive documents
3. **Sanitization**: Clean uploaded files for malicious content
4. **Encryption**: Use HTTPS for all PDF operations
5. **Audit Logging**: Track all PDF operations for compliance

## Contributing

When adding new PDF features:

1. Follow the existing component patterns
2. Add proper TypeScript types
3. Include error handling
4. Add tests for new functionality
5. Update documentation

## Examples

See `/components/pdf/pdf-demo.tsx` for a comprehensive demonstration of all features.

## License

This PDF system is part of the Enxi ERP project and follows the same licensing terms.