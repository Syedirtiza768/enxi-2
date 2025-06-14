import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/utils/auth';
import { ExportService } from '@/lib/services/export.service';
import { readFile } from 'fs/promises';
import { getContentType } from '@/lib/utils/export';
import path from 'path';

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

      if (status.status !== 'completed') {
        return NextResponse.json(
          { error: 'Export not completed' },
          { status: 400 }
        );
      }

      // Get the file path from the job (this would need to be stored in the job)
      const tempDir = path.join(process.cwd(), 'temp', 'exports');
      
      // For security, we need to validate the file exists and belongs to this job
      // In a real implementation, you'd store the file path in the job object
      const fileName = `export_${jobId}`;
      
      // Try different extensions based on the job format
      const possibleExtensions = ['.csv', '.xlsx', '.pdf', '.zip'];
      let filePath: string | null = null;
      let contentType = 'application/octet-stream';
      
      for (const ext of possibleExtensions) {
        try {
          const testPath = path.join(tempDir, fileName + ext);
          await readFile(testPath); // This will throw if file doesn't exist
          filePath = testPath;
          
          // Set content type based on extension
          const format = ext.substring(1); // Remove the dot
          contentType = getContentType(format === 'xlsx' ? 'excel' : format);
          break;
        } catch {
          // File doesn't exist, try next extension
          continue;
        }
      }

      if (!filePath) {
        return NextResponse.json(
          { error: 'Export file not found' },
          { status: 404 }
        );
      }

      const fileBuffer = await readFile(filePath);
      const fileName_download = path.basename(filePath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName_download}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });

    } catch (error) {
      console.error('Export download error:', error);
      return NextResponse.json(
        { error: 'Failed to download export file' },
        { status: 500 }
      );
    }
  });
}