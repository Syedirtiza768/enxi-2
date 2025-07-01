'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { BulkImportDialog } from '@/components/bulk-import/bulk-import-dialog'

interface BulkImportButtonProps {
  onSuccess?: () => void
}

export function CustomerBulkImportButton({ onSuccess }: BulkImportButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Upload className="mr-2 h-4 w-4" />
        Bulk Import
      </Button>

      <BulkImportDialog
        open={open}
        onOpenChange={setOpen}
        title="Import Customers"
        description="Upload a CSV file to import multiple customers at once. Download our template to see the required format."
        entityType="customers"
        onSuccess={onSuccess}
      />
    </>
  )
}