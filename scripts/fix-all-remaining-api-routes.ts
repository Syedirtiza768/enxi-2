#!/usr/bin/env tsx

/**
 * Fix ALL remaining API routes with parameter naming issues
 */

import { promises as fs } from 'fs'
import { join } from 'path'
import { globSync } from 'glob'

const API_DIR = '/Users/irtizahassan/apps/enxi/enxi-erp/app/api'

async function fixApiRouteFile(filePath: string) {
  try {
    let content = await fs.readFile(filePath, 'utf-8')
    let changed = false

    // Fix _request parameter naming
    const requestParamRegex = /export async function (GET|POST|PUT|DELETE|PATCH)\((_request): NextRequest\)/g
    if (requestParamRegex.test(content)) {
      content = content.replace(requestParamRegex, 'export async function $1(request: NextRequest)')
      changed = true
    }

    // Fix _user variable references
    content = content.replace(/const\s+_user\s*=\s*await\s+getUserFromRequest/g, 'const user = await getUserFromRequest')
    content = content.replace(/const\s+_user\s*=\s*await\s+verifyJWTFromRequest/g, 'const user = await verifyJWTFromRequest')
    
    // Fix specific user property references
    content = content.replace(/\b_user\.id\b/g, 'user.id')
    content = content.replace(/\b_user\.role\b/g, 'user.role')
    content = content.replace(/\b_user\.email\b/g, 'user.email')
    content = content.replace(/\b_user\.username\b/g, 'user.username')
    
    // Fix createdBy/updatedBy references
    content = content.replace(/createdBy:\s*_user\.id/g, 'createdBy: user.id')
    content = content.replace(/updatedBy:\s*_user\.id/g, 'updatedBy: user.id')
    content = content.replace(/userId:\s*_user\.id/g, 'userId: user.id')
    
    // Fix where clause references
    content = content.replace(/where:\s*{\s*id:\s*_user\.id\s*}/g, 'where: { id: user.id }')
    content = content.replace(/managerId:\s*_user\.id/g, 'managerId: user.id')

    if (changed) {
      await fs.writeFile(filePath, content, 'utf-8')
      console.log(`✅ Fixed: ${filePath.replace(API_DIR, '')}`)
      return true
    }
    return false
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error)
    return false
  }
}

async function main() {
  console.log('🔧 Fixing ALL remaining API route parameter naming issues...\n')
  
  // Find all route.ts files in the API directory
  const routeFiles = globSync('**/route.ts', { cwd: API_DIR })
  
  let totalFixed = 0
  let totalChecked = 0

  for (const file of routeFiles) {
    const filePath = join(API_DIR, file)
    totalChecked++
    if (await fixApiRouteFile(filePath)) {
      totalFixed++
    }
  }

  console.log(`\n📊 Results: Fixed ${totalFixed} out of ${totalChecked} API route files`)
  console.log('✨ All API routes should now have consistent parameter naming!')
}

main().catch(console.error)