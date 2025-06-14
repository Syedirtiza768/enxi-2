'use client'

import React, { useState, useRef } from 'react'
import { UploadIcon, DownloadIcon, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface ImportRow {
  rowNumber: number
  code: string
  name: string
  description?: string
  categoryCode: string
  type: string
  unitOfMeasureCode: string
  trackInventory: boolean
  minStockLevel?: number
  maxStockLevel?: number
  reorderPoint?: number
  standardCost?: number
  listPrice?: number
  inventoryAccountCode?: string
  cogsAccountCode?: string
  salesAccountCode?: string
  isSaleable: boolean
  isPurchaseable: boolean
  errors: string[]
  warnings: string[]
  status: 'pending' | 'success' | 'error'
}

interface BulkItemImportProps {
  onClose: () => void
  onImportComplete: () => void
}

export function BulkItemImport({ onClose, onImportComplete }: BulkItemImportProps): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<ImportRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [importStats, setImportStats] = useState({
    total: 0,
    success: 0,
    errors: 0,
    warnings: 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = (): void => {
    const headers = [
      'Code',
      'Name',
      'Description',
      'Category Code',
      'Type (PRODUCT/SERVICE/RAW_MATERIAL)',
      'Unit of Measure Code',
      'Track Inventory (TRUE/FALSE)',
      'Min Stock Level',
      'Max Stock Level',
      'Reorder Point',
      'Standard Cost',
      'List Price',
      'Inventory Account Code',
      'COGS Account Code',
      'Sales Account Code',
      'Is Saleable (TRUE/FALSE)',
      'Is Purchaseable (TRUE/FALSE)'
    ]

    const sampleData = [
      [
        'PROD-001',
        'Sample Product',
        'This is a sample product description',
        'CAT-001',
        'PRODUCT',
        'EA',
        'TRUE',
        '10',
        '100',
        '20',
        '50.00',
        '75.00',
        '1200',
        '5000',
        '4000',
        'TRUE',
        'TRUE'
      ],
      [
        'SERV-001',
        'Sample Service',
        'This is a sample service',
        'CAT-002',
        'SERVICE',
        'HR',
        'FALSE',
        '',
        '',
        '',
        '100.00',
        '150.00',
        '',
        '5100',
        '4100',
        'TRUE',
        'FALSE'
      ]
    ]

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'item_import_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        alert('Please select a CSV file')
        return
      }
      setFile(selectedFile)
      setImportData([])
      setShowPreview(false)
    }
  }

  const processFile = async (): Promise<void> => {
    if (!file) return

    setIsProcessing(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      const rows: ImportRow[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const row: ImportRow = {
          rowNumber: i + 1,
          code: values[0] || '',
          name: values[1] || '',
          description: values[2] || '',
          categoryCode: values[3] || '',
          type: values[4] || 'PRODUCT',
          unitOfMeasureCode: values[5] || '',
          trackInventory: values[6]?.toUpperCase() === 'TRUE',
          minStockLevel: parseFloat(values[7]) || 0,
          maxStockLevel: parseFloat(values[8]) || 0,
          reorderPoint: parseFloat(values[9]) || 0,
          standardCost: parseFloat(values[10]) || 0,
          listPrice: parseFloat(values[11]) || 0,
          inventoryAccountCode: values[12] || '',
          cogsAccountCode: values[13] || '',
          salesAccountCode: values[14] || '',
          isSaleable: values[15]?.toUpperCase() !== 'FALSE',
          isPurchaseable: values[16]?.toUpperCase() !== 'FALSE',
          errors: [],
          warnings: [],
          status: 'pending'
        }

        // Validate row
        validateRow(row)
        rows.push(row)
      }

      setImportData(rows)
      setShowPreview(true)
      updateStats(rows)
    } catch (error) {
      alert('Error processing file: ' + error)
    } finally {
      setIsProcessing(false)
    }
  }

  const validateRow = (row: ImportRow): void => {
    // Required field validations
    if (!row.code) {
      row.errors.push('Item code is required')
    } else if (!/^[A-Z0-9-]+$/.test(row.code)) {
      row.errors.push('Item code must contain only uppercase letters, numbers, and hyphens')
    }

    if (!row.name) {
      row.errors.push('Item name is required')
    }

    if (!row.categoryCode) {
      row.errors.push('Category code is required')
    }

    if (!['PRODUCT', 'SERVICE', 'RAW_MATERIAL'].includes(row.type)) {
      row.errors.push('Invalid type. Must be PRODUCT, SERVICE, or RAW_MATERIAL')
    }

    if (!row.unitOfMeasureCode) {
      row.errors.push('Unit of measure code is required')
    }

    // Business rule validations
    if (row.type === 'SERVICE' && row.trackInventory) {
      row.warnings.push('Services cannot track inventory. Setting to false.')
      row.trackInventory = false
    }

    if (row.trackInventory) {
      if (row.minStockLevel > row.maxStockLevel && row.maxStockLevel > 0) {
        row.errors.push('Min stock level cannot exceed max stock level')
      }

      if (row.reorderPoint > row.maxStockLevel && row.maxStockLevel > 0) {
        row.warnings.push('Reorder point exceeds max stock level')
      }

      if (!row.inventoryAccountCode) {
        row.warnings.push('Inventory account code recommended for items that track inventory')
      }
    }

    if (row.standardCost > row.listPrice && row.listPrice > 0) {
      row.warnings.push('Standard cost exceeds list price')
    }

    if (row.isSaleable && row.listPrice === 0) {
      row.warnings.push('List price is zero for saleable item')
    }

    if (!row.isSaleable && !row.isPurchaseable) {
      row.errors.push('Item must be either saleable or purchaseable')
    }

    // Set status based on validation
    if (row.errors.length > 0) {
      row.status = 'error'
    }
  }

  const updateStats = (rows: ImportRow[]): void => {
    const stats = {
      total: rows.length,
      success: rows.filter(r => r.status === 'success').length,
      errors: rows.filter(r => r.errors.length > 0).length,
      warnings: rows.filter(r => r.warnings.length > 0 && r.errors.length === 0).length
    }
    setImportStats(stats)
  }

  const importItems = async (): Promise<unknown> => {
    const validRows = importData.filter(row => row.errors.length === 0)
    if (validRows.length === 0) {
      alert('No valid rows to import')
      return
    }

    setIsImporting(true)
    const updatedRows = [...importData]

    for (const row of validRows) {
      if (row.status === 'success') continue

      try {
        const response = await fetch('/api/inventory/items/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: row.code,
            name: row.name,
            description: row.description,
            categoryCode: row.categoryCode,
            type: row.type,
            unitOfMeasureCode: row.unitOfMeasureCode,
            trackInventory: row.trackInventory,
            minStockLevel: row.minStockLevel,
            maxStockLevel: row.maxStockLevel,
            reorderPoint: row.reorderPoint,
            standardCost: row.standardCost,
            listPrice: row.listPrice,
            inventoryAccountCode: row.inventoryAccountCode,
            cogsAccountCode: row.cogsAccountCode,
            salesAccountCode: row.salesAccountCode,
            isSaleable: row.isSaleable,
            isPurchaseable: row.isPurchaseable
          })
        })

        if (response.ok) {
          row.status = 'success'
        } else {
          const error = await response.json()
          row.status = 'error'
          row.errors.push(error.message || 'Import failed')
        }
      } catch (error) {
        row.status = 'error'
        row.errors.push('Network error: ' + error)
      }
    }

    setImportData(updatedRows)
    updateStats(updatedRows)
    setIsImporting(false)

    if (updatedRows.every(row => row.status === 'success')) {
      alert('Import completed successfully!')
      onImportComplete()
    }
  }

  const getRowClassName = (row: ImportRow): void => {
    if (row.status === 'success') return 'bg-green-50'
    if (row.status === 'error' || row.errors.length > 0) return 'bg-red-50'
    if (row.warnings.length > 0) return 'bg-yellow-50'
    return ''
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Bulk Item Import</h2>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: File Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Step 1: Select CSV File</h3>
            <div className="flex items-center space-x-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={(): void => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                Select File
              </button>
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download Template
              </button>
              {file && (
                <span className="text-sm text-gray-600">
                  Selected: {file.name}
                </span>
              )}
            </div>
          </div>

          {/* Step 2: Process File */}
          {file && !showPreview && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Step 2: Process File</h3>
              <button
                type="button"
                onClick={processFile}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Process File'}
              </button>
            </div>
          )}

          {/* Step 3: Preview and Import */}
          {showPreview && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Step 3: Review and Import</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    Success: {importStats.success}
                  </span>
                  <span className="flex items-center">
                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    Errors: {importStats.errors}
                  </span>
                  <span className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                    Warnings: {importStats.warnings}
                  </span>
                  <span>Total: {importStats.total}</span>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importData.map((row) => (
                      <tr key={row.rowNumber} className={getRowClassName(row)}>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.rowNumber}</td>
                        <td className="px-3 py-2 text-sm">
                          {row.status === 'success' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {row.status === 'error' && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          {row.status === 'pending' && row.warnings.length > 0 && (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.code}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.name}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.type}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.categoryCode}</td>
                        <td className="px-3 py-2 text-sm">
                          {row.errors.map((error, i) => (
                            <div key={i} className="text-red-600 text-xs">{error}</div>
                          ))}
                          {row.warnings.map((warning, i) => (
                            <div key={i} className="text-yellow-600 text-xs">{warning}</div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isImporting}
          >
            Close
          </button>
          {showPreview && importStats.errors < importStats.total && (
            <button
              type="button"
              onClick={importItems}
              disabled={isImporting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : `Import ${importStats.total - importStats.errors} Items`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}