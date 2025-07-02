'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DataTable,
  ColumnDef,
  createSelectionColumn,
  createActionsColumn,
} from '@/components/ui/data-table';
import { 
  Plus, 
  Download, 
  Mail, 
  Eye, 
  Edit, 
  Copy, 
  MoreVertical,
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
import { toast } from '@/components/ui/toast';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { QuotationStatus } from "@prisma/client";

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
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (dateRange.from) params.append('fromDate', dateRange.from);
      if (dateRange.to) params.append('toDate', dateRange.to);
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());

      const response = await apiClient<{
        data: QuotationListItem[];
        total: number;
        stats: QuotationStats;
      }>(`/api/quotations?${params.toString()}`);

      if (response.ok && response.data) {
        setQuotations(response.data.data || []);
        setTotalItems(response.data.total || 0);
        setStats(response.data.stats || null);
      } else {
        throw new Error(response.error || 'Failed to fetch quotations');
      }
    } catch (err) {
      console.error('Error fetching quotations:', err);
      setError('Failed to load quotations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, dateRange, page, pageSize]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const getStatusBadge = (status: QuotationStatus) => {
    const config = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: <FileText className="h-3 w-3" /> },
      SENT: { color: 'bg-blue-100 text-blue-800', icon: <Mail className="h-3 w-3" /> },
      ACCEPTED: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      EXPIRED: { color: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="h-3 w-3" /> },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
    };

    const { color, icon } = config[status] || config.DRAFT;
    
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {status}
      </Badge>
    );
  };

  const handleBulkExport = async () => {
    try {
      const response = await apiClient('/api/quotations/export', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        toast({
          title: 'Export started',
          description: 'Your quotations are being exported',
        });
      }
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export quotations',
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
          description: 'Quotation has been sent to the customer',
        });
        fetchQuotations();
      }
    } catch (error) {
      toast({
        title: 'Send failed',
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

  const columns: ColumnDef<QuotationListItem>[] = [
    createSelectionColumn<QuotationListItem>(),
    {
      accessorKey: 'quotationNumber',
      header: 'Number',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('quotationNumber')}</div>
          <div className="text-sm text-gray-500">v{row.original.version}</div>
        </div>
      ),
    },
    {
      accessorKey: 'salesCase.customer.name',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.salesCase.customer.name}</div>
          <div className="text-sm text-gray-500">{row.original.salesCase.caseNumber}</div>
        </div>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="font-medium">
          {formatCurrency(row.getValue('totalAmount'), row.original.currency)}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.getValue('status')),
    },
    {
      accessorKey: 'validUntil',
      header: 'Valid Until',
      cell: ({ row }) => {
        const validUntil = row.getValue('validUntil') as string;
        const expired = isExpired(validUntil);
        return (
          <div className="flex items-center gap-2">
            <span className={expired ? 'text-red-600' : ''}>
              {formatDate(validUntil)}
            </span>
            {expired && <AlertCircle className="h-4 w-4 text-red-600" />}
          </div>
        );
      },
    },
    createActionsColumn<QuotationListItem>((quotation) => (
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
    )),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground">Manage and track your quotations</p>
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

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={quotations}
        loading={loading}
        error={error}
        pagination={{
          page,
          pageSize,
          total: totalItems,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }}
        search={{
          value: searchQuery,
          placeholder: 'Search by number, customer, or description...',
          onChange: setSearchQuery,
        }}
        filters={
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
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
            <div>
              <Input
                type="date"
                placeholder="From date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="To date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
          </div>
        }
        actions={
          <Button onClick={() => router.push('/quotations/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        }
        onRefresh={fetchQuotations}
        onRowClick={(quotation) => router.push(`/quotations/${quotation.id}`)}
        bulkActions={{
          selectedRows: selectedIds,
          onSelectRow: (row, selected) => {
            const newSet = new Set(selectedIds);
            if (selected) {
              newSet.add(row.id);
            } else {
              newSet.delete(row.id);
            }
            setSelectedIds(newSet);
          },
          onSelectAll: (selected) => {
            if (selected) {
              setSelectedIds(new Set(quotations.map(q => q.id)));
            } else {
              setSelectedIds(new Set());
            }
          },
          actions: (
            <Button size="sm" variant="outline" onClick={handleBulkExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          ),
        }}
        emptyState={{
          icon: <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />,
          title: 'No quotations found',
          description: 'Get started by creating your first quotation',
          action: (
            <Button onClick={() => router.push('/quotations/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Quotation
            </Button>
          ),
        }}
        showColumnVisibility
        showSorting
        stickyHeader
      />
    </div>
  );
}