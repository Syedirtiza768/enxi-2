'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/design-system'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api/client'
import { Upload, Download, ArrowLeft, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ImportResult {
  totalRecords: number
  successCount: number
  failureCount: number
  errors: Array<{
    row: number
    email?: string
    name?: string
    error: string
  }>
}

export default function SupplierImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const downloadTemplate = async () => {
    try {
      // Get auth token
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1] || localStorage.getItem('auth-token')
      
      const headers: HeadersInit = {
        'Accept': 'text/csv',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch('/api/suppliers/bulk-import', {
        method: 'GET',
        headers,
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to download template')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'suppliers-import-template.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Template download error:', err)
      setError('Failed to download template')
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      setProgress(20)
      const response = await apiClient('/api/suppliers/bulk-import', {
        method: 'POST',
        body: formData,
      })

      setProgress(100)
      
      if (!response.ok) {
        throw new Error(response.error || 'Import failed')
      }

      setResult(response.data.result)
      
      if (response.data.result.successCount > 0) {
        setTimeout(() => {
          router.push('/suppliers')
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      setProgress(0)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <Link href="/suppliers">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Suppliers
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Import Suppliers</h1>
          <p className="text-muted-foreground mt-2">
            Upload a CSV file to import multiple suppliers at once
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Download Template</CardTitle>
              <CardDescription>
                Start by downloading our CSV template with the required format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download CSV Template
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>
                Select or drag and drop your CSV file to import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  file && "border-primary"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  disabled={importing}
                />
                
                {file ? (
                  <div className="space-y-2">
                    <FileText className="mx-auto h-12 w-12 text-primary" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drop your CSV file here, or click to browse
                    </p>
                  </div>
                )}
              </div>

              {file && !importing && !result && (
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null)
                      setError(null)
                      setResult(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleImport}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Suppliers
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {importing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Importing...</span>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.failureCount === 0 ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Import Successful
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      Import Completed with Errors
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{result.totalRecords}</p>
                      <p className="text-sm text-muted-foreground">Total Records</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{result.successCount}</p>
                      <p className="text-sm text-muted-foreground">Successful</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{result.failureCount}</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Errors:</h4>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {result.errors.map((error, idx) => (
                          <Alert key={idx} variant="destructive" className="py-2">
                            <AlertDescription className="text-sm">
                              Row {error.row}: {error.name || error.email || 'Unknown'} - {error.error}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.successCount > 0 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Successfully imported {result.successCount} suppliers. Redirecting to suppliers list...
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  )
}