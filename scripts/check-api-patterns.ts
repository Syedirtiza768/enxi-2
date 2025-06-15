#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

interface FileMatch {
  file: string;
  line: number;
  content: string;
}

/**
 * Script to detect usage of old API patterns and prevent them from being committed
 * Run this as part of pre-commit hooks or CI/CD pipeline
 */

const OLD_API_PATTERNS = [
  'api\\.get\\(',
  'api\\.post\\(',
  'api\\.put\\(',
  'api\\.delete\\(',
  'api\\.patch\\(',
];

const EXCLUDE_PATHS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'lib/api/client.ts', // This file contains the backwards compatibility layer
  'tests/integration/api-client.test.ts', // Test file for backwards compatibility
];

function findOldApiPatterns(): FileMatch[] {
  const matches: FileMatch[] = [];
  
  // Build grep pattern
  const pattern = OLD_API_PATTERNS.join('|');
  
  // Build exclude arguments
  const excludeArgs = EXCLUDE_PATHS.map(path => `--exclude-dir="${path}"`).join(' ');
  
  try {
    // Use grep to find all occurrences
    const command = `grep -rn -E "${pattern}" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" ${excludeArgs} || true`;
    const output = execSync(command, { encoding: 'utf-8' });
    
    if (!output.trim()) {
      return matches;
    }
    
    // Parse grep output
    const lines = output.trim().split('\n');
    for (const line of lines) {
      const match = line.match(/^(.+?):(\d+):(.+)$/);
      if (match) {
        matches.push({
          file: match[1],
          line: parseInt(match[2], 10),
          content: match[3].trim(),
        });
      }
    }
  } catch (error) {
    console.error('Error running grep:', error);
  }
  
  return matches;
}

function main() {
  console.log('🔍 Checking for old API patterns...\n');
  
  const matches = findOldApiPatterns();
  
  if (matches.length === 0) {
    console.log('✅ No old API patterns found! The codebase is clean.\n');
    process.exit(0);
  }
  
  console.log(`❌ Found ${matches.length} instances of old API patterns:\n`);
  
  // Group by file
  const fileGroups = matches.reduce((acc, match) => {
    if (!acc[match.file]) {
      acc[match.file] = [];
    }
    acc[match.file].push(match);
    return acc;
  }, {} as Record<string, FileMatch[]>);
  
  // Display results
  for (const [file, fileMatches] of Object.entries(fileGroups)) {
    console.log(`📄 ${file}`);
    for (const match of fileMatches) {
      console.log(`   Line ${match.line}: ${match.content}`);
    }
    console.log('');
  }
  
  console.log('💡 How to fix:');
  console.log('   Replace api.get() with apiClient()');
  console.log('   Replace api.post() with apiClient(..., { method: "POST", body: ... })');
  console.log('   Replace api.put() with apiClient(..., { method: "PUT", body: ... })');
  console.log('   Replace api.delete() with apiClient(..., { method: "DELETE" })');
  console.log('\n📚 Example migration:');
  console.log('   // Old pattern');
  console.log('   const response = await api.get<Type>("/api/endpoint")');
  console.log('   if (response.ok) { ... }');
  console.log('');
  console.log('   // New pattern');
  console.log('   const data = await apiClient<Type>("/api/endpoint")');
  console.log('   if (data) { ... }');
  console.log('');
  
  process.exit(1);
}

if (require.main === module) {
  main();
}