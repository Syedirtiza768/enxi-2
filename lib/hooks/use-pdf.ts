'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { pdfService } from '@/lib/services/pdf.service';
import type { PDFDocumentData } from '@/components/pdf';

export interface UsePDFOptions {
  /** Auto-load PDF when file changes */
  autoLoad?: boolean;
  /** Cache PDFs locally */
  enableCache?: boolean;
  /** Max cache size in MB */
  maxCacheSize?: number;
  /** Enable error retry */
  enableRetry?: boolean;
  /** Max retry attempts */
  maxRetries?: number;
}

export interface PDFState {
  file: File | string | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  progress: number;
  numPages: number;
  currentPage: number;
  zoom: number;
  rotation: number;
  searchResults: any[];
  metadata: any;
}

export interface PDFActions {
  setFile: (file: File | string | null) => void;
  loadPDF: (file: File | string) => Promise<void>;
  clearError: () => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setRotation: (rotation: number) => void;
  searchText: (term: string) => Promise<void>;
  extractText: () => Promise<string | null>;
  downloadPDF: (filename?: string) => Promise<void>;
  generatePDF: (data: PDFDocumentData) => Promise<void>;
  convertToImages: (options?: { format?: 'png' | 'jpeg'; quality?: number }) => Promise<string[]>;
  retry: () => Promise<void>;
}

export function usePDF(options: UsePDFOptions = {}): [PDFState, PDFActions] {
  const {
    autoLoad = true,
    enableCache = true,
    maxCacheSize = 100,
    enableRetry = true,
    maxRetries = 3,
  } = options;

  const [state, setState] = useState<PDFState>({
    file: null,
    isLoading: false,
    isProcessing: false,
    error: null,
    progress: 0,
    numPages: 0,
    currentPage: 1,
    zoom: 1.0,
    rotation: 0,
    searchResults: [],
    metadata: null,
  });

  const cacheRef = useRef<Map<string, any>>(new Map());
  const retryCountRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cache management
  const getCacheKey = useCallback((file: File | string): string => {
    if (typeof file === 'string') {
      return file;
    }
    return `${file.name}_${file.size}_${file.lastModified}`;
  }, []);

  const getFromCache = useCallback((key: string) => {
    if (!enableCache) return null;
    return cacheRef.current.get(key);
  }, [enableCache]);

  const setToCache = useCallback((key: string, data: any) => {
    if (!enableCache) return;
    
    // Simple cache size management
    if (cacheRef.current.size >= maxCacheSize) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) {
        cacheRef.current.delete(firstKey);
      }
    }
    
    cacheRef.current.set(key, data);
  }, [enableCache, maxCacheSize]);

  // Load PDF file
  const loadPDF = useCallback(async (file: File | string) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 0,
    }));

    try {
      const cacheKey = getCacheKey(file);
      const cached = getFromCache(cacheKey);
      
      if (cached) {
        setState(prev => ({
          ...prev,
          file,
          isLoading: false,
          numPages: cached.numPages,
          metadata: cached.metadata,
        }));
        return;
      }

      // Get PDF info
      const info = await pdfService.getPDFInfo(file);
      
      if (info.success && info.info) {
        const data = {
          numPages: info.info.pages,
          metadata: info.info,
        };
        
        setToCache(cacheKey, data);
        
        setState(prev => ({
          ...prev,
          file,
          isLoading: false,
          numPages: data.numPages,
          metadata: data.metadata,
          currentPage: 1,
        }));
        
        retryCountRef.current = 0;
      } else {
        throw new Error(info.error || 'Failed to load PDF');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      // Auto-retry if enabled
      if (enableRetry && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => loadPDF(file), 1000 * retryCountRef.current);
      }
    }
  }, [getCacheKey, getFromCache, setToCache, enableRetry, maxRetries]);

  // Actions
  const actions: PDFActions = {
    setFile: useCallback((file: File | string | null) => {
      setState(prev => ({ ...prev, file }));
      if (file && autoLoad) {
        loadPDF(file);
      }
    }, [autoLoad, loadPDF]),

    loadPDF,

    clearError: useCallback(() => {
      setState(prev => ({ ...prev, error: null }));
    }, []),

    setCurrentPage: useCallback((page: number) => {
      setState(prev => ({
        ...prev,
        currentPage: Math.max(1, Math.min(page, prev.numPages)),
      }));
    }, []),

    setZoom: useCallback((zoom: number) => {
      setState(prev => ({
        ...prev,
        zoom: Math.max(0.1, Math.min(zoom, 5.0)),
      }));
    }, []),

    setRotation: useCallback((rotation: number) => {
      setState(prev => ({
        ...prev,
        rotation: rotation % 360,
      }));
    }, []),

    searchText: useCallback(async (term: string) => {
      if (!state.file || !term.trim()) {
        setState(prev => ({ ...prev, searchResults: [] }));
        return;
      }

      setState(prev => ({ ...prev, isProcessing: true }));

      try {
        const result = await pdfService.searchInPDF(
          state.file,
          term,
          { caseSensitive: false }
        );

        setState(prev => ({
          ...prev,
          isProcessing: false,
          searchResults: result.results || [],
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: error instanceof Error ? error.message : 'Search failed',
        }));
      }
    }, [state.file]),

    extractText: useCallback(async () => {
      if (!state.file) return null;

      setState(prev => ({ ...prev, isProcessing: true }));

      try {
        const result = await pdfService.extractText(state.file);
        setState(prev => ({ ...prev, isProcessing: false }));
        
        if (result.success) {
          return result.text || null;
        } else {
          throw new Error(result.error || 'Text extraction failed');
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: error instanceof Error ? error.message : 'Text extraction failed',
        }));
        return null;
      }
    }, [state.file]),

    downloadPDF: useCallback(async (filename?: string) => {
      if (!state.file) return;

      if (typeof state.file === 'string') {
        // For URL files, create download link
        const link = document.createElement('a');
        link.href = state.file;
        link.download = filename || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For File objects, create blob URL
        const url = URL.createObjectURL(state.file);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || state.file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }, [state.file]),

    generatePDF: useCallback(async (data: PDFDocumentData) => {
      setState(prev => ({ ...prev, isProcessing: true }));

      try {
        const result = await pdfService.generatePDF(data);
        
        if (result.success && result.url) {
          setState(prev => ({
            ...prev,
            isProcessing: false,
            file: result.url!,
          }));
          
          if (autoLoad) {
            await loadPDF(result.url);
          }
        } else {
          throw new Error(result.error || 'PDF generation failed');
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: error instanceof Error ? error.message : 'PDF generation failed',
        }));
      }
    }, [autoLoad, loadPDF]),

    convertToImages: useCallback(async (options = {}) => {
      if (!state.file) return [];

      setState(prev => ({ ...prev, isProcessing: true }));

      try {
        const result = await pdfService.convertToImages(state.file, options);
        setState(prev => ({ ...prev, isProcessing: false }));
        
        if (result.success) {
          return result.images || [];
        } else {
          throw new Error(result.error || 'Image conversion failed');
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: error instanceof Error ? error.message : 'Image conversion failed',
        }));
        return [];
      }
    }, [state.file]),

    retry: useCallback(async () => {
      if (state.file) {
        retryCountRef.current = 0;
        await loadPDF(state.file);
      }
    }, [state.file, loadPDF]),
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return [state, actions];
}

// Hook for PDF generation
export function usePDFGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBusinessDocument = useCallback(async (
    type: 'invoice' | 'quotation' | 'purchase-order' | 'delivery-note',
    documentId: string,
    options: any = {}
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await pdfService.generateBusinessDocument(type, documentId, options);
      
      if (result.success) {
        setIsGenerating(false);
        return result;
      } else {
        throw new Error(result.error || 'Document generation failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsGenerating(false);
      throw err;
    }
  }, []);

  return {
    isGenerating,
    error,
    generateBusinessDocument,
    clearError: () => setError(null),
  };
}

// Hook for PDF batch operations
export function usePDFBatch() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);

  const mergePDFs = useCallback(async (files: (File | string)[]) => {
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const result = await pdfService.mergePDFs(files);
      setProgress(100);
      setResults([result]);
      setIsProcessing(false);
      return result;
    } catch (error) {
      setIsProcessing(false);
      throw error;
    }
  }, []);

  const splitPDF = useCallback(async (file: File | string, options: any = {}) => {
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const result = await pdfService.splitPDF(file, options);
      setProgress(100);
      setResults(result.files || []);
      setIsProcessing(false);
      return result;
    } catch (error) {
      setIsProcessing(false);
      throw error;
    }
  }, []);

  const batchConvert = useCallback(async (
    files: (File | string)[],
    operation: 'images' | 'text',
    options: any = {}
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const totalFiles = files.length;
      const results: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        let result;
        if (operation === 'images') {
          result = await pdfService.convertToImages(file, options);
        } else {
          result = await pdfService.extractText(file);
        }
        
        results.push({ file, result });
        setProgress(((i + 1) / totalFiles) * 100);
      }

      setResults(results);
      setIsProcessing(false);
      return results;
    } catch (error) {
      setIsProcessing(false);
      throw error;
    }
  }, []);

  return {
    isProcessing,
    progress,
    results,
    mergePDFs,
    splitPDF,
    batchConvert,
  };
}