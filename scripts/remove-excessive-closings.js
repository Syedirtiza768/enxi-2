#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Removing excessive closing braces from component tests...\n');

const testFiles = glob.sync('**/tests/components/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

testFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    const lines = content.split('\n');
    
    // Find consecutive }) lines at the end
    let lastContentIndex = -1;
    let consecutiveClosings = 0;
    
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      
      if (trimmed === '})') {
        consecutiveClosings++;
      } else if (trimmed !== '') {
        lastContentIndex = i;
        break;
      }
    }
    
    // If we have more than 3 consecutive }) at the end, it's likely excessive
    if (consecutiveClosings > 3) {
      console.log(`  Found ${consecutiveClosings} consecutive }) in ${path.basename(file)}`);
      
      // Keep only the lines up to the last content + 2 closing braces
      const newLines = lines.slice(0, lastContentIndex + 1);
      newLines.push('})'); // Close the last test/it block
      newLines.push('})'); // Close the describe block
      newLines.push(''); // Empty line at end
      
      content = newLines.join('\n');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(file, content);
      filesFixed++;
      console.log(`  ✅ Fixed: ${file}`);
    }

  } catch (error) {
    errors.push({ file, error: error.message });
  }
});

console.log(`\n✨ Fixed ${filesFixed} component test files`);

if (errors.length > 0) {
  console.error('\n❌ Errors encountered:');
  errors.forEach(({ file, error }) => {
    console.error(`   ${file}: ${error}`);
  });
}