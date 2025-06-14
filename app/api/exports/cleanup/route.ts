import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/utils/auth';
import { ExportService } from '@/lib/services/export.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async ({ user }) => {
    try {
      // Only allow admin users to trigger cleanup
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - admin access required' },
          { status: 403 }
        );
      }

      const exportService = new ExportService();
      await exportService.cleanupOldFiles();

      return NextResponse.json({ 
        message: 'Export files cleanup completed successfully' 
      });

    } catch (error) {
      console.error('Export cleanup error:', error);
      return NextResponse.json(
        { error: 'Failed to cleanup export files' },
        { status: 500 }
      );
    }
  });
}