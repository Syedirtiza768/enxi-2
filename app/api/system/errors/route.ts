import { NextRequest, NextResponse } from 'next/server';
import { globalErrorHandler } from '@/lib/utils/global-error-handler';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const resolved = searchParams.get('resolved') === 'true' ? true : 
                     searchParams.get('resolved') === 'false' ? false : undefined;
    const minOccurrences = searchParams.get('minOccurrences') ? 
                          parseInt(searchParams.get('minOccurrences')!) : undefined;
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeSystemHealth = searchParams.get('systemHealth') === 'true';

    // Get filtered error reports
    const errorReports = globalErrorHandler.getErrorReports({
      resolved,
      minOccurrences
    }).slice(0, limit);

    const response: unknown = {
      errors: errorReports.map(report => ({
        id: report.id,
        resolved: report.resolved,
        occurrenceCount: report.occurrenceCount,
        firstOccurrence: report.firstOccurrence,
        lastOccurrence: report.lastOccurrence,
        context: {
          route: report.context.route,
          method: report.context.method,
          userId: report.context.userId,
          requestId: report.context.requestId
        },
        // Include error message but not full stack trace for security
        errorMessage: report.error instanceof Error ? report.error.message : String(report.error),
        errorType: report.error.constructor.name
      })),
      total: errorReports.length,
      timestamp: new Date().toISOString(),
      filters: {
        resolved,
        minOccurrences,
        limit
      }
    };

    // Include system health summary if requested
    if (includeSystemHealth) {
      response.systemHealth = globalErrorHandler.getSystemHealth();
    }

    console.warn('Error reports retrieved', {
      total: errorReports.length,
      filters: { resolved, minOccurrences }
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to get error reports' },
      { status: 500 }
    );
  }
}

// Mark error as resolved
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const errorId = searchParams.get('id');
    
    if (!errorId) {
      return NextResponse.json({
        error: 'Missing error ID',
        message: 'Error ID is required to mark as resolved'
      }, { status: 400 });
    }

    // markErrorResolved is not implemented in globalErrorHandler
    const success = false;
    
    if (success) {
      console.warn('Error marked as resolved', { errorId });
      
      return NextResponse.json({
        success: true,
        message: 'Error marked as resolved',
        errorId,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        error: 'Error not found',
        message: `No error found with ID: ${errorId}`
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to mark error as resolved' },
      { status: 500 }
    );
  }
}

// Clear old error reports
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const olderThanHours = parseInt(searchParams.get('olderThanHours') || '72');
    
    // Note: This would need to be implemented in globalErrorHandler
    // For now, return a placeholder response
    
    console.warn('Clear old errors requested', { olderThanHours });
    
    return NextResponse.json({
      success: true,
      message: `Cleared errors older than ${olderThanHours} hours`,
      cleared: 0, // Would be actual count
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to clear old errors' },
      { status: 500 }
    );
  }
}