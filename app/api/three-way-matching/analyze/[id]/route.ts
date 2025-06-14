import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { ThreeWayMatchingService } from '@/lib/services/purchase/three-way-matching.service'

// GET /api/three-way-matching/analyze/[id] - Analyze three-way matching for specific purchase order
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const includeTolerance = searchParams.get('includeTolerance') === 'true'
    
    const threeWayMatchingService = new ThreeWayMatchingService()
    
    let analysis
    if (includeTolerance) {
      // Use default tolerance settings if not provided
      const tolerance = {
        quantityTolerancePercent: parseFloat(searchParams.get('quantityTolerance') || '5'),
        priceTolerancePercent: parseFloat(searchParams.get('priceTolerance') || '3'),
        amountTolerancePercent: parseFloat(searchParams.get('amountTolerance') || '2')
      }
      
      analysis = await threeWayMatchingService.analyzeWithTolerance(resolvedParams.id, tolerance)
    } else {
      analysis = await threeWayMatchingService.analyzeThreeWayMatching(resolvedParams.id)
    }

    return NextResponse.json(analysis)
  } catch (error: unknown) {
    console.error('Error analyzing three-way matching:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze three-way matching' },
      { status: 500 }
    )
  }
}