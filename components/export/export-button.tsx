'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ExportDialog } from './export-dialog';

export interface ExportButtonProps {
  dataType: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  defaultFilters?: Record<string, any>;
  onExportComplete?: (downloadUrl: string) => void;
}

export function ExportButton({
  dataType,
  variant = 'outline',
  size = 'sm',
  className,
  defaultFilters,
  onExportComplete
}: ExportButtonProps) {
  return (
    <ExportDialog
      dataType={dataType}
      defaultFilters={defaultFilters}
      onExportComplete={onExportComplete}
      trigger={
        <Button variant={variant} size={size} className={className}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      }
    />
  );
}