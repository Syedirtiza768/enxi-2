#\!/usr/bin/env node

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

// Fix component test issues
function fixComponentTest(content) {
  let fixed = content;
  
  // Remove "No newline at end of file" markers
  fixed = fixed.replace(/\s*No newline at end of file\s*/g, '');
  
  // Fix double/triple act wrappers
  // Pattern: await act(async () => { async () => { await act(async () => { ... }); }) })
  fixed = fixed.replace(/await\s+act\s*\(\s*async\s*\(\s*\)\s*=>\s*{\s*async\s*\(\s*\)\s*=>\s*{\s*await\s+act\s*\(\s*async\s*\(\s*\)\s*=>\s*{([^}]+)}\s*\);\s*}\s*}\s*\)/g, 
    'await act(async () => {$1})');
  
  // Pattern: async () => { await act(async () => { ... }); }
  fixed = fixed.replace(/async\s*\(\s*\)\s*=>\s*{\s*await\s+act\s*\(\s*async\s*\(\s*\)\s*=>\s*{([^}]+)}\s*\);\s*}/g,
    'await act(async () => {$1})');
  
  // Pattern: await act(async () => { await act(async () => { ... }); })
  fixed = fixed.replace(/await\s+act\s*\(\s*async\s*\(\s*\)\s*=>\s*{\s*await\s+act\s*\(\s*async\s*\(\s*\)\s*=>\s*{([^}]+)}\s*\);\s*}\s*\)/g, 
    'await act(async () => {$1})');
  
  // Remove excessive closing braces/parens at end
  fixed = fixed.replace(/(\s*[})]\s*){10,}$/g, '');
  
  // Fix incomplete expect statements at end
  const lines = fixed.split('\n');
  const lastNonEmptyLineIndex = lines.findLastIndex(line => line.trim() \!== '');
  if (lastNonEmptyLineIndex >= 0) {
    const lastLine = lines[lastNonEmptyLineIndex];
    
    // Check if last line has incomplete expect
    if (lastLine.includes('expect(') && \!lastLine.includes('))')) {
      lines[lastNonEmptyLineIndex] = lastLine + ')';
    }
  }
  fixed = lines.join('\n');
  
  // Balance braces and parentheses
  let braceCount = 0;
  let parenCount = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < fixed.length; i++) {
    const char = fixed[i];
    const prevChar = i > 0 ? fixed[i - 1] : '';
    
    // Handle strings
    if (\!inString && (char === '"' || char === "'" || char === '`')) {
      if (prevChar \!== '\\') {
        inString = true;
        stringChar = char;
      }
    } else if (inString && char === stringChar && prevChar \!== '\\') {
      inString = false;
    }
    
    // Count braces and parens outside strings
    if (\!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
    }
  }
  
  // Add missing closings
  fixed = fixed.trimRight();
  if (braceCount > 0) {
    fixed += '\n' + '}'.repeat(braceCount);
  }
  if (parenCount > 0) {
    fixed += ')'.repeat(parenCount);
  }
  
  // Ensure newline at end
  if (\!fixed.endsWith('\n')) {
    fixed += '\n';
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
    
    if (content \!== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed ${path.relative(process.cwd(), filePath)}`);
      return true;
    } else {
      console.log(`  No changes needed`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return false;
  }
}

// Main
async function main() {
  console.log('Fixing component tests...\n');
  
  const testFiles = findTestFiles(testsDir);
  console.log(`Found ${testFiles.length} test files\n`);
  
  let fixedCount = 0;
  
  for (const file of testFiles) {
    if (await processFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✓ Fixed ${fixedCount} files`);
}

main().catch(console.error);
EOF < /dev/null