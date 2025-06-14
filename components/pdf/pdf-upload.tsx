'use client';

import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PDFUploadProps {
  /** Callback when file is selected */
  onFileSelect: (file: File) => void;
  /** Callback when file is removed */
  onFileRemove?: () => void;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Accept multiple files */
  multiple?: boolean;
  /** Custom accept types */
  accept?: string;
  /** Custom upload area text */
  uploadText?: string;
  /** Show file preview */
  showPreview?: boolean;
  /** Current selected file */
  selectedFile?: File | null;
  /** Disabled state */
  disabled?: boolean;
  /** Custom styling */
  className?: string;
}

export const PDFUpload: React.FC<PDFUploadProps> = ({
  onFileSelect,
  onFileRemove,
  maxSizeMB = 50,
  multiple = false,
  accept = '.pdf,application/pdf',
  uploadText = 'Click to upload or drag and drop PDF files',
  showPreview = true,
  selectedFile,
  disabled = false,
  className,
}): void => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return 'Please select a PDF file';
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  }, [maxSizeMB]);

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelect(file);
  }, [validateFile, onFileSelect]);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile, disabled]);

  const handleRemoveFile = useCallback(() => {
    setError(null);
    onFileRemove?.();
  }, [onFileRemove]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Upload Area */}
      {!selectedFile && (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-red-300 bg-red-50'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          <div className="flex flex-col items-center space-y-2">
            <Upload className={cn(
              'h-8 w-8',
              error ? 'text-red-400' : dragActive ? 'text-blue-500' : 'text-gray-400'
            )} />
            
            <div className="text-sm">
              <span className={cn(
                'font-medium',
                error ? 'text-red-600' : dragActive ? 'text-blue-600' : 'text-gray-900'
              )}>
                {uploadText}
              </span>
            </div>
            
            <div className="text-xs text-gray-500">
              PDF files up to {maxSizeMB}MB
            </div>
          </div>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && showPreview && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-red-500" />
              <div>
                <div className="font-medium text-gray-900">
                  {selectedFile.name}
                </div>
                <div className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
            </div>
            
            {onFileRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-center space-x-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default PDFUpload;