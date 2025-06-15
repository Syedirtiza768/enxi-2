import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get current TypeScript errors
    let currentErrors = 0
    let errorsByFile: Record<string, number> = {}
    let errorsByType: Record<string, number> = {}
    
    try {
      const tscOutput = execSync('npx tsc --noEmit 2>&1 || true', { 
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })
      
      const errorLines = tscOutput.split('\n').filter(line => line.includes('error TS'))
      currentErrors = errorLines.length
      
      // Parse errors by file and type
      errorLines.forEach(line => {
        const fileMatch = line.match(/^(.+?)\(\d+,\d+\): error (TS\d+):/)
        if (fileMatch) {
          const [, filePath, errorCode] = fileMatch
          const relativePath = filePath.replace(process.cwd() + '/', '')
          
          // Count by file
          const fileDir = path.dirname(relativePath).split('/')[0]
          errorsByFile[fileDir] = (errorsByFile[fileDir] || 0) + 1
          
          // Count by error type
          errorsByType[errorCode] = (errorsByType[errorCode] || 0) + 1
        }
      })
    } catch (error) {
      console.error('Error running tsc:', error)
    }
    
    // Read suppressed errors data
    let suppressedData: any = null
    const suppressedErrorsPath = path.join(process.cwd(), 'suppressed-errors.json')
    if (fs.existsSync(suppressedErrorsPath)) {
      suppressedData = JSON.parse(fs.readFileSync(suppressedErrorsPath, 'utf-8'))
    }
    
    // Read build status
    let lastBuildTime: string | null = null
    let buildSuccess = false
    try {
      const buildManifest = path.join(process.cwd(), '.next/BUILD_ID')
      if (fs.existsSync(buildManifest)) {
        const stats = fs.statSync(buildManifest)
        lastBuildTime = stats.mtime.toISOString()
        buildSuccess = true
      }
    } catch (error) {
      console.error('Error reading build status:', error)
    }
    
    // Calculate progress
    const initialErrors = suppressedData?.totalErrors || 2365
    const fixedErrors = initialErrors - currentErrors
    const progressPercentage = Math.round((fixedErrors / initialErrors) * 100)
    
    // Get top error types
    const topErrorTypes = Object.entries(errorsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({
        code,
        count,
        description: getErrorDescription(code)
      }))
    
    // Get most problematic directories
    const problemDirs = Object.entries(errorsByFile)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([dir, count]) => ({ dir, count }))
    
    const response = {
      current: {
        total: currentErrors,
        byPriority: suppressedData?.byPriority || {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        fixed: fixedErrors,
        remaining: currentErrors,
        progressPercentage
      },
      initial: {
        total: initialErrors,
        timestamp: suppressedData?.timestamp
      },
      build: {
        success: buildSuccess,
        lastBuildTime,
        ignoringErrors: true // We know this is true from our setup
      },
      topErrorTypes,
      problemDirs,
      trend: generateTrend(initialErrors, currentErrors),
      lastUpdate: new Date().toISOString()
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating type error stats:', error)
    return NextResponse.json(
      { error: 'Failed to generate statistics' },
      { status: 500 }
    )
  }
}

function getErrorDescription(code: string): string {
  const descriptions: Record<string, string> = {
    'TS2345': 'Argument type mismatch',
    'TS2339': 'Property does not exist',
    'TS7006': 'Parameter implicitly has any type',
    'TS2344': 'Type constraint not satisfied',
    'TS2322': 'Type not assignable',
    'TS2769': 'No overload matches this call',
    'TS2571': 'Object is of type unknown',
    'TS2304': 'Cannot find name',
    'TS2532': 'Object is possibly undefined',
    'TS2741': 'Property is missing in type'
  }
  return descriptions[code] || 'Unknown error type'
}

function generateTrend(initial: number, current: number): Array<{ date: string; errors: number; fixed: number }> {
  // Generate a simple trend for the last 7 days
  const trend = []
  const today = new Date()
  const fixedPerDay = Math.floor((initial - current) / 7)
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    const errors = i === 0 ? current : initial - (fixedPerDay * (6 - i))
    const fixed = initial - errors
    
    trend.push({
      date: date.toISOString().split('T')[0],
      errors,
      fixed
    })
  }
  
  return trend
}