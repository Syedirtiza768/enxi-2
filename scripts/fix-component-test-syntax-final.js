#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Final comprehensive fix for component test syntax issues...\n');

const testFiles = glob.sync('**/tests/components/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

testFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Fix 1: Missing closing parenthesis for user.click
    content = content.replace(
      /await user\.click\(screen\.getByRole\('button',\s*\{\s*name:\s*\/[^/]+\/i\s*\}\)\s*$/gm,
      (match) => match + ')'
    );

    // Fix 2: Missing closing parenthesis for fireEvent.click patterns
    content = content.replace(
      /fireEvent\.click\(([^)]+)\);\s*$/gm,
      (match, args) => {
        const openParens = (args.match(/\(/g) || []).length;
        const closeParens = (args.match(/\)/g) || []).length;
        if (openParens > closeParens) {
          return `fireEvent.click(${args})${')'.repeat(openParens - closeParens)});`;
        }
        return match;
      }
    );

    // Fix 3: Fix misplaced }) in expect.objectContaining
    content = content.replace(
      /expect\(mockApiClient\)\.toHaveBeenCalledWith\(([^,]+),\s*\{\s*method:\s*'([^']+)',\s*body:\s*expect\.stringContaining\(([^)]+)\)\s*\}\)\s*\}\)/gm,
      "expect(mockApiClient).toHaveBeenCalledWith($1, {\n      method: '$2',\n      body: expect.stringContaining($3)\n    })"
    );

    // Fix 4: Fix double closing patterns
    content = content.replace(/\}\)\s*\}\)\s*$/gm, '  })\n})');

    // Fix 5: Fix missing closing for it blocks
    const lines = content.split('\n');
    let fixedLines = [];
    let itBlockStack = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Track it blocks
      if (trimmedLine.match(/^\s*(it|test)\s*\(/)) {
        itBlockStack.push({
          line: i,
          indent: line.match(/^\s*/)[0]
        });
      }
      
      // Check for incomplete it blocks
      if (trimmedLine === '})' && itBlockStack.length > 0) {
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
        const prevLine = i > 0 ? lines[i - 1].trim() : '';
        
        // If next line starts a new test/describe and we haven't closed the it block properly
        if (nextLine.match(/^\s*(it|test|describe)\s*\(/) || nextLine.match(/^\s*\/\/ Verify/)) {
          const currentItBlock = itBlockStack[itBlockStack.length - 1];
          
          // Check if we need to add a closing
          const blockContent = lines.slice(currentItBlock.line, i + 1).join('\n');
          const openBraces = (blockContent.match(/\{/g) || []).length;
          const closeBraces = (blockContent.match(/\}/g) || []).length;
          
          if (openBraces > closeBraces) {
            fixedLines.push(line);
            fixedLines.push(currentItBlock.indent + '})');
            modified = true;
            itBlockStack.pop();
            continue;
          }
        }
      }
      
      fixedLines.push(line);
    }
    
    if (fixedLines.length > 0 && fixedLines.join('\n') !== content) {
      content = fixedLines.join('\n');
      modified = true;
    }

    // Fix 6: Ensure file ends properly
    if (!content.endsWith('\n')) {
      content += '\n';
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