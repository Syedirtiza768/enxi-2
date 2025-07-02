#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

interface ApiCallInstance {
  file: string
  line: number
  code: string
  hasTypeParam: boolean
}

function findApiCalls(dir: string, instances: ApiCallInstance[] = []): ApiCallInstance[] {
  const files = readdirSync(dir)
  
  for (const file of files) {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)
    
    if (stat.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'build') {
        findApiCalls(fullPath, instances)
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n')
      
      lines.forEach((line, index) => {
        // Look for apiClient calls
        if (line.includes('await apiClient(') || line.includes('await apiClient<')) {
          const hasTypeParam = line.includes('await apiClient<')
          
          // Also check if there's a response.data usage nearby
          let hasResponseData = false
          for (let i = index; i < Math.min(index + 10, lines.length); i++) {
            if (lines[i].includes('response.data')) {
              hasResponseData = true
              break
            }
          }
          
          if (!hasTypeParam && hasResponseData) {
            instances.push({
              file: fullPath,
              line: index + 1,
              code: line.trim(),
              hasTypeParam
            })
          }
        }
      })
    }
  }
  
  return instances
}

// Start from the app and components directories
const appInstances = findApiCalls(join(process.cwd(), 'app'))
const componentInstances = findApiCalls(join(process.cwd(), 'components'))

const allInstances = [...appInstances, ...componentInstances]

console.log(`Found ${allInstances.length} untyped apiClient calls with response.data usage:\n`)

allInstances.forEach(instance => {
  console.log(`${instance.file}:${instance.line}`)
  console.log(`  ${instance.code}`)
  console.log()
})

// Group by file for easier fixing
const byFile = allInstances.reduce((acc, instance) => {
  if (!acc[instance.file]) {
    acc[instance.file] = []
  }
  acc[instance.file].push(instance)
  return acc
}, {} as Record<string, ApiCallInstance[]>)

console.log('\nFiles to fix:')
Object.keys(byFile).forEach(file => {
  console.log(`- ${file} (${byFile[file].length} instances)`)
})