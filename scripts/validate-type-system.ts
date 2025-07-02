#!/usr/bin/env tsx

/**
 * Type System Validation Script
 * 
 * This script validates all interface and type definitions across the codebase:
 * 1. Finds duplicate interfaces
 * 2. Identifies missing interfaces for commonly used objects
 * 3. Ensures consistent naming conventions
 * 4. Looks for interface/type mismatches
 * 5. Validates that all exported types are properly defined
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import type { ValidationResult } from '@/lib/types'

interface TypeDefinition {
  name: string
  type: 'interface' | 'type' | 'enum'
  file: string
  line: number
  exported: boolean
  content: string
}

interface TypeValidationResult {
  duplicates: { name: string; definitions: TypeDefinition[] }[]
  missingTypes: string[]
  namingIssues: { file: string; issue: string; suggestion: string }[]
  orphanedTypes: TypeDefinition[]
  inconsistencies: { issue: string; details: string; files: string[] }[]
  recommendations: string[]
}

class TypeSystemValidator {
  private types: Map<string, TypeDefinition[]> = new Map()
  private sourceFiles: string[] = []
  private projectRoot: string

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
  }

  async validate(): Promise<ValidationResult> {
    console.log('🔍 Scanning TypeScript files...')
    await this.scanFiles()
    
    console.log('📋 Analyzing type definitions...')
    await this.analyzeTypes()
    
    console.log('✅ Validating type system...')
    return this.performValidation()
  }

  private async scanFiles(): Promise<void> {
    const pattern = path.join(this.projectRoot, '**/*.{ts,tsx}')
    const files = await glob(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**'
      ]
    })

    this.sourceFiles = files.filter(file => 
      !file.includes('node_modules') && 
      !file.includes('.d.ts') &&
      !file.includes('generated')
    )

    console.log(`Found ${this.sourceFiles.length} TypeScript files`)
  }

  private async analyzeTypes(): Promise<void> {
    for (const file of this.sourceFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const relativePath = path.relative(this.projectRoot, file)
      
      this.extractTypeDefinitions(content, relativePath)
    }

    console.log(`Found ${this.types.size} unique type names`)
  }

  private extractTypeDefinitions(content: string, file: string): void {
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // Match interface, type, and enum definitions
      const interfaceMatch = line.match(/^(export\s+)?interface\s+(\w+)/)
      const typeMatch = line.match(/^(export\s+)?type\s+(\w+)/)
      const enumMatch = line.match(/^(export\s+)?enum\s+(\w+)/)

      if (interfaceMatch) {
        this.addTypeDefinition({
          name: interfaceMatch[2],
          type: 'interface',
          file,
          line: index + 1,
          exported: !!interfaceMatch[1],
          content: line.trim()
        })
      }

      if (typeMatch) {
        this.addTypeDefinition({
          name: typeMatch[2],
          type: 'type',
          file,
          line: index + 1,
          exported: !!typeMatch[1],
          content: line.trim()
        })
      }

      if (enumMatch) {
        this.addTypeDefinition({
          name: enumMatch[2],
          type: 'enum',
          file,
          line: index + 1,
          exported: !!enumMatch[1],
          content: line.trim()
        })
      }
    })
  }

  private addTypeDefinition(def: TypeDefinition): void {
    if (!this.types.has(def.name)) {
      this.types.set(def.name, [])
    }
    this.types.get(def.name)!.push(def)
  }

  private performValidation(): ValidationResult {
    const result: ValidationResult = {
      duplicates: [],
      missingTypes: [],
      namingIssues: [],
      orphanedTypes: [],
      inconsistencies: [],
      recommendations: []
    }

    // Find duplicates
    result.duplicates = this.findDuplicates()
    
    // Check naming conventions
    result.namingIssues = this.checkNamingConventions()
    
    // Find inconsistencies
    result.inconsistencies = this.findInconsistencies()
    
    // Find missing common types
    result.missingTypes = this.findMissingCommonTypes()
    
    // Add recommendations
    result.recommendations = this.generateRecommendations(result)

    return result
  }

  private findDuplicates(): { name: string; definitions: TypeDefinition[] }[] {
    const duplicates: { name: string; definitions: TypeDefinition[] }[] = []

    this.types.forEach((definitions, name) => {
      if (definitions.length > 1) {
        // Check if they're actually different (not just re-exports)
        const uniqueDefinitions = this.filterUniqueDefinitions(definitions)
        if (uniqueDefinitions.length > 1) {
          duplicates.push({ name, definitions: uniqueDefinitions })
        }
      }
    })

    return duplicates
  }

  private filterUniqueDefinitions(definitions: TypeDefinition[]): TypeDefinition[] {
    const seen = new Set<string>()
    return definitions.filter(def => {
      const key = `${def.content}|${def.type}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private checkNamingConventions(): { file: string; issue: string; suggestion: string }[] {
    const issues: { file: string; issue: string; suggestion: string }[] = []

    this.types.forEach((definitions) => {
      definitions.forEach(def => {
        // Check interface naming (should be PascalCase)
        if (def.type === 'interface' && !this.isPascalCase(def.name)) {
          issues.push({
            file: def.file,
            issue: `Interface '${def.name}' should use PascalCase`,
            suggestion: this.toPascalCase(def.name)
          })
        }

        // Check type naming (should be PascalCase)
        if (def.type === 'type' && !this.isPascalCase(def.name)) {
          issues.push({
            file: def.file,
            issue: `Type '${def.name}' should use PascalCase`,
            suggestion: this.toPascalCase(def.name)
          })
        }

        // Check enum naming (should be PascalCase)
        if (def.type === 'enum' && !this.isPascalCase(def.name)) {
          issues.push({
            file: def.file,
            issue: `Enum '${def.name}' should use PascalCase`,
            suggestion: this.toPascalCase(def.name)
          })
        }

        // Check for Input/Output suffixes consistency
        if (def.name.endsWith('Input') && def.type !== 'interface') {
          issues.push({
            file: def.file,
            issue: `'${def.name}' should be an interface, not a ${def.type}`,
            suggestion: `Convert to interface`
          })
        }

        if (def.name.endsWith('Response') && def.type !== 'interface') {
          issues.push({
            file: def.file,
            issue: `'${def.name}' should be an interface, not a ${def.type}`,
            suggestion: `Convert to interface`
          })
        }
      })
    })

    return issues
  }

  private findInconsistencies(): { issue: string; details: string; files: string[] }[] {
    const inconsistencies: { issue: string; details: string; files: string[] }[] = []

    // Check for SelectOption duplicates
    const selectOptionDefs = this.types.get('SelectOption') || []
    if (selectOptionDefs.length > 1) {
      inconsistencies.push({
        issue: 'Duplicate SelectOption interfaces',
        details: 'Multiple SelectOption interfaces found with potentially different structures',
        files: selectOptionDefs.map(def => def.file)
      })
    }

    // Check for ApiResponse pattern inconsistencies
    const apiResponseTypes = Array.from(this.types.keys()).filter(name => 
      name.includes('Response') || name.includes('ApiResponse')
    )

    const responsePatterns = new Set<string>()
    apiResponseTypes.forEach(typeName => {
      const defs = this.types.get(typeName) || []
      defs.forEach(def => {
        responsePatterns.add(def.content)
      })
    })

    if (responsePatterns.size > 3) {
      inconsistencies.push({
        issue: 'Inconsistent API Response patterns',
        details: 'Multiple different response interface patterns found',
        files: apiResponseTypes.map(name => 
          (this.types.get(name) || [])[0]?.file
        ).filter(Boolean) as string[]
      })
    }

    return inconsistencies
  }

  private findMissingCommonTypes(): string[] {
    const missing: string[] = []

    // Common types that should exist
    const commonTypes = [
      'User',
      'Customer',
      'Supplier',
      'Product',
      'Order',
      'Invoice',
      'Payment',
      'Address',
      'Contact',
      'PaginationParams',
      'SortParams',
      'FilterParams'
    ]

    commonTypes.forEach(typeName => {
      if (!this.types.has(typeName) && !this.types.has(`${typeName}Interface`)) {
        missing.push(typeName)
      }
    })

    return missing
  }

  private generateRecommendations(result: ValidationResult): string[] {
    const recommendations: string[] = []

    if (result.duplicates.length > 0) {
      recommendations.push(
        'Consolidate duplicate interfaces by creating a shared types file for common interfaces'
      )
    }

    if (result.inconsistencies.length > 0) {
      recommendations.push(
        'Standardize API response patterns by using a common base interface'
      )
    }

    if (result.namingIssues.length > 0) {
      recommendations.push(
        'Update type names to follow consistent PascalCase convention'
      )
    }

    if (result.missingTypes.length > 0) {
      recommendations.push(
        'Create missing common type definitions to improve type safety'
      )
    }

    // Specific recommendations based on analysis
    if (this.types.has('SelectOption')) {
      const selectOptions = this.types.get('SelectOption')!
      if (selectOptions.length > 1) {
        recommendations.push(
          'Consolidate SelectOption interfaces into a single shared definition in lib/types/ui.types.ts'
        )
      }
    }

    recommendations.push(
      'Consider creating a central index.ts file for all type exports'
    )

    return recommendations
  }

  private isPascalCase(str: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str)
  }

  private toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Generate detailed report
  generateReport(result: ValidationResult): string {
    let report = `
# Type System Validation Report
Generated: ${new Date().toISOString()}

## Summary
- Total type definitions: ${Array.from(this.types.values()).flat().length}
- Unique type names: ${this.types.size}
- Duplicate types: ${result.duplicates.length}
- Naming issues: ${result.namingIssues.length}
- Inconsistencies: ${result.inconsistencies.length}
- Missing common types: ${result.missingTypes.length}

`

    if (result.duplicates.length > 0) {
      report += `## Duplicate Type Definitions\n\n`
      result.duplicates.forEach(dup => {
        report += `### ${dup.name}\n`
        dup.definitions.forEach(def => {
          report += `- **${def.file}:${def.line}** (${def.type}${def.exported ? ', exported' : ''})\n`
          report += `  \`${def.content}\`\n`
        })
        report += '\n'
      })
    }

    if (result.namingIssues.length > 0) {
      report += `## Naming Convention Issues\n\n`
      result.namingIssues.forEach(issue => {
        report += `- **${issue.file}**: ${issue.issue}\n`
        report += `  Suggestion: ${issue.suggestion}\n\n`
      })
    }

    if (result.inconsistencies.length > 0) {
      report += `## Type System Inconsistencies\n\n`
      result.inconsistencies.forEach(issue => {
        report += `### ${issue.issue}\n`
        report += `${issue.details}\n\n`
        report += `Files affected:\n`
        issue.files.forEach(file => {
          report += `- ${file}\n`
        })
        report += '\n'
      })
    }

    if (result.missingTypes.length > 0) {
      report += `## Missing Common Types\n\n`
      result.missingTypes.forEach(type => {
        report += `- ${type}\n`
      })
      report += '\n'
    }

    if (result.recommendations.length > 0) {
      report += `## Recommendations\n\n`
      result.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`
      })
      report += '\n'
    }

    // Type distribution by file
    report += `## Type Distribution\n\n`
    const fileStats = new Map<string, number>()
    this.types.forEach(definitions => {
      definitions.forEach(def => {
        const count = fileStats.get(def.file) || 0
        fileStats.set(def.file, count + 1)
      })
    })

    const sortedFiles = Array.from(fileStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    report += `Top 10 files by type definition count:\n\n`
    sortedFiles.forEach(([file, count]) => {
      report += `- **${file}**: ${count} types\n`
    })

    return report
  }
}

async function main() {
  try {
    const projectRoot = process.cwd()
    const validator = new TypeSystemValidator(projectRoot)
    
    const result = await validator.validate()
    const report = validator.generateReport(result)
    
    // Write report to file
    const reportPath = path.join(projectRoot, 'TYPE_SYSTEM_VALIDATION_REPORT.md')
    fs.writeFileSync(reportPath, report)
    
    console.log('\n' + '='.repeat(60))
    console.log('TYPE SYSTEM VALIDATION COMPLETE')
    console.log('='.repeat(60))
    
    console.log(`📊 Total types analyzed: ${Array.from(validator['types'].values()).flat().length}`)
    console.log(`🔄 Duplicates found: ${result.duplicates.length}`)
    console.log(`📝 Naming issues: ${result.namingIssues.length}`)
    console.log(`⚠️  Inconsistencies: ${result.inconsistencies.length}`)
    console.log(`❌ Missing types: ${result.missingTypes.length}`)
    
    if (result.duplicates.length > 0) {
      console.log('\n🔄 DUPLICATE TYPES:')
      result.duplicates.slice(0, 5).forEach(dup => {
        console.log(`  - ${dup.name} (${dup.definitions.length} definitions)`)
      })
      if (result.duplicates.length > 5) {
        console.log(`  ... and ${result.duplicates.length - 5} more`)
      }
    }
    
    if (result.inconsistencies.length > 0) {
      console.log('\n⚠️  INCONSISTENCIES:')
      result.inconsistencies.forEach(issue => {
        console.log(`  - ${issue.issue}`)
      })
    }
    
    console.log('\n💡 RECOMMENDATIONS:')
    result.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`)
    })
    
    console.log(`\n📄 Full report saved to: ${reportPath}`)
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { TypeSystemValidator }