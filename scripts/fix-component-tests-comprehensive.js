#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const testsDir = path.join(process.cwd(), 'tests', 'components');

// Find all .test.tsx files
function findTestFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (item.endsWith('.test.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// More comprehensive fix function
function fixComponentTest(content) {
  let fixed = content;
  
  // 1. Fix imports - replace commented out testing-library imports with custom render
  fixed = fixed.replace(
    /\/\/\s*import\s*{\s*render[^}]*}\s*from\s*['"]@testing-library\/react['"]/g,
    "import { render, screen, fireEvent, waitFor, act } from '@/tests/helpers/component-test-utils'"
  );
  
  // Add custom render if not present and render is used
  if (fixed.includes('render(') && !fixed.includes("from '@/tests/helpers/component-test-utils'")) {
    // Find the last import
    const importMatches = [...fixed.matchAll(/^import[^;]+;/gm)];
    if (importMatches.length > 0) {
      const lastImport = importMatches[importMatches.length - 1];
      const insertPos = lastImport.index + lastImport[0].length;
      fixed = fixed.slice(0, insertPos) + 
        "\nimport { render, screen, fireEvent, waitFor, act } from '@/tests/helpers/component-test-utils';" +
        fixed.slice(insertPos);
    }
  }
  
  // 2. Fix excessive closing braces/parens at the end
  // Remove patterns like })})})})}) at the end
  fixed = fixed.replace(/(\s*[})]\s*){5,}$/g, '');
  
  // Count braces and parens to fix structure
  let braceBalance = 0;
  let parenBalance = 0;
  let inString = false;
  let inComment = false;
  let stringChar = '';
  
  for (let i = 0; i < fixed.length; i++) {
    const char = fixed[i];
    const nextChar = fixed[i + 1];
    
    // Handle comments
    if (!inString && char === '/' && nextChar === '/') {
      inComment = true;
      i++; // Skip next char
      continue;
    }
    if (inComment && char === '\n') {
      inComment = false;
      continue;
    }
    if (inComment) continue;
    
    // Handle strings
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
      continue;
    }
    if (inString && char === stringChar && fixed[i - 1] !== '\\') {
      inString = false;
      continue;
    }
    if (inString) continue;
    
    // Count braces and parens
    if (char === '{') braceBalance++;
    if (char === '}') braceBalance--;
    if (char === '(') parenBalance++;
    if (char === ')') parenBalance--;
  }
  
  // Add missing closing braces/parens
  if (braceBalance > 0) {
    fixed = fixed.trimRight() + '\n' + '}'.repeat(braceBalance);
  }
  if (parenBalance > 0) {
    fixed = fixed.trimRight() + ')'.repeat(parenBalance);
  }
  
  // 3. Fix async/await issues
  // Add await to waitFor calls
  fixed = fixed.replace(/(\s+)(?<!await\s)waitFor\(/g, '$1await waitFor(');
  
  // Fix test functions that use await but aren't async
  fixed = fixed.replace(
    /\b(it|test)\s*\(\s*(['"`])([^'"`]+)\2\s*,\s*\(\s*\)\s*=>\s*{([^}]*\bawait\b[^}]*)\}/gm,
    '$1($2$3$2, async () => {$4}'
  );
  
  // 4. Fix act() wrapper issues
  // Remove double act wrappers
  fixed = fixed.replace(/act\s*\(\s*async\s*\(\s*\)\s*=>\s*{\s*await\s+act\s*\(/g, 'act(async () => { ');
  
  // Fix fireEvent calls without act
  fixed = fixed.replace(
    /(?<!act\([^)]*)(fireEvent\.[a-zA-Z]+\([^)]+\));/g,
    'await act(async () => { $1; });'
  );
  
  // Clean up double awaits
  fixed = fixed.replace(/await\s+await/g, 'await');
  
  // 5. Fix apiClient usage
  fixed = fixed.replace(/\bapi\.(get|post|put|delete|patch)\(/g, 'apiClient(');
  fixed = fixed.replace(/import\s*{\s*api\s*}\s*from\s*['"]@\/lib\/api\/client['"]/g, 
    "import { apiClient } from '@/lib/api/client'");
  
  // 6. Fix mock patterns
  fixed = fixed.replace(/apiClient\.(get|post|put|delete|patch)\.mockResolvedValue\(\s*{\s*data:/g, 
    'apiClient.$1.mockResolvedValue({');
    
  // 7. Fix broken test structure
  // Fix incomplete describe blocks
  const describeMatches = [...fixed.matchAll(/describe\s*\([^)]+\)\s*{\s*$/gm)];
  for (const match of describeMatches) {
    const startIdx = match.index + match[0].length;
    let endIdx = startIdx;
    let depth = 1;
    
    while (endIdx < fixed.length && depth > 0) {
      if (fixed[endIdx] === '{') depth++;
      if (fixed[endIdx] === '}') depth--;
      endIdx++;
    }
    
    if (depth > 0) {
      // Unclosed describe block
      fixed = fixed.slice(0, endIdx) + '\n})' + fixed.slice(endIdx);
    }
  }
  
  return fixed;
}

// Process file
async function processFile(filePath) {
  console.log(`Processing ${path.relative(process.cwd(), filePath)}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = fixComponentTest(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed ${path.relative(process.cwd(), filePath)}`);
      return true;
    } else {
      console.log(`  No changes needed for ${path.relative(process.cwd(), filePath)}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('Fixing component tests comprehensively...\n');
  
  const testFiles = findTestFiles(testsDir);
  console.log(`Found ${testFiles.length} test files\n`);
  
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const file of testFiles) {
    try {
      if (await processFile(file)) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n✓ Fixed ${fixedCount} files`);
  if (errorCount > 0) {
    console.log(`✗ ${errorCount} files had errors`);
  }
}

main().catch(console.error);