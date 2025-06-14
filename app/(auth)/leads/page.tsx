'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { LeadForm } from '@/components/leads/lead-form'
import { LeadStats } from '@/components/leads/lead-stats'
import { ExportButton } from '@/components/export/export-button'
import { useLeads } from '@/hooks/use-leads'
import { LeadStatus, LeadSource } from '@/lib/types/shared-enums'
import { LeadResponse } from '@/lib/types/lead.types'
import { PageLayout, PageHeader, PageSection, VStack } from '@/components/design-system'
import { api } from '@/lib/api/client'

interface ConvertFormData {
  address: string
  taxId: string
  currency: string
  creditLimit: number
  paymentTerms: number
}

export default function LeadsPage(): React.JSX.Element {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL')
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'ALL'>('ALL')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<LeadResponse | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [convertFormData, setConvertFormData] = useState<ConvertFormData>({
    address: '',
    taxId: '',
    currency: 'AED',
    creditLimit: 0,
    paymentTerms: 30
  })

  const {
    leads,
    stats,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
    refetch
  } = useLeads({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    source: sourceFilter === 'ALL' ? undefined : sourceFilter
  })

  const handleCreateLead = async (data: Partial<LeadResponse>): void => {
    try {
      await createLead(data)
      setIsCreateDialogOpen(false)
      refetch()
    } catch (error) {
      console.error('Error creating lead:', error)
      // The error will be shown in the form
      throw error
    }
  }

  const handleUpdateLead = async (data: Partial<LeadResponse>): void => {
    if (!selectedLead) return
    try {
      await updateLead(selectedLead.id, data)
      setIsEditDialogOpen(false)
      setSelectedLead(null)
      refetch()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDeleteLead = async (id: string): void => {
    if (!confirm('Are you sure you want to delete this lead?')) return
    try {
      await deleteLead(id)
      refetch()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleConvertLead = async (): Promise<unknown> => {
    if (!selectedLead) return
    try {
      const response = await api.post(`/api/leads/${selectedLead.id}/convert`, convertFormData)
      
      if (!response.ok) {
        throw new Error(response.error || 'Failed to convert lead')
      }
      
      setIsConvertDialogOpen(false)
      setSelectedLead(null)
      refetch()
      alert('Lead converted to customer successfully!')
    } catch (error) {
      console.error('Error converting lead:', error)
      alert(error instanceof Error ? error.message : 'Failed to convert lead')
    }
  }

  const getStatusBadgeColor = (status: LeadStatus): void => {
    const colors = {
      NEW: 'bg-blue-100 text-blue-800',
      CONTACTED: 'bg-yellow-100 text-yellow-800',
      QUALIFIED: 'bg-green-100 text-green-800',
      PROPOSAL_SENT: 'bg-purple-100 text-purple-800',
      NEGOTIATING: 'bg-orange-100 text-orange-800',
      CONVERTED: 'bg-green-100 text-green-800',
      LOST: 'bg-red-100 text-red-800',
      DISQUALIFIED: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <PageLayout>
      <VStack gap="xl" className="py-6">
        {/* Header */}
        <PageHeader 
          title="Leads"
          description="Manage your sales leads and prospects"
          centered={false}
          actions={
            <div className="flex gap-2">
              <ExportButton 
                dataType="leads" 
                defaultFilters={{
                  status: statusFilter === 'ALL' ? undefined : statusFilter,
                  source: sourceFilter === 'ALL' ? undefined : sourceFilter
                }}
              />
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lead
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Lead</DialogTitle>
                    <DialogDescription>
                      Add a new lead to your sales pipeline
                    </DialogDescription>
                  </DialogHeader>
                  <LeadForm onSubmit={handleCreateLead} />
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {/* Stats */}
        <PageSection>
          <LeadStats stats={stats} />
        </PageSection>

        {/* Filters */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={search}
                    onChange={(e): void => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value): void => setStatusFilter(value as LeadStatus | 'ALL')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    {Object.values(LeadStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={(value): void => setSourceFilter(value as LeadSource | 'ALL')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sources</SelectItem>
                    {Object.values(LeadSource).map((source) => (
                      <SelectItem key={source} value={source}>
                        {source.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Leads Table */}
        <PageSection>
          <Card>
            <CardHeader>
              <CardTitle>Leads ({leads?.total || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading leads...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">
                  Error loading leads: {error instanceof Error ? error.message : String(error)}
                </div>
              ) : leads?.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No leads found. Create your first lead to get started.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads?.data.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.company || '-'}</TableCell>
                          <TableCell>{lead.email}</TableCell>
                          <TableCell>{lead.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(lead.status)}>
                              {lead.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{lead.source?.replace('_', ' ') || '-'}</TableCell>
                          <TableCell>
                            {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(): void => {
                                  setSelectedLead(lead)
                                  setIsViewDialogOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(): void => {
                                  setSelectedLead(lead)
                                  setIsEditDialogOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(): void => handleDeleteLead(lead.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {lead.status !== 'CONVERTED' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(): void => {
                                    setSelectedLead(lead)
                                    setIsConvertDialogOpen(true)
                                  }}
                                >
                                  Convert
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, leads?.total || 0)} of {leads?.total || 0} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(): void => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {page} of {Math.ceil((leads?.total || 0) / 10)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(): void => setPage(page + 1)}
                        disabled={page >= Math.ceil((leads?.total || 0) / 10)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </PageSection>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
              <DialogDescription>
                Update lead information
              </DialogDescription>
            </DialogHeader>
            {selectedLead && (
              <LeadForm 
                initialData={selectedLead}
                onSubmit={handleUpdateLead}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Lead Details</DialogTitle>
            </DialogHeader>
            {selectedLead && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <p className="text-sm text-gray-600">{selectedLead.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <p className="text-sm text-gray-600">{selectedLead.company || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-gray-600">{selectedLead.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <p className="text-sm text-gray-600">{selectedLead.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Badge className={getStatusBadgeColor(selectedLead.status)}>
                      {selectedLead.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Source</label>
                    <p className="text-sm text-gray-600">{selectedLead.source?.replace('_', ' ') || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Estimated Value</label>
                    <p className="text-sm text-gray-600">
                      {selectedLead.estimatedValue ? `$${selectedLead.estimatedValue.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>
                {selectedLead.notes && (
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <p className="text-sm text-gray-600 mt-1">{selectedLead.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Convert Dialog */}
        <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert Lead to Customer</DialogTitle>
              <DialogDescription>
                Provide additional information to convert this lead to a customer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={convertFormData.address}
                  onChange={(e): void => setConvertFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Customer address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tax ID</label>
                <Input
                  value={convertFormData.taxId}
                  onChange={(e): void => setConvertFormData(prev => ({ ...prev, taxId: e.target.value }))}
                  placeholder="Tax identification number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <Select value={convertFormData.currency} onValueChange={(value): void => setConvertFormData(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Credit Limit</label>
                <Input
                  type="number"
                  value={convertFormData.creditLimit}
                  onChange={(e): void => setConvertFormData(prev => ({ ...prev, creditLimit: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Terms (days)</label>
                <Input
                  type="number"
                  value={convertFormData.paymentTerms}
                  onChange={(e): void => setConvertFormData(prev => ({ ...prev, paymentTerms: Number(e.target.value) }))}
                  placeholder="30"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={(): void => setIsConvertDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConvertLead}>
                Convert to Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </VStack>
    </PageLayout>
  )
}