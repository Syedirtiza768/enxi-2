'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Eye, 
  Edit, 
  Copy, 
  MoreVertical,
  RefreshCw,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { QuotationStatus } from "@prisma/client";
import { Skeleton } from '@/components/ui/skeleton';

interface QuotationListItem {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  version: number;
  createdAt: string;
  validUntil: string;
  totalAmount: number;
  currency: string;
  salesCase: {
    id: string;
    caseNumber: string;
    customer: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface QuotationStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  totalValue: number;
  acceptanceRate: number;
}

export function QuotationList() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QuotationStats | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [showFilters, setShowFilters] = useState(false);
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (dateRange.from) params.append('dateFrom', dateRange.from);
      if (dateRange.to) params.append('dateTo', dateRange.to);
      params.append('limit', pageSize.toString());
      params.append('offset', ((page - 1) * pageSize).toString());

      const response = await apiClient<{ data: QuotationListItem[], total: number }>(`/api/quotations?${params.toString()}`);
      
      if (response.ok && response.data) {
        setQuotations(response.data.data);
        setTotalItems(response.data.total);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch quotations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, dateRange, page, pageSize]);

  const fetchStats = async () => {
    try {
      const response = await apiClient<{ data: QuotationStats }>('/api/quotations/stats');
      if (response.ok && response.data) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchStats();
  }, [fetchQuotations]);

  const getStatusBadge = (status: QuotationStatus) => {
    const variants: Record<QuotationStatus, { label: string; className: string }> = {
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      SENT: { label: 'Sent', className: 'bg-blue-100 text-blue-700' },
      ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-700' },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
      EXPIRED: { label: 'Expired', className: 'bg-orange-100 text-orange-700' },
      CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700' },
    };

    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const handleBulkExport = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: 'No quotations selected',
        description: 'Please select quotations to export',
      });
      return;
    }

    try {
      const ids = Array.from(selectedIds).join(',');
      window.open(`/api/quotations/export?ids=${ids}`, '_blank');
      toast({
        title: 'Export started',
        description: `Exporting ${selectedIds.size} quotations`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export quotations',
        variant: 'destructive',
      });
    }
  };

  const handleSendEmail = async (id: string) => {
    try {
      const response = await apiClient(`/api/quotations/${id}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Email sent',
          description: 'Quotation has been sent successfully',
        });
        fetchQuotations();
      }
    } catch (error) {
      toast({
        title: 'Failed to send',
        description: 'Could not send the quotation',
        variant: 'destructive',
      });
    }
  };

  const handleClone = async (id: string) => {
    try {
      const response = await apiClient<{ data: { id: string } }>(`/api/quotations/${id}/clone`, {
        method: 'POST',
      });

      if (response.ok && response.data) {
        router.push(`/quotations/${response.data.data.id}/edit`);
        toast({
          title: 'Quotation cloned',
          description: 'A new version has been created',
        });
      }
    } catch (error) {
      toast({
        title: 'Clone failed',
        description: 'Could not clone the quotation',
        variant: 'destructive',
      });
    }
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground">Manage and track your quotations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchQuotations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => router.push('/quotations/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Quotations</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.sent}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Acceptance Rate</p>
                <p className="text-2xl font-bold">{stats.acceptanceRate.toFixed(1)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by number, customer, or description..."
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-1 block">From Date</label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">To Date</label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedIds.size} quotation{selectedIds.size > 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleBulkExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedIds(new Set());
                  setSelectAll(false);
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quotations List */}
      <Card>
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No quotations found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first quotation</p>
            <Button onClick={() => router.push('/quotations/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Quotation
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {/* Table Header */}
            <div className="p-4 bg-gray-50 hidden md:grid md:grid-cols-12 gap-4 text-sm font-medium text-gray-600">
              <div className="col-span-1 flex items-center">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(checked) => {
                    setSelectAll(!!checked);
                    if (checked) {
                      setSelectedIds(new Set(quotations.map(q => q.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
              </div>
              <div className="col-span-2">Number</div>
              <div className="col-span-3">Customer</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Valid Until</div>
              <div className="col-span-1"></div>
            </div>

            {/* Table Rows */}
            {quotations.map((quotation) => (
              <div key={quotation.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-1">
                    <Checkbox
                      checked={selectedIds.has(quotation.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedIds);
                        if (checked) {
                          newSet.add(quotation.id);
                        } else {
                          newSet.delete(quotation.id);
                        }
                        setSelectedIds(newSet);
                      }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="font-medium">{quotation.quotationNumber}</div>
                    <div className="text-sm text-gray-500">v{quotation.version}</div>
                  </div>

                  <div className="md:col-span-3">
                    <div className="font-medium">{quotation.salesCase.customer.name}</div>
                    <div className="text-sm text-gray-500">{quotation.salesCase.caseNumber}</div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="font-medium">{formatCurrency(quotation.totalAmount, quotation.currency)}</div>
                  </div>

                  <div className="md:col-span-1">
                    {getStatusBadge(quotation.status)}
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                      <span className={isExpired(quotation.validUntil) ? 'text-red-600' : ''}>
                        {formatDate(quotation.validUntil)}
                      </span>
                      {isExpired(quotation.validUntil) && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/quotations/${quotation.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => router.push(`/quotations/${quotation.id}/edit`)}
                          disabled={quotation.status !== 'DRAFT'}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleClone(quotation.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleSendEmail(quotation.id)}
                          disabled={quotation.status !== 'DRAFT'}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/api/quotations/${quotation.id}/pdf`, '_blank')}>
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalItems > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalItems)} of {totalItems} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page * pageSize >= totalItems}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}