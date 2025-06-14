# PDF Viewer Implementation Guide

## Overview

This implementation provides a comprehensive PDF management system for the Enxi ERP application, including viewing, uploading, generating, and processing PDF documents. The system is built with React, TypeScript, and integrates seamlessly with the existing design system.

## Architecture

### Components Structure
```
components/pdf/
├── pdf-viewer.tsx        # Main PDF viewer component
├── pdf-upload.tsx        # PDF file upload component
├── pdf-modal.tsx         # Modal wrapper for PDF viewer
├── pdf-generator.tsx     # PDF document generation
├── pdf-demo.tsx          # Comprehensive demo
├── index.ts              # Barrel exports
├── README.md             # User documentation
└── IMPLEMENTATION.md     # This file
```

### Services & Hooks
```
lib/
├── services/
│   └── pdf.service.ts    # PDF backend operations
└── hooks/
    └── use-pdf.ts        # PDF state management hooks
```

### API Routes
```
app/api/pdf/
├── upload/route.ts           # File upload endpoint
├── generate/[type]/[id]/route.ts  # Document generation
├── extract-text/route.ts     # Text extraction
├── search/route.ts           # PDF search
└── info/route.ts             # PDF metadata
```

## Features Implemented

### ✅ Core PDF Viewer
- **PDF Rendering**: Uses react-pdf with PDF.js worker
- **Navigation**: Page controls, jump to page, first/last
- **Zoom Controls**: Zoom in/out, fit to width/height/page, custom zoom
- **Rotation**: 90-degree increments
- **Full-screen**: Native browser full-screen API
- **Thumbnails**: Collapsible sidebar with page previews
- **Keyboard Shortcuts**: Navigation, zoom, search, print, download

### ✅ File Management
- **Upload**: Drag & drop with file validation
- **URL Loading**: Support for remote PDF files
- **Download**: Local file and URL download
- **Print**: Browser print functionality

### ✅ Search & Processing
- **Text Search**: Search within PDF with options
- **Text Extraction**: Extract text from PDF pages
- **Metadata**: Get PDF information and properties
- **Image Conversion**: Convert PDF pages to images

### ✅ Document Generation
- **Business Templates**: Invoice, quotation, purchase order, delivery note
- **Custom Data**: Flexible document data structure
- **Professional Layout**: Company branding, tables, totals
- **Download/Preview**: Generate and download PDFs

### ✅ Security & Performance
- **Access Controls**: Disable right-click, text selection
- **Watermarking**: Custom watermark overlay
- **Caching**: Intelligent PDF caching
- **Error Handling**: Comprehensive error management
- **Loading States**: Progress indicators and loading feedback

### ✅ UI/UX Features
- **Responsive Design**: Mobile and desktop optimized
- **Dark Mode**: Supports system theme
- **Accessibility**: ARIA labels, keyboard navigation
- **Modal Integration**: Dialog-based PDF viewing
- **Toast Notifications**: User feedback system

## Technical Implementation

### 1. PDF.js Integration
```typescript
// Worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
```

### 2. Component Usage
```typescript
import { PDFViewer } from '@/components/pdf';

<PDFViewer
  file="/path/to/document.pdf"
  showThumbnails={true}
  allowFullScreen={true}
  allowDownload={true}
  security={{
    watermark: 'CONFIDENTIAL',
    disableRightClick: true
  }}
/>
```

### 3. Hook Integration
```typescript
const [pdfState, pdfActions] = usePDF({
  autoLoad: true,
  enableCache: true
});

// Load PDF
pdfActions.setFile(file);

// Search
await pdfActions.searchText('search term');

// Extract text
const text = await pdfActions.extractText();
```

### 4. Service Layer
```typescript
import { pdfService } from '@/lib/services/pdf.service';

// Generate business document
const result = await pdfService.generateBusinessDocument(
  'invoice', 
  invoiceId, 
  options
);

// Process PDF
const searchResult = await pdfService.searchInPDF(file, 'term');
```

## Business Integration

### 1. Invoice Management
```typescript
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
```typescript
// Contract review with annotations
<PDFViewer
  file={contractUrl}
  allowAnnotations={true}
  security={{
    watermark: userRole === 'guest' ? 'REVIEW ONLY' : undefined
  }}
/>
```

### 3. Report Distribution
```typescript
// Generate and distribute reports
<PDFModal
  file={reportUrl}
  modalTitle="Financial Report"
  size="full"
  trigger={<Button>View Report</Button>}
/>
```

## API Implementation

### File Upload
```typescript
// POST /api/pdf/upload
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // Validate, save, and return file info
  return NextResponse.json({
    success: true,
    url: fileUrl,
    filename: fileName,
    size: file.size
  });
}
```

### Document Generation
```typescript
// POST /api/pdf/generate/invoice/123
export async function POST(request: NextRequest, { params }) {
  const { type, id } = params;
  
  // Fetch business data and generate PDF
  const documentData = await fetchInvoiceData(id);
  const pdfBuffer = await renderToBuffer(documentPDF);
  
  return NextResponse.json({
    success: true,
    url: fileUrl,
    filename: fileName
  });
}
```

## Performance Optimizations

### 1. Lazy Loading
- PDF.js worker loads only when needed
- Components use React.lazy for code splitting

### 2. Caching Strategy
- PDF data cached in memory with LRU eviction
- Metadata cached to avoid repeated processing
- Service worker caching for static PDF files

### 3. Memory Management
- Automatic cleanup of PDF objects
- Canvas element recycling
- Blob URL cleanup after downloads

### 4. Large File Handling
- Virtual scrolling for many pages
- Progressive loading of page content
- Configurable cache size limits

## Security Considerations

### 1. File Validation
```typescript
// Validate file type and size
if (!file.type.includes('pdf')) {
  throw new Error('Only PDF files allowed');
}

if (file.size > maxSizeBytes) {
  throw new Error('File too large');
}
```

### 2. Access Control
```typescript
// Check user permissions
const canView = await checkDocumentAccess(userId, documentId);
if (!canView) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 });
}
```

### 3. Content Security
```typescript
// Sanitize PDF content
const sanitizedPDF = await sanitizePDFContent(file);

// Apply watermarking for sensitive documents
<PDFViewer
  file={file}
  security={{
    watermark: classification === 'confidential' ? 'CONFIDENTIAL' : undefined,
    disableRightClick: true,
    disableTextSelection: true
  }}
/>
```

## Testing Strategy

### 1. Unit Tests
- Component rendering with various props
- Hook state management
- Service method functionality
- Error handling scenarios

### 2. Integration Tests
- API endpoint responses
- File upload/download flows
- PDF generation accuracy
- Search functionality

### 3. E2E Tests
- Complete PDF viewing workflow
- Document generation process
- Modal interactions
- Mobile responsiveness

## Deployment Considerations

### 1. Environment Configuration
```typescript
// Production settings
const UPLOAD_DIR = process.env.PDF_UPLOAD_DIR || './uploads/pdfs';
const MAX_FILE_SIZE = process.env.MAX_PDF_SIZE || '50MB';
const PDF_WORKER_URL = process.env.PDF_WORKER_URL || 'cdn.jsdelivr.net';
```

### 2. File Storage
- Local filesystem for development
- Cloud storage (S3, Google Cloud) for production
- CDN integration for PDF delivery
- Backup and retention policies

### 3. Monitoring
- PDF processing metrics
- Error tracking and alerting
- Performance monitoring
- User interaction analytics

## Future Enhancements

### 1. Advanced Features
- [ ] PDF annotation tools (highlight, comments)
- [ ] Digital signatures
- [ ] Form filling capabilities
- [ ] OCR for scanned documents
- [ ] Real-time collaboration

### 2. Performance Improvements
- [ ] WebAssembly PDF processing
- [ ] Progressive web app caching
- [ ] Streaming for large files
- [ ] Background processing queue

### 3. Integration Expansions
- [ ] Email PDF delivery
- [ ] Version control for documents
- [ ] Audit trail for document access
- [ ] Integration with document management systems

## Troubleshooting

### Common Issues

1. **PDF.js Worker Not Loading**
   - Ensure worker URL is accessible
   - Check CORS policies
   - Verify CDN availability

2. **Large File Performance**
   - Enable virtualization
   - Reduce cache size
   - Use progressive loading

3. **Mobile Rendering Issues**
   - Test touch gestures
   - Verify responsive layouts
   - Check zoom behavior

4. **Memory Leaks**
   - Monitor component cleanup
   - Check for unclosed streams
   - Verify event listener removal

### Debug Mode
```typescript
// Enable debug logging
const [pdfState, pdfActions] = usePDF({
  debug: true,
  enableCache: false // Disable for testing
});
```

## Conclusion

This PDF management system provides enterprise-grade functionality for viewing, generating, and processing PDF documents within the Enxi ERP system. The modular architecture allows for easy extension and customization while maintaining performance and security standards.

The implementation follows React best practices, uses TypeScript for type safety, and integrates seamlessly with the existing design system and infrastructure.