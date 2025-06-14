'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Eye } from 'lucide-react';
import PDFViewer, { PDFViewerProps } from './pdf-viewer';
import { cn } from '@/lib/utils';

export interface PDFModalProps extends Omit<PDFViewerProps, 'file'> {
  /** PDF file URL or File object */
  file: string | File | null;
  /** Modal trigger element */
  trigger?: React.ReactNode;
  /** Modal title override */
  modalTitle?: string;
  /** Modal open state (controlled) */
  open?: boolean;
  /** Modal open change handler (controlled) */
  onOpenChange?: (open: boolean) => void;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Custom modal class */
  modalClassName?: string;
  /** Show modal header */
  showHeader?: boolean;
  /** Auto-open on file change */
  autoOpen?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

export const PDFModal: React.FC<PDFModalProps> = ({
  file,
  trigger,
  modalTitle,
  open,
  onOpenChange,
  size = 'xl',
  modalClassName,
  showHeader = true,
  autoOpen = false,
  title,
  ...pdfViewerProps
}): React.JSX.Element => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Handle controlled/uncontrolled state
  const modalOpen = open !== undefined ? open : isOpen;
  const setModalOpen = onOpenChange !== undefined ? onOpenChange : setIsOpen;

  // Auto-open when file changes
  React.useEffect(() => {
    if (autoOpen && file) {
      setModalOpen(true);
    }
  }, [file, autoOpen, setModalOpen]);

  // Default trigger
  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Eye className="h-4 w-4 mr-2" />
      View PDF
    </Button>
  );

  // Get document name for title
  const getDocumentName = (): string => {
    if (modalTitle) return modalTitle;
    if (title) return title;
    if (file instanceof File) return file.name;
    if (typeof file === 'string') {
      const urlParts = file.split('/');
      return urlParts[urlParts.length - 1] || 'Document';
    }
    return 'PDF Document';
  };

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent
        className={cn(
          'p-0 gap-0',
          sizeClasses[size],
          size === 'full' && 'h-[95vh]',
          modalClassName
        )}
      >
        {showHeader && (
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-red-500" />
              <span className="truncate">{getDocumentName()}</span>
            </DialogTitle>
          </DialogHeader>
        )}
        
        <div className={cn(
          'w-full bg-gray-50',
          size === 'full' ? 'h-full' : 'h-[80vh]'
        )}>
          <PDFViewer
            file={file}
            title={title || getDocumentName()}
            {...pdfViewerProps}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFModal;