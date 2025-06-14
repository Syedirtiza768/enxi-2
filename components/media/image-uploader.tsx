'use client';

import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Upload, X, FileImage, AlertCircle } from 'lucide-react';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

interface ImageUploaderProps {
  onUpload?: (files: File[]) => void | Promise<void>;
  onRemove?: (id: string) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
  preview?: boolean;
}

/**
 * Image Uploader component
 * Handles image file uploads with drag-and-drop support
 */
export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUpload,
  onRemove,
  accept = 'image/*',
  multiple = true,
  maxSize = 5, // 5MB default
  maxFiles = 10,
  className,
  disabled = false,
  preview = true,
}): void => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'File must be an image';
    }

    // Check file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSize}MB`;
    }

    return null;
  }, [maxSize]);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check max files limit
    if (images.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newImages: UploadedImage[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      
      const uploadedImage: UploadedImage = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
        status: error ? 'error' : 'pending',
        error,
      };

      newImages.push(uploadedImage);
    }

    setImages(prev => [...prev, ...newImages]);

    // Only upload files without errors
    const validFiles = newImages
      .filter(img => img.status !== 'error')
      .map(img => img.file);

    if (validFiles.length > 0 && onUpload) {
      // Update status to uploading
      setImages(prev =>
        prev.map(img =>
          newImages.find(ni => ni.id === img.id) && img.status === 'pending'
            ? { ...img, status: 'uploading' as const, progress: 0 }
            : img
        )
      );

      try {
        await onUpload(validFiles);
        
        // Update status to success
        setImages(prev =>
          prev.map(img =>
            newImages.find(ni => ni.id === img.id) && img.status === 'uploading'
              ? { ...img, status: 'success' as const, progress: 100 }
              : img
          )
        );
      } catch (error) {
        // Update status to error
        setImages(prev =>
          prev.map(img =>
            newImages.find(ni => ni.id === img.id) && img.status === 'uploading'
              ? { ...img, status: 'error' as const, error: 'Upload failed' }
              : img
          )
        );
      }
    }
  }, [images.length, maxFiles, validateFile, onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [disabled, processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemove = useCallback((id: string) => {
    const image = images.find(img => img.id === id);
    if (image) {
      URL.revokeObjectURL(image.url);
      setImages(prev => prev.filter(img => img.id !== id));
      onRemove?.(id);
    }
  }, [images, onRemove]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('image-uploader', className)}>
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />

        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        <p className="text-lg font-medium text-gray-700 mb-2">
          {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
        </p>
        
        <p className="text-sm text-gray-500">
          {accept === 'image/*' ? 'PNG, JPG, GIF' : accept} up to {maxSize}MB
        </p>
        
        {multiple && (
          <p className="text-sm text-gray-500 mt-1">
            Maximum {maxFiles} files
          </p>
        )}
      </div>

      {/* Uploaded Images */}
      {preview && images.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map(image => (
            <div
              key={image.id}
              className={cn(
                'relative group rounded-lg overflow-hidden border',
                image.status === 'error' ? 'border-red-500' : 'border-gray-200'
              )}
            >
              {/* Image Preview */}
              <div className="aspect-square relative bg-gray-100">
                <Image
                  src={image.url}
                  alt={image.name}
                  fill
                  className="object-cover"
                />
                
                {/* Overlay */}
                {image.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                      <p className="text-sm">{image.progress || 0}%</p>
                    </div>
                  </div>
                )}
                
                {/* Remove Button */}
                <button
                  onClick={(): void => handleRemove(image.id)}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Image Info */}
              <div className="p-2">
                <p className="text-sm font-medium truncate" title={image.name}>
                  {image.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(image.size)}
                </p>
                
                {image.status === 'error' && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle size={12} className="text-red-500" />
                    <p className="text-xs text-red-500">{image.error}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Default export for dynamic imports
export default ImageUploader;