'use client';

import React from 'react';
import { Upload, X, File, FileText, FileImage, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  progress?: number;
  status?: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onFilesChange?: (files: FileInfo[]) => void;
  onUpload?: (file: File) => Promise<string>; // Returns URL
  className?: string;
  disabled?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  onFilesChange,
  onUpload,
  className,
  disabled = false
}): void => {
  const [files, setFiles] = React.useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = async (newFiles: File[]): void => {
    // Validate file count
    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Process each file
    const fileInfos: FileInfo[] = [];
    
    for (const file of newFiles) {
      // Validate file size
      if (file.size > maxSize) {
        alert(`File "${file.name}" exceeds maximum size of ${formatFileSize(maxSize)}`);
        continue;
      }

      const fileInfo: FileInfo = {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0
      };

      fileInfos.push(fileInfo);
      
      // If onUpload is provided, upload the file
      if (onUpload) {
        try {
          // Simulate progress updates
          const progressInterval = setInterval(() => {
            setFiles(prev => prev.map(f => 
              f.id === fileInfo.id 
                ? { ...f, progress: Math.min((f.progress || 0) + 10, 90) }
                : f
            ));
          }, 200);

          const url = await onUpload(file);
          
          clearInterval(progressInterval);
          
          fileInfo.url = url;
          fileInfo.status = 'completed';
          fileInfo.progress = 100;
        } catch (error) {
          fileInfo.status = 'error';
          fileInfo.error = error instanceof Error ? error.message : 'Upload failed';
        }
      } else {
        // If no upload handler, just mark as completed
        fileInfo.status = 'completed';
        fileInfo.progress = 100;
        // Create a local URL for preview
        fileInfo.url = URL.createObjectURL(file);
      }
    }

    const updatedFiles = [...files, ...fileInfos];
    setFiles(updatedFiles);
    
    if (onFilesChange) {
      onFilesChange(updatedFiles);
    }
  };

  const removeFile = (id: string): void => {
    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);
    
    if (onFilesChange) {
      onFilesChange(updatedFiles);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): void => {
    if (type.startsWith('image/')) return FileImage;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
        
        <Upload className="h-10 w-10 mx-auto mb-4 text-gray-400" />
        
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop files here, or click to select
        </p>
        
        <Button
          variant="outline"
          size="sm"
          onClick={(): void => fileInputRef.current?.click()}
          disabled={disabled}
        >
          Select Files
        </Button>
        
        <p className="text-xs text-gray-500 mt-2">
          {accept && `Accepted formats: ${accept}`}
          {accept && maxSize && ' • '}
          {maxSize && `Max size: ${formatFileSize(maxSize)}`}
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map(file => {
            const Icon = getFileIcon(file.type);
            
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <Icon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {file.status === 'uploading' && file.progress !== undefined && (
                    <Progress value={file.progress} className="h-1 mt-1" />
                  )}
                  
                  {file.status === 'error' && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}
                </div>
                
                {file.status === 'uploading' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(): void => removeFile(file.id)}
                    className="p-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Default export
export default FileUploader;