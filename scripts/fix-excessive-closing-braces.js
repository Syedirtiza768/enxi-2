#\!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing excessive closing braces in component tests...\n');

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

function fixExcessiveClosingBraces(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let modified = false;
    
    // Remove patterns with excessive closing braces
    // Pattern 1: Multiple })}) at the end of files
    content = content.replace(/(\}\))+\s*$/g, (match) => {
      // Count how many complete })s we have
      const count = (match.match(/\}\)/g) || []).length;
      if (count > 3) {
        // Keep at most 2-3 closing patterns (for describe/it/test structure)
        return '})\n});\n';
      }
      return match;
    });
    
    // Pattern 2: Fix multiple })}) in the middle of the file
    content = content.replace(/(\}\)){4,}/g, '})');
    
    // Pattern 3: Fix specific patterns in test files
    content = content.replace(/\}\)\}\)\}\)\}\)\}\)\}\)\}\)\}\)\}\)\}\)/g, '})');
    content = content.replace(/\}\)\}\)\}\)\}\)\}\)\}\)\}\)\}\)/g, '})');
    content = content.replace(/\}\)\}\)\}\)\}\)\}\)\}\)/g, '})');
    content = content.replace(/\}\)\}\)\}\)\}\)/g, '})');
    
    // Pattern 4: Fix the ending structure for test files
    if (content.includes('describe(')) {
      // Ensure proper ending for describe blocks
      content = content.replace(/\}\)\s*\}\)\s*\}\)\s*$/g, '})\n});\n');
      
      // Make sure we have proper describe block closure
      const lines = content.split('\n');
      const lastNonEmptyLineIndex = lines.map((line, i) => line.trim() ? i : -1).filter(i => i >= 0).pop();
      
      if (lastNonEmptyLineIndex \!== undefined) {
        const lastLine = lines[lastNonEmptyLineIndex];
        if (lastLine.includes('})})})')) {
          lines[lastNonEmptyLineIndex] = '  })';
          lines.push('});');
          content = lines.join('\n');
        }
      }
    }
    
    if (content \!== originalContent) {
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
  if (fixExcessiveClosingBraces(file)) {
    fixedCount++;
  }
}

console.log(`\n✨ Fixed ${fixedCount} component test files`);
EOF < /dev/null