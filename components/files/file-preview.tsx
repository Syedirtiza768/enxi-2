'use client';

import React from 'react';
import { 
  File, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio,
  FileCode,
  FileSpreadsheet,
  Download,
  X,
  Maximize2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FilePreviewProps {
  url: string;
  fileName: string;
  fileType?: string;
  className?: string;
  onClose?: () => void;
  onDownload?: () => void;
  showControls?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  url,
  fileName,
  fileType,
  className,
  onClose,
  onDownload,
  showControls = true
}): void => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const getFileType = (): string => {
    if (fileType) return fileType;
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Map common extensions to MIME types
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml'
    };
    
    return mimeMap[extension || ''] || 'application/octet-stream';
  };

  const getFileIcon = (): void => {
    const type = getFileType();
    
    if (type.startsWith('image/')) return FileImage;
    if (type.startsWith('video/')) return FileVideo;
    if (type.startsWith('audio/')) return FileAudio;
    if (type.includes('pdf')) return FileText;
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return FileSpreadsheet;
    if (type.includes('json') || type.includes('xml') || type.includes('text')) return FileCode;
    if (type.includes('word') || type.includes('document')) return FileText;
    
    return File;
  };

  const handleDownload = (): void => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderPreview = (): void => {
    const type = getFileType();
    
    // Image preview
    if (type.startsWith('image/')) {
      return (
        <img
          src={url}
          alt={fileName}
          className="max-w-full max-h-full object-contain"
          onLoad={(): void => setIsLoading(false)}
          onError={(): void => {
            setIsLoading(false);
            setError('Failed to load image');
          }}
        />
      );
    }
    
    // Video preview
    if (type.startsWith('video/')) {
      return (
        <video
          src={url}
          controls
          className="max-w-full max-h-full"
          onLoadedData={(): void => setIsLoading(false)}
          onError={(): void => {
            setIsLoading(false);
            setError('Failed to load video');
          }}
        >
          Your browser does not support the video tag.
        </video>
      );
    }
    
    // Audio preview
    if (type.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <FileAudio className="h-24 w-24 text-gray-400 mb-4" />
          <audio
            src={url}
            controls
            className="w-full max-w-md"
            onLoadedData={(): void => setIsLoading(false)}
            onError={(): void => {
              setIsLoading(false);
              setError('Failed to load audio');
            }}
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }
    
    // PDF preview (using iframe)
    if (type === 'application/pdf') {
      return (
        <iframe
          src={url}
          className="w-full h-full"
          onLoad={(): void => setIsLoading(false)}
          onError={(): void => {
            setIsLoading(false);
            setError('Failed to load PDF');
          }}
        />
      );
    }
    
    // Text/Code preview
    if (type.includes('text') || type.includes('json') || type.includes('xml')) {
      React.useEffect(() => {
        fetch(url)
          .then(res => res.text())
          .then(text => {
            const pre = document.getElementById('text-preview');
            if (pre) pre.textContent = text;
            setIsLoading(false);
          })
          .catch(() => {
            setIsLoading(false);
            setError('Failed to load file content');
          });
      }, [url]);
      
      return (
        <pre
          id="text-preview"
          className="w-full h-full p-4 bg-gray-50 overflow-auto text-sm font-mono"
        />
      );
    }
    
    // Default preview for unsupported types
    const Icon = getFileIcon();
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Icon className="h-24 w-24 text-gray-400 mb-4" />
        <p className="text-lg font-medium mb-2">{fileName}</p>
        <p className="text-sm text-gray-500 mb-4">
          Preview not available for this file type
        </p>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  };

  const content = (
    <div className={cn('relative bg-white rounded-lg overflow-hidden', className)}>
      {showControls && (
        <div className="absolute top-0 right-0 p-2 z-10 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="bg-white/90 hover:bg-white"
          >
            <Download className="h-4 w-4" />
          </Button>
          
          {!isFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(): void => setIsFullscreen(true)}
              className="bg-white/90 hover:bg-white"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="bg-white/90 hover:bg-white"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      
      <div className="relative w-full h-full min-h-[400px] flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}
        
        {error ? (
          <div className="text-center">
            <File className="h-24 w-24 text-gray-400 mx-auto mb-4" />
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          renderPreview()
        )}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{fileName}</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
};

// Default export
export default FilePreview;