import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/utils/auth';
import { ExportService } from '@/lib/services/export.service';
import { validateExportPermissions, EXPORT_DATA_TYPES } from '@/lib/utils/export';
import { z } from 'zod';

const exportRequestSchema = z.object({
  dataType: z.string(),
  options: z.object({
    format: z.enum(['csv', 'excel', 'pdf']),
    dateRange: z.object({
      from: z.string().datetime(),
      to: z.string().datetime()
    }).optional(),
    columns: z.array(z.string()).optional(),
    filters: z.record(z.any()).optional(),
    includeHeaders: z.boolean().optional(),
    maxRows: z.number().optional(),
    emailDelivery: z.object({
      enabled: z.boolean(),
      recipients: z.array(z.string().email()),
      subject: z.string().optional(),
      message: z.string().optional()
    }).optional()
  })
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async ({ user }) => {
    try {
      const body = await request.json();
      const validation = exportRequestSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid request data', details: validation.error.issues },
          { status: 400 }
        );
      }

      const { dataType, options } = validation.data;

      // Check if data type is supported
      const exportConfig = EXPORT_DATA_TYPES[dataType];
      if (!exportConfig) {
        return NextResponse.json(
          { error: `Unsupported data type: ${dataType}` },
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

      // Validate max rows limit
      if (options.maxRows && options.maxRows > exportConfig.maxRows) {
        return NextResponse.json(
          { error: `Maximum rows exceeded. Limit: ${exportConfig.maxRows}` },
          { status: 400 }
        );
      }

      // Process date range if provided
      const processedOptions = {
        ...options,
        dateRange: options.dateRange ? {
          from: new Date(options.dateRange.from),
          to: new Date(options.dateRange.to)
        } : undefined
      };

      const exportService = new ExportService();
      const jobId = await exportService.startExport(dataType, processedOptions, user);

      return NextResponse.json({ jobId });

    } catch (error) {
      console.error('Export start error:', error);
      return NextResponse.json(
        { error: 'Failed to start export' },
        { status: 500 }
      );
    }
  });
}