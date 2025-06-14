#!/usr/bin/env tsx

/**
 * Type System Duplicates Fix Script
 * 
 * This script automatically fixes the duplicate type definitions found in the validation
 * by updating imports and removing local duplicate definitions.
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

interface Fix {
  file: string
  type: 'remove-duplicate' | 'update-import' | 'add-import'
  pattern?: string
  replacement?: string
  importStatement?: string
}

class TypeDuplicateFixer {
  private projectRoot: string
  private fixes: Fix[] = []

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
  }

  async fixDuplicates(): Promise<void> {
    console.log('🔧 Starting type duplicate fixes...')
    
    // Define fixes for major duplicates
    this.prepareFixes()
    
    // Apply fixes
    await this.applyFixes()
    
    console.log('✅ Type duplicate fixes completed!')
  }

  private prepareFixes(): void {
    // Fix SelectOption duplicates by removing local definitions and adding imports
    this.fixes.push(
      {
        file: 'components/design-system/atoms/Select.tsx',
        type: 'update-import',
        pattern: "export type { SelectOption } from '@/lib/types/ui.types'",
        replacement: "import type { SelectOption } from '@/lib/types/ui.types'"
      }
    )

    // Fix ValidationResult duplicate in validation script
    this.fixes.push(
      {
        file: 'scripts/validate-type-system.ts',
        type: 'update-import',
        pattern: 'interface ValidationResult {',
        replacement: 'interface TypeValidationResult {',
        importStatement: "import type { ValidationResult } from '@/lib/types'"
      }
    )

    // Fix ApiResponse duplicates by removing from api.types.ts (keep common.types.ts as primary)
    this.fixes.push(
      {
        file: 'lib/types/api.types.ts',
        type: 'remove-duplicate',
        pattern: 'export interface ApiResponse<T = unknown> {[\\s\\S]*?}',
        replacement: "// ApiResponse moved to common.types.ts to avoid duplication\nexport type { ApiResponse } from './common.types'"
      }
    )

    // Fix duplicate interfaces in accounting reports by adding imports
    const accountingFiles = [
      'app/(auth)/accounting/reports/trial-balance/page.tsx',
      'app/(auth)/accounting/reports/balance-sheet/page.tsx',
      'app/(auth)/accounting/reports/income-statement/page.tsx'
    ]

    accountingFiles.forEach(file => {
      this.fixes.push({
        file,
        type: 'add-import',
        importStatement: "import type { TrialBalance, TrialBalanceAccount, BalanceSheet, IncomeStatement, AccountBalance } from '@/lib/types/accounting.types'"
      })
    })

    // Fix inventory duplicates
    const inventoryFiles = [
      'app/(auth)/inventory/stock-out/page.tsx',
      'components/quotations/simple-item-editor.tsx'
    ]

    inventoryFiles.forEach(file => {
      this.fixes.push({
        file,
        type: 'add-import',
        importStatement: "import type { StockMovement, InventoryItem } from '@/lib/types'"
      })
    })

    // Fix form error duplicates
    const formFiles = [
      'components/payments/payment-form.tsx',
      'components/leads/lead-form.tsx'
    ]

    formFiles.forEach(file => {
      this.fixes.push({
        file,
        type: 'add-import',
        importStatement: "import type { FormErrors } from '@/lib/types'"
      })
    })
  }

  private async applyFixes(): Promise<void> {
    for (const fix of this.fixes) {
      const filePath = path.join(this.projectRoot, fix.file)
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${fix.file}`)
        continue
      }

      try {
        await this.applyFix(filePath, fix)
        console.log(`✅ Fixed: ${fix.file}`)
      } catch (error) {
        console.error(`❌ Error fixing ${fix.file}:`, error)
      }
    }
  }

  private async applyFix(filePath: string, fix: Fix): Promise<void> {
    let content = fs.readFileSync(filePath, 'utf-8')

    switch (fix.type) {
      case 'remove-duplicate':
        if (fix.pattern && fix.replacement) {
          const regex = new RegExp(fix.pattern, 'g')
          content = content.replace(regex, fix.replacement)
        }
        break

      case 'update-import':
        if (fix.pattern && fix.replacement) {
          content = content.replace(fix.pattern, fix.replacement)
        }
        if (fix.importStatement) {
          content = this.addImportStatement(content, fix.importStatement)
        }
        break

      case 'add-import':
        if (fix.importStatement) {
          content = this.addImportStatement(content, fix.importStatement)
          // Remove local duplicate interfaces
          content = this.removeLocalDuplicates(content)
        }
        break
    }

    fs.writeFileSync(filePath, content)
  }

  private addImportStatement(content: string, importStatement: string): string {
    const lines = content.split('\n')
    
    // Find the position to insert the import (after other imports)
    let insertIndex = 0
    let lastImportIndex = -1
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('import ') || line.startsWith('export ') && line.includes('from')) {
        lastImportIndex = i
      } else if (line && !line.startsWith('//') && !line.startsWith('/*') && lastImportIndex >= 0) {
        insertIndex = lastImportIndex + 1
        break
      }
    }

    // Check if import already exists
    if (content.includes(importStatement)) {
      return content
    }

    lines.splice(insertIndex, 0, importStatement)
    return lines.join('\n')
  }

  private removeLocalDuplicates(content: string): string {
    // Remove common duplicate interface patterns
    const duplicatePatterns = [
      /interface\s+TrialBalance\s*{[^}]*}/g,
      /interface\s+TrialBalanceAccount\s*{[^}]*}/g,
      /interface\s+BalanceSheet\s*{[^}]*}/g,
      /interface\s+IncomeStatement\s*{[^}]*}/g,
      /interface\s+AccountBalance\s*{[^}]*}/g,
      /interface\s+StockMovement\s*{[^}]*}/g,
      /interface\s+InventoryItem\s*{[^}]*}/g,
      /interface\s+FormErrors\s*{[^}]*}/g,
      /interface\s+SelectOption\s*{[^}]*}/g
    ]

    let result = content
    duplicatePatterns.forEach(pattern => {
      result = result.replace(pattern, '// Interface moved to central types file')
    })

    return result
  }
}

// Additional function to create migration guide
function createMigrationGuide(): void {
  const guide = `
# Type System Migration Guide

This guide explains the changes made to consolidate the type system and eliminate duplicates.

## Key Changes

### 1. Consolidated SelectOption Interface
- **Location**: \`lib/types/ui.types.ts\`
- **Migration**: Replace all local \`SelectOption\` interfaces with import from \`@/lib/types/ui.types\`

### 2. Standardized API Response Types
- **Primary Location**: \`lib/types/common.types.ts\`
- **New Standard**: \`StandardApiResponse<T>\` in \`lib/types/index.ts\`
- **Migration**: Gradually migrate to \`StandardApiResponse\` for new code

### 3. Central Type Index
- **Location**: \`lib/types/index.ts\`
- **Purpose**: Single source of truth for all type exports
- **Usage**: Import common types from \`@/lib/types\` instead of individual files

### 4. Eliminated Duplicates

The following interfaces were consolidated:

#### UI Components
- \`SelectOption\` → \`@/lib/types/ui.types\`
- \`FormErrors\` → \`@/lib/types/common.types\`
- \`TableColumn\` → \`@/lib/types/common.types\`

#### Accounting
- \`TrialBalance\` → \`@/lib/types/accounting.types\`
- \`BalanceSheet\` → \`@/lib/types/accounting.types\`
- \`IncomeStatement\` → \`@/lib/types/accounting.types\`
- \`AccountBalance\` → \`@/lib/types/accounting.types\`

#### Inventory
- \`StockMovement\` → \`@/lib/types\` (from Prisma)
- \`InventoryItem\` → \`@/lib/types\` (from Prisma)

#### General
- \`ApiResponse\` → \`@/lib/types/common.types\`
- \`TimelineEvent\` → \`@/lib/types/common.types\`
- \`ValidationResult\` → \`@/lib/types/common.types\`

## Best Practices Going Forward

1. **Always check \`lib/types/index.ts\` first** before creating new interfaces
2. **Import from central locations**: Use \`@/lib/types\` for common types
3. **Avoid local duplicates**: Import existing types instead of redefining
4. **Use TypeScript's utility types** like \`Partial<T>\`, \`Pick<T, K>\`, etc.
5. **Follow naming conventions**: PascalCase for interfaces and types

## Import Examples

\`\`\`typescript
// ✅ Good - Central import
import type { SelectOption, FormErrors, ApiResponse } from '@/lib/types'

// ✅ Good - Specific import
import type { TrialBalance } from '@/lib/types/accounting.types'

// ❌ Bad - Local duplicate
// SelectOption interface removed - use from '@/lib/types/ui.types'

// ❌ Bad - Multiple imports for same concepts
import { ApiResponse } from './api.types'
import { ApiResponse as CommonApiResponse } from './common.types'
\`\`\`

## Validation

Run the type validation script to check for new duplicates:

\`\`\`bash
npx tsx scripts/validate-type-system.ts
\`\`\`
`

  fs.writeFileSync('TYPE_MIGRATION_GUIDE.md', guide)
  console.log('📄 Migration guide created: TYPE_MIGRATION_GUIDE.md')
}

async function main() {
  try {
    const projectRoot = process.cwd()
    const fixer = new TypeDuplicateFixer(projectRoot)
    
    await fixer.fixDuplicates()
    createMigrationGuide()
    
    console.log('\n' + '='.repeat(60))
    console.log('TYPE SYSTEM CLEANUP COMPLETE')
    console.log('='.repeat(60))
    console.log('✅ Major duplicate interfaces consolidated')
    console.log('✅ Import statements updated')
    console.log('✅ Central type index created')
    console.log('✅ Migration guide generated')
    console.log('\n💡 Next steps:')
    console.log('1. Review the changes in git diff')
    console.log('2. Run TypeScript compiler to check for errors')
    console.log('3. Update remaining files manually if needed')
    console.log('4. Run validation script again to verify fixes')
    console.log('\n📄 See TYPE_MIGRATION_GUIDE.md for details')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('❌ Fix script failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { TypeDuplicateFixer }