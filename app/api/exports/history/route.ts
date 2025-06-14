import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/utils/auth';
import { ExportService } from '@/lib/services/export.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async ({ user }) => {
    try {
      const exportService = new ExportService();
      const history = await exportService.getJobHistory(user.id);

      return NextResponse.json(history);

    } catch (error) {
      console.error('Export history error:', error);
      return NextResponse.json(
        { error: 'Failed to get export history' },
        { status: 500 }
      );
    }
  });
}