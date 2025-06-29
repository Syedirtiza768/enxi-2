#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing component test closing braces...\n');

const testFiles = glob.sync('**/tests/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

testFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Count opening and closing braces
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;

    if (openBraces > closeBraces || openParens > closeParens) {
      // Add missing closing braces/parens at the end
      const missingBraces = openBraces - closeBraces;
      const missingParens = openParens - closeParens;
      
      // Look for common patterns at the end
      const lines = content.split('\n');
      let lastNonEmptyIndex = lines.length - 1;
      
      while (lastNonEmptyIndex >= 0 && lines[lastNonEmptyIndex].trim() === '') {
        lastNonEmptyIndex--;
      }
      
      // Check if we're missing closing for common patterns
      let additions = [];
      
      // Check for unclosed it() blocks
      if (lines[lastNonEmptyIndex].trim() === '})' && missingParens > 0) {
        additions.push('  })');
      }
      
      // Check for unclosed describe() blocks
      if (missingBraces > 0) {
        for (let i = 0; i < missingBraces; i++) {
          additions.push('})');
        }
      }
      
      if (additions.length > 0) {
        // Insert before the last line if it's empty, otherwise append
        if (lines[lines.length - 1].trim() === '') {
          lines.splice(lines.length - 1, 0, ...additions);
        } else {
          lines.push(...additions);
        }
        
        content = lines.join('\n');
        
        // Ensure file ends with newline
        if (!content.endsWith('\n')) {
          content += '\n';
        }
        
        modified = true;
      }
    }

    // Fix specific patterns
    // Fix incomplete it() blocks
    content = content.replace(
      /await waitFor\(\(\) => \{\s*expect\([^)]+\)\.toHaveBeenCalledWith\([^)]+\)\s*\}\)\s*$/gm,
      (match) => match + '\n  })'
    );

    // Fix missing closing for describe blocks
    const describeMatches = content.match(/describe\(/g) || [];
    const describeCloseMatches = content.match(/\}\)\s*$/gm) || [];
    
    if (describeMatches.length > describeCloseMatches.length) {
      content += '\n})';
      modified = true;
    }

    if (content !== originalContent) {
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