import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/utils/auth';
import { ExportService } from '@/lib/services/export.service';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async ({ user }) => {
    try {
      // Only allow admin users to view all export jobs
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - admin access required' },
          { status: 403 }
        );
      }

      const exportService = new ExportService();
      
      // Get all jobs (this would need to be implemented to fetch from all users)
      // For now, we'll return a mock response since the service stores jobs in memory
      const mockJobs = [
        {
          id: 'export_1234567890_abc123def',
          userId: user.id,
          dataType: 'customers',
          status: 'completed' as const,
          progress: 100,
          totalRows: 1250,
          processedRows: 1250,
          downloadUrl: '/api/exports/download/export_1234567890_abc123def',
          createdAt: new Date(Date.now() - 3600000), // 1 hour ago
          completedAt: new Date(Date.now() - 3500000), // 1 hour ago
          user: {
            username: user.username,
            email: user.email
          }
        },
        {
          id: 'export_1234567891_def456ghi',
          userId: user.id,
          dataType: 'leads',
          status: 'processing' as const,
          progress: 75,
          totalRows: 500,
          processedRows: 375,
          createdAt: new Date(Date.now() - 300000), // 5 minutes ago
          user: {
            username: user.username,
            email: user.email
          }
        }
      ];

      // Calculate statistics
      const stats = {
        totalJobs: mockJobs.length,
        completedJobs: mockJobs.filter(j => j.status === 'completed').length,
        failedJobs: mockJobs.filter(j => j.status === 'failed').length,
        activeJobs: mockJobs.filter(j => j.status === 'processing' || j.status === 'pending').length,
        totalDataExported: mockJobs.reduce((sum, j) => sum + j.processedRows, 0),
        topDataTypes: [
          { dataType: 'customers', count: 1 },
          { dataType: 'leads', count: 1 }
        ],
        recentActivity: mockJobs.filter(j => 
          new Date(j.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
        ).length
      };

      return NextResponse.json({
        jobs: mockJobs,
        stats
      });

    } catch (error) {
      console.error('Admin exports error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch export data' },
        { status: 500 }
      );
    }
  });
}