#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing fetch expect patterns in component tests...\n');

const testFiles = glob.sync('**/tests/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

testFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Fix the specific pattern with misplaced })
    // Pattern: expect(global.fetch).toHaveBeenCalledWith('/api/...', { method: 'POST', }) headers: {...}
    const lines = content.split('\n');
    let fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check for the broken pattern
      if (trimmedLine.includes('expect(global.fetch).toHaveBeenCalledWith(') ||
          (i > 0 && lines[i-1].trim().includes('expect(global.fetch).toHaveBeenCalledWith('))) {
        
        // Look ahead to find the broken pattern
        let foundBrokenPattern = false;
        let j = i;
        
        // Find where the broken }) appears
        while (j < Math.min(i + 10, lines.length)) {
          if (lines[j].trim() === '})' && 
              j + 1 < lines.length && 
              lines[j + 1].trim().startsWith('headers:')) {
            foundBrokenPattern = true;
            break;
          }
          j++;
        }
        
        if (foundBrokenPattern) {
          // We found the pattern, now reconstruct it properly
          const indent = line.match(/^\s*/)[0];
          
          // Copy lines up to the broken })
          for (let k = i; k < j; k++) {
            fixedLines.push(lines[k]);
          }
          
          // Skip the broken }) line
          // Now properly format the rest
          let k = j + 1;
          while (k < lines.length && !lines[k].trim().endsWith('})')) {
            const currentLine = lines[k].trim();
            if (currentLine.startsWith('headers:') || 
                currentLine.startsWith('body:') || 
                currentLine.startsWith('credentials:')) {
              fixedLines.push(`${indent}    ${currentLine}`);
            } else if (currentLine === ')') {
              // Skip standalone closing parens for now
            } else {
              fixedLines.push(lines[k]);
            }
            k++;
          }
          
          // Add proper closing
          fixedLines.push(`${indent}  })`);
          if (k < lines.length && lines[k].trim() === '})') {
            fixedLines.push(lines[k]);
          }
          
          // Skip the lines we've processed
          i = k;
          modified = true;
          continue;
        }
      }
      
      fixedLines.push(line);
    }
    
    if (modified) {
      content = fixedLines.join('\n');
      
      // Additional cleanup
      content = content.replace(
        /expect\(global\.fetch\)\.toHaveBeenCalledWith\(\s*([^,]+),\s*\{\s*method:\s*'([^']+)',\s*\}\)\s*headers:/gm,
        "expect(global.fetch).toHaveBeenCalledWith(\n      $1,\n      {\n        method: '$2',\n        headers:"
      );
      
      fs.writeFileSync(file, content);
      filesFixed++;
      console.log(`✅ Fixed: ${file}`);
    }

  } catch (error) {
    errors.push({ file, error: error.message });
  }
});

console.log(`\n✨ Fixed ${filesFixed} test files`);

if (errors.length > 0) {
  console.error('\n❌ Errors encountered:');
  errors.forEach(({ file, error }) => {
    console.error(`   ${file}: ${error}`);
  });
}