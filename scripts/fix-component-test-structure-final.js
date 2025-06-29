#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Final fix for component test structure...\n');

const testFiles = glob.sync('**/tests/components/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

testFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Fix common patterns that are breaking the tests
    
    // 1. Fix missing closing braces for forEach loops
    content = content.replace(
      /\.forEach\(([^)]+)\s*=>\s*\{([^}]+expect[^}]+)\}\)\s*\}\)\s*$/gm,
      '.forEach($1 => {$2})'
    );

    // 2. Fix double }) at end of lines that should have more context
    content = content.replace(
      /\}\)\s*\}\)\s*$/gm,
      (match, offset) => {
        // Check if this is really the end of a test block
        const before = content.substring(Math.max(0, offset - 100), offset);
        if (before.includes('await waitFor') || before.includes('expect(')) {
          return '    })\n  })'
        }
        return match;
      }
    );

    // 3. Fix missing closing for common test patterns
    const lines = content.split('\n');
    let fixedLines = [];
    let inTest = false;
    let testIndent = '';
    let braceStack = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.match(/^\s*/)[0];
      
      // Track test blocks
      if (trimmed.match(/^(it|test)\s*\(/)) {
        inTest = true;
        testIndent = indent;
        braceStack = [];
      }
      
      // Track braces
      if (inTest) {
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        
        for (let j = 0; j < openBraces; j++) {
          braceStack.push('{');
        }
        for (let j = 0; j < closeBraces; j++) {
          if (braceStack.length > 0) {
            braceStack.pop();
          }
        }
        
        // If we're at a line that looks like the end of a test but braces aren't balanced
        if (trimmed === '})' && indent === testIndent && braceStack.length > 0) {
          // Add missing closings before this line
          while (braceStack.length > 1) { // Keep one for the test's own closing
            fixedLines.push(indent + '  })');
            braceStack.pop();
            modified = true;
          }
        }
        
        // End of test
        if (trimmed === '})' && indent === testIndent && braceStack.length <= 1) {
          inTest = false;
        }
      }
      
      fixedLines.push(line);
    }
    
    if (modified) {
      content = fixedLines.join('\n');
    }

    // 4. Ensure proper structure at file end
    const trimmedContent = content.trimEnd();
    const lastLines = trimmedContent.split('\n').slice(-5);
    
    // Check if file ends properly
    if (!lastLines.some(line => line.trim() === '})')) {
      // File doesn't end with }), add proper closing
      content = trimmedContent + '\n})\n';
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

console.log(`\n✨ Fixed ${filesFixed} component test files`);

if (errors.length > 0) {
  console.error('\n❌ Errors encountered:');
  errors.forEach(({ file, error }) => {
    console.error(`   ${file}: ${error}`);
  });
}