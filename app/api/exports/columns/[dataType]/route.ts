import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/utils/auth';
import { ExportService } from '@/lib/services/export.service';
import { validateExportPermissions } from '@/lib/utils/export';

export async function GET(request: NextRequest, { params }: { params: Promise<{ dataType: string }> }): Promise<NextResponse> {
  return withAuth(request, async ({ user }) => {
    try {
      const { dataType } = await params;

      if (!dataType) {
        return NextResponse.json(
          { error: 'Data type is required' },
          { status: 400 }
        );
      }

      // Check user permissions
      const userPermissions = [user.role]; // In a real app, get actual permissions from user
      if (!validateExportPermissions(dataType, userPermissions)) {
        return NextResponse.json(
          { error: 'Insufficient permissions for this export' },
          { status: 403 }
        );
      }

      const exportService = new ExportService();
      const columns = await exportService.getAvailableColumns(dataType);

      return NextResponse.json({ columns });

    } catch (error) {
      console.error('Export columns error:', error);
      return NextResponse.json(
        { error: 'Failed to get available columns' },
        { status: 500 }
      );
    }
  });
}