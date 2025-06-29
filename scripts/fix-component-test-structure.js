#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing component test structure issues...\n');

// Find all component test files
function findTestFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (item.endsWith('.test.tsx') || item.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function countBraces(content) {
  let openCount = 0;
  let closeCount = 0;
  let inString = false;
  let stringChar = null;
  let escaped = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    
    // Handle escape sequences
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && !inString) {
      inString = true;
      stringChar = char;
      continue;
    }
    
    if (char === stringChar && inString) {
      inString = false;
      stringChar = null;
      continue;
    }
    
    // Count braces only outside of strings
    if (!inString) {
      if (char === '{') openCount++;
      if (char === '}') closeCount++;
    }
  }
  
  return { openCount, closeCount };
}

function fixTestStructure(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let modified = false;
    
    // Fix common patterns first
    
    // Fix missing closing braces for it() blocks
    content = content.replace(/(\s+it\([^)]+\)\s*(?:async\s*)?\s*\([^)]*\)\s*=>\s*\{[\s\S]*?)(\n\s*it\(|\n\s*describe\(|\n$)/g, (match, block, next) => {
      const { openCount, closeCount } = countBraces(block);
      const diff = openCount - closeCount;
      
      if (diff > 0) {
        // Add missing closing braces
        const closingBraces = '})'.repeat(diff);
        return block + '\n' + closingBraces + next;
      }
      return match;
    });
    
    // Fix missing closing braces at the end of file
    const { openCount, closeCount } = countBraces(content);
    const diff = openCount - closeCount;
    
    if (diff > 0) {
      // Add missing closing braces at the end
      content = content.trimRight() + '\n' + '})'.repeat(diff) + '\n';
      modified = true;
    }
    
    // Fix specific patterns in auth tests
    if (filePath.includes('login-form.test.tsx')) {
      // Fix the specific pattern we saw
      content = content.replace(/await waitFor\(\(\) => \{\s*expect\([^)]+\)\.toHaveBeenCalledWith\([^)]+\)\s*\}\)/g, (match) => {
        const lines = match.split('\n');
        const lastLine = lines[lines.length - 1];
        if (!lastLine.includes('})')) {
          lines[lines.length - 1] = lastLine + ')';
        }
        return lines.join('\n');
      });
      
      // Ensure test has proper structure
      if (!content.includes('});\n')) {
        content = content.trimRight() + '\n});\n';
      }
    }
    
    // Fix missing closing for describe blocks
    content = content.replace(/describe\([^)]+,\s*\(\)\s*=>\s*\{[\s\S]+/g, (match) => {
      const { openCount: describeOpen, closeCount: describeClose } = countBraces(match);
      if (describeOpen > describeClose) {
        const diff = describeOpen - describeClose;
        return match.trimRight() + '\n' + '})'.repeat(diff) + '\n';
      }
      return match;
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
const testsDir = path.join(process.cwd(), 'tests', 'components');
const testFiles = findTestFiles(testsDir);

console.log(`Found ${testFiles.length} component test files\n`);

let fixedCount = 0;
for (const file of testFiles) {
  if (fixTestStructure(file)) {
    fixedCount++;
  }
}

console.log(`\n✨ Fixed ${fixedCount} component test files`);