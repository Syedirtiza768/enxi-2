import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/utils/auth';
import { ExportService } from '@/lib/services/export.service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }): Promise<NextResponse> {
  return withAuth(request, async ({ user }) => {
    try {
      const { jobId } = await params;

      if (!jobId) {
        return NextResponse.json(
          { error: 'Job ID is required' },
          { status: 400 }
        );
      }

      const exportService = new ExportService();
      const status = await exportService.getExportStatus(jobId);

      if (!status) {
        return NextResponse.json(
          { error: 'Export job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(status);

    } catch (error) {
      console.error('Export status error:', error);
      return NextResponse.json(
        { error: 'Failed to get export status' },
        { status: 500 }
      );
    }
  });
}