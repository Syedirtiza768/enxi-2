#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'

interface PropMismatch {
  file: string
  line: number
  component: string
  issue: string
  suggestion: string
}

const mismatches: PropMismatch[] = []

// Check for Select components using wrong props
function checkSelectComponents(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  
  let importsShadcnSelect = false
  let importsDesignSystemSelect = false
  
  // Check imports
  lines.forEach((line, index) => {
    if (line.includes("from '@/components/ui/select'")) {
      importsShadcnSelect = true
    }
    if (line.includes("from '@/components/design-system'") && line.includes('Select')) {
      importsDesignSystemSelect = true
    }
  })
  
  // Check for Select usage with wrong props
  lines.forEach((line, index) => {
    // Check for shadcn Select with onChange
    if (importsShadcnSelect && line.includes('<Select') && line.includes('onChange=')) {
      // Look for the full Select component block
      let componentBlock = line
      let currentIndex = index
      let openBrackets = 1
      
      // Get the full component if it spans multiple lines
      while (openBrackets > 0 && currentIndex < lines.length - 1) {
        currentIndex++
        const nextLine = lines[currentIndex]
        componentBlock += '\n' + nextLine
        
        openBrackets += (nextLine.match(/</g) || []).length
        openBrackets -= (nextLine.match(/>/g) || []).length
      }
      
      if (componentBlock.includes('onChange=') && !componentBlock.includes('onValueChange=')) {
        mismatches.push({
          file: filePath,
          line: index + 1,
          component: 'Select (shadcn/ui)',
          issue: 'Using onChange instead of onValueChange',
          suggestion: 'Replace onChange with onValueChange'
        })
      }
    }
    
    // Check for design system Select with onValueChange
    if (importsDesignSystemSelect && line.includes('<Select') && line.includes('onValueChange=')) {
      mismatches.push({
        file: filePath,
        line: index + 1,
        component: 'Select (design-system)',
        issue: 'Using onValueChange instead of onChange',
        suggestion: 'Replace onValueChange with onChange'
      })
    }
  })
}

// Check for other component prop mismatches
function checkOtherComponents(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  
  lines.forEach((line, index) => {
    // Check for common prop mismatches
    
    // Check for className on design system components that use custom prop names
    if (line.includes('<VStack') && line.includes('className=')) {
      if (!line.includes('className=') || line.includes('class=')) {
        mismatches.push({
          file: filePath,
          line: index + 1,
          component: 'VStack',
          issue: 'Might be using wrong className prop',
          suggestion: 'VStack components typically use className prop'
        })
      }
    }
  })
}

// Main function
async function main(): Promise<void> {
  console.log('Checking for component prop type mismatches...\n')
  
  // Find all TypeScript files
  const files = glob.sync('**/*.tsx', {
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'scripts/**']
  })
  
  console.log(`Found ${files.length} TypeScript files to check.\n`)
  
  // Check each file
  files.forEach(file => {
    try {
      checkSelectComponents(file)
      checkOtherComponents(file)
    } catch (error) {
      console.error(`Error processing ${file}:`, error)
    }
  })
  
  // Report results
  if (mismatches.length === 0) {
    console.log('✅ No component prop mismatches found!')
  } else {
    console.log(`❌ Found ${mismatches.length} potential prop mismatches:\n`)
    
    mismatches.forEach((mismatch, index) => {
      console.log(`${index + 1}. ${mismatch.file}:${mismatch.line}`)
      console.log(`   Component: ${mismatch.component}`)
      console.log(`   Issue: ${mismatch.issue}`)
      console.log(`   Suggestion: ${mismatch.suggestion}`)
      console.log()
    })
  }
}

main().catch(console.error)