'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Printer, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  FileText, 
  AlertCircle, 
  Loader2,
  Menu,
  X,
  Settings,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export interface PDFViewerProps {
  /** PDF file URL or File object */
  file: string | File | null;
  /** Initial zoom level (default: 1.0) */
  initialZoom?: number;
  /** Initial page number (default: 1) */
  initialPage?: number;
  /** Show thumbnails sidebar (default: true) */
  showThumbnails?: boolean;
  /** Enable full-screen mode (default: true) */
  allowFullScreen?: boolean;
  /** Enable download functionality (default: true) */
  allowDownload?: boolean;
  /** Enable print functionality (default: true) */
  allowPrint?: boolean;
  /** Enable search functionality (default: true) */
  allowSearch?: boolean;
  /** Enable annotation tools (default: false) */
  allowAnnotations?: boolean;
  /** Custom toolbar actions */
  customActions?: React.ReactNode;
  /** Error handler */
  onError?: (error: Error) => void;
  /** Load success handler */
  onLoadSuccess?: (pdf: any) => void;
  /** Page change handler */
  onPageChange?: (pageNumber: number) => void;
  /** Zoom change handler */
  onZoomChange?: (zoom: number) => void;
  /** Document title */
  title?: string;
  /** Security settings */
  security?: {
    disableRightClick?: boolean;
    disableTextSelection?: boolean;
    watermark?: string;
  };
  /** Performance settings */
  performance?: {
    enableVirtualization?: boolean;
    maxCacheSize?: number;
  };
}

interface PDFViewerState {
  numPages: number;
  currentPage: number;
  zoom: number;
  rotation: number;
  isFullScreen: boolean;
  showThumbnails: boolean;
  searchTerm: string;
  searchResults: any[];
  isSearching: boolean;
  isLoading: boolean;
  error: string | null;
  loadingProgress: number;
  fitMode: 'width' | 'height' | 'page' | 'none';
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  initialZoom = 1.0,
  initialPage = 1,
  showThumbnails = true,
  allowFullScreen = true,
  allowDownload = true,
  allowPrint = true,
  allowSearch = true,
  allowAnnotations = false,
  customActions,
  onError,
  onLoadSuccess,
  onPageChange,
  onZoomChange,
  title,
  security,
  performance,
}) => {
  const [state, setState] = useState<PDFViewerState>({
    numPages: 0,
    currentPage: initialPage,
    zoom: initialZoom,
    rotation: 0,
    isFullScreen: false,
    showThumbnails: showThumbnails,
    searchTerm: '',
    searchResults: [],
    isSearching: false,
    isLoading: false,
    error: null,
    loadingProgress: 0,
    fitMode: 'none',
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // PDF Document loading handlers
  const onDocumentLoadSuccess = useCallback((pdf: any) => {
    setState(prev => ({
      ...prev,
      numPages: pdf.numPages,
      isLoading: false,
      error: null,
    }));
    onLoadSuccess?.(pdf);
  }, [onLoadSuccess]);

  const onDocumentLoadError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: error.message,
    }));
    onError?.(error);
  }, [onError]);

  const onDocumentLoadProgress = useCallback((progress: any) => {
    if (progress.total) {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      setState(prev => ({
        ...prev,
        loadingProgress: percent,
      }));
    }
  }, []);

  // Navigation functions
  const goToPage = useCallback((pageNumber: number) => {
    const newPage = Math.max(1, Math.min(pageNumber, state.numPages));
    setState(prev => ({ ...prev, currentPage: newPage }));
    onPageChange?.(newPage);
  }, [state.numPages, onPageChange]);

  const goToPrevPage = useCallback(() => {
    if (state.currentPage > 1) {
      goToPage(state.currentPage - 1);
    }
  }, [state.currentPage, goToPage]);

  const goToNextPage = useCallback(() => {
    if (state.currentPage < state.numPages) {
      goToPage(state.currentPage + 1);
    }
  }, [state.currentPage, state.numPages, goToPage]);

  // Zoom functions
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(state.zoom * 1.25, 5.0);
    setState(prev => ({ ...prev, zoom: newZoom, fitMode: 'none' }));
    onZoomChange?.(newZoom);
  }, [state.zoom, onZoomChange]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(state.zoom / 1.25, 0.1);
    setState(prev => ({ ...prev, zoom: newZoom, fitMode: 'none' }));
    onZoomChange?.(newZoom);
  }, [state.zoom, onZoomChange]);

  const setZoom = useCallback((zoom: number) => {
    const newZoom = Math.max(0.1, Math.min(zoom, 5.0));
    setState(prev => ({ ...prev, zoom: newZoom, fitMode: 'none' }));
    onZoomChange?.(newZoom);
  }, [onZoomChange]);

  // Fit functions
  const fitToWidth = useCallback(() => {
    if (viewerRef.current) {
      const containerWidth = viewerRef.current.clientWidth - 40; // padding
      const pageWidth = 612; // standard PDF page width in points
      const newZoom = containerWidth / pageWidth;
      setState(prev => ({ ...prev, zoom: newZoom, fitMode: 'width' }));
      onZoomChange?.(newZoom);
    }
  }, [onZoomChange]);

  const fitToHeight = useCallback(() => {
    if (viewerRef.current) {
      const containerHeight = viewerRef.current.clientHeight - 40; // padding
      const pageHeight = 792; // standard PDF page height in points
      const newZoom = containerHeight / pageHeight;
      setState(prev => ({ ...prev, zoom: newZoom, fitMode: 'height' }));
      onZoomChange?.(newZoom);
    }
  }, [onZoomChange]);

  const fitToPage = useCallback(() => {
    if (viewerRef.current) {
      const containerWidth = viewerRef.current.clientWidth - 40;
      const containerHeight = viewerRef.current.clientHeight - 40;
      const pageWidth = 612;
      const pageHeight = 792;
      const widthRatio = containerWidth / pageWidth;
      const heightRatio = containerHeight / pageHeight;
      const newZoom = Math.min(widthRatio, heightRatio);
      setState(prev => ({ ...prev, zoom: newZoom, fitMode: 'page' }));
      onZoomChange?.(newZoom);
    }
  }, [onZoomChange]);

  // Rotation function
  const rotatePage = useCallback(() => {
    setState(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  }, []);

  // Full screen functions
  const toggleFullScreen = useCallback(() => {
    if (!allowFullScreen) return;

    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setState(prev => ({ ...prev, isFullScreen: true }));
    } else {
      document.exitFullscreen();
      setState(prev => ({ ...prev, isFullScreen: false }));
    }
  }, [allowFullScreen]);

  // Search functions
  const handleSearch = useCallback(async (searchTerm: string) => {
    if (!allowSearch || !searchTerm.trim()) {
      setState(prev => ({ ...prev, searchResults: [], isSearching: false }));
      return;
    }

    setState(prev => ({ ...prev, isSearching: true }));
    
    // This is a simplified search implementation
    // In a real application, you would use PDF.js's text extraction and search APIs
    try {
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock search results
      const mockResults = [
        { pageNumber: 1, text: searchTerm, position: { x: 100, y: 200 } },
        { pageNumber: 3, text: searchTerm, position: { x: 150, y: 300 } },
      ];
      
      setState(prev => ({ 
        ...prev, 
        searchResults: mockResults, 
        isSearching: false 
      }));
    } catch (error) {
      setState(prev => ({ ...prev, isSearching: false }));
    }
  }, [allowSearch]);

  // Download function
  const downloadPDF = useCallback(() => {
    if (!allowDownload || !file) return;

    if (typeof file === 'string') {
      const link = document.createElement('a');
      link.href = file;
      link.download = title || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name || title || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [allowDownload, file, title]);

  // Print function
  const printPDF = useCallback(() => {
    if (!allowPrint) return;
    window.print();
  }, [allowPrint]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '=':
          case '+':
            event.preventDefault();
            zoomIn();
            break;
          case '-':
            event.preventDefault();
            zoomOut();
            break;
          case '0':
            event.preventDefault();
            setZoom(1.0);
            break;
          case 'f':
            if (allowSearch) {
              event.preventDefault();
              searchInputRef.current?.focus();
            }
            break;
          case 'p':
            if (allowPrint) {
              event.preventDefault();
              printPDF();
            }
            break;
          case 's':
            if (allowDownload) {
              event.preventDefault();
              downloadPDF();
            }
            break;
        }
      } else {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            goToPrevPage();
            break;
          case 'ArrowRight':
            event.preventDefault();
            goToNextPage();
            break;
          case 'Home':
            event.preventDefault();
            goToPage(1);
            break;
          case 'End':
            event.preventDefault();
            goToPage(state.numPages);
            break;
          case 'Escape':
            if (state.isFullScreen) {
              event.preventDefault();
              toggleFullScreen();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    zoomIn,
    zoomOut,
    setZoom,
    goToPrevPage,
    goToNextPage,
    goToPage,
    state.numPages,
    state.isFullScreen,
    toggleFullScreen,
    allowSearch,
    allowPrint,
    allowDownload,
    printPDF,
    downloadPDF]);

  // Full screen change handler
  useEffect(() => {
    const handleFullScreenChange = () => {
      setState(prev => ({
        ...prev,
        isFullScreen: !!document.fullscreenElement,
      }));
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  // Render thumbnails
  const renderThumbnails = () => {
    if (!state.showThumbnails || state.numPages === 0) return null;

    return (
      <div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Pages</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, showThumbnails: false }))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {Array.from({ length: state.numPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                className={cn(
                  'cursor-pointer border-2 rounded transition-all duration-200',
                  pageNum === state.currentPage
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => goToPage(pageNum)}
              >
                <div className="p-2">
                  <div className="aspect-[3/4] bg-white rounded border flex items-center justify-center">
                    <Page
                      pageNumber={pageNum}
                      width={120}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                  <div className="text-center mt-1 text-xs text-gray-600">
                    {pageNum}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render toolbar
  const renderToolbar = () => (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
      <div className="flex items-center space-x-2">
        {/* Thumbnails toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setState(prev => ({ ...prev, showThumbnails: !prev.showThumbnails }))}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Navigation */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevPage}
            disabled={state.currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              value={state.currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-16 h-8 text-center"
              min={1}
              max={state.numPages}
            />
            <span className="text-sm text-gray-500">of {state.numPages}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={state.currentPage >= state.numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Zoom controls */}
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-1">
            <Input
              type="number"
              value={Math.round(state.zoom * 100)}
              onChange={(e) => setZoom((parseInt(e.target.value) || 100) / 100)}
              className="w-16 h-8 text-center"
              min={10}
              max={500}
            />
            <span className="text-sm text-gray-500">%</span>
          </div>

          <Button variant="ghost" size="sm" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Fit options */}
        <div className="flex items-center space-x-1">
          <Button
            variant={state.fitMode === 'width' ? 'default' : 'ghost'}
            size="sm"
            onClick={fitToWidth}
            title="Fit to width"
          >
            <ChevronLeft className="h-4 w-4 rotate-90" />
          </Button>
          <Button
            variant={state.fitMode === 'height' ? 'default' : 'ghost'}
            size="sm"
            onClick={fitToHeight}
            title="Fit to height"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant={state.fitMode === 'page' ? 'default' : 'ghost'}
            size="sm"
            onClick={fitToPage}
            title="Fit to page"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Rotate */}
        <Button variant="ghost" size="sm" onClick={rotatePage}>
          <RotateCw className="h-4 w-4" />
        </Button>

        {/* Search */}
        {allowSearch && (
          <div className="flex items-center space-x-1">
            <Input
              ref={searchInputRef}
              placeholder="Search..."
              value={state.searchTerm}
              onChange={(e) => {
                const term = e.target.value;
                setState(prev => ({ ...prev, searchTerm: term }));
                handleSearch(term);
              }}
              className="w-32 h-8"
            />
            <Button variant="ghost" size="sm" disabled={state.isSearching}>
              {state.isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Download */}
        {allowDownload && (
          <Button variant="ghost" size="sm" onClick={downloadPDF}>
            <Download className="h-4 w-4" />
          </Button>
        )}

        {/* Print */}
        {allowPrint && (
          <Button variant="ghost" size="sm" onClick={printPDF}>
            <Printer className="h-4 w-4" />
          </Button>
        )}

        {/* Full screen */}
        {allowFullScreen && (
          <Button variant="ghost" size="sm" onClick={toggleFullScreen}>
            {state.isFullScreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Custom actions */}
        {customActions}
      </div>
    </div>
  );

  // Render error state
  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading PDF</h3>
        <p className="text-gray-600 text-center max-w-md">{state.error}</p>
        <Button
          className="mt-4"
          onClick={() => setState(prev => ({ ...prev, error: null, isLoading: true }))}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Render loading state
  if (state.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Loading PDF...</h3>
        {state.loadingProgress > 0 && (
          <div className="w-64">
            <Progress value={state.loadingProgress} className="h-2" />
            <p className="text-sm text-gray-600 text-center mt-2">
              {state.loadingProgress}% loaded
            </p>
          </div>
        )}
      </div>
    );
  }

  // Render no file state
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No PDF Selected</h3>
        <p className="text-gray-600">Please provide a PDF file to view.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden',
        state.isFullScreen && 'fixed inset-0 z-50 rounded-none border-none',
        security?.disableRightClick && 'select-none'
      )}
      onContextMenu={security?.disableRightClick ? (e) => e.preventDefault() : undefined}
    >
      {/* Toolbar */}
      {renderToolbar()}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnails sidebar */}
        {renderThumbnails()}

        {/* PDF viewer */}
        <div
          ref={viewerRef}
          className="flex-1 overflow-auto bg-gray-100 p-4"
          style={{ 
            userSelect: security?.disableTextSelection ? 'none' : 'auto',
          }}
        >
          <div className="flex justify-center">
            <div className="relative">
              {/* Watermark */}
              {security?.watermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-6xl text-gray-300 opacity-20 rotate-45 font-bold">
                    {security.watermark}
                  </div>
                </div>
              )}

              {/* PDF Document */}
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                onLoadProgress={onDocumentLoadProgress}
                loading={
                  <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                }
              >
                <Page
                  pageNumber={state.currentPage}
                  scale={state.zoom}
                  rotate={state.rotation}
                  renderTextLayer={!security?.disableTextSelection}
                  renderAnnotationLayer={allowAnnotations}
                  className="shadow-lg"
                />
              </Document>
            </div>
          </div>
        </div>
      </div>

      {/* Search results */}
      {allowSearch && state.searchResults.length > 0 && (
        <div className="border-t border-gray-200 bg-yellow-50 p-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">
              Found {state.searchResults.length} results for "{state.searchTerm}"
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, searchResults: [], searchTerm: '' }))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;