#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Validating and fixing brace balance in component tests...\n');

const testFiles = glob.sync('**/tests/components/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

testFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Count braces and parentheses
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;

    console.log(`Checking ${path.basename(file)}: {${openBraces}/${closeBraces}} (${openParens}/${closeParens})`);

    // If imbalanced, try to fix
    if (openBraces !== closeBraces || openParens !== closeParens) {
      console.log(`  ⚠️  Imbalanced - attempting fix...`);
      
      // Parse the file structure
      const lines = content.split('\n');
      let describeCount = 0;
      let itCount = 0;
      let depth = 0;
      let inDescribe = false;
      let inIt = false;
      
      // Count describe and it blocks
      lines.forEach(line => {
        if (line.match(/^\s*describe\s*\(/)) {
          describeCount++;
          inDescribe = true;
        }
        if (line.match(/^\s*(it|test)\s*\(/)) {
          itCount++;
          inIt = true;
        }
      });
      
      // Check the last few lines
      const lastNonEmptyLineIndex = lines.length - 1 - [...lines].reverse().findIndex(l => l.trim() !== '');
      const lastLine = lines[lastNonEmptyLineIndex];
      
      // If the file ends with }) but needs more closings
      if (lastLine.trim() === '})' && openBraces > closeBraces) {
        const missingBraces = openBraces - closeBraces;
        const missingParens = openParens - closeParens;
        
        // Add missing closings
        let additions = [];
        for (let i = 0; i < missingBraces; i++) {
          additions.push('})');
        }
        
        // Insert before empty lines at the end
        const insertIndex = lastNonEmptyLineIndex + 1;
        lines.splice(insertIndex, 0, ...additions);
        
        content = lines.join('\n');
        modified = true;
      } else if (openParens > closeParens) {
        // Missing closing parentheses - likely in the last test
        const missingParens = openParens - closeParens;
        
        // Find the last }) and add ) before it
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim() === '})') {
            lines[i] = ')'.repeat(missingParens) + '\n' + lines[i];
            content = lines.join('\n');
            modified = true;
            break;
          }
        }
      }
    }

    if (modified) {
      // Recount to verify fix
      const newOpenBraces = (content.match(/\{/g) || []).length;
      const newCloseBraces = (content.match(/\}/g) || []).length;
      const newOpenParens = (content.match(/\(/g) || []).length;
      const newCloseParens = (content.match(/\)/g) || []).length;
      
      console.log(`  ✅ Fixed: {${newOpenBraces}/${newCloseBraces}} (${newOpenParens}/${newCloseParens})`);
      
      fs.writeFileSync(file, content);
      filesFixed++;
    } else if (openBraces === closeBraces && openParens === closeParens) {
      console.log(`  ✅ Balanced`);
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