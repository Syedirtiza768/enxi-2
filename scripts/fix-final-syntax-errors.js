#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Final comprehensive syntax fix for all test files...\n');

const testFiles = glob.sync('**/tests/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

testFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Fix 1: Missing closing parentheses in fireEvent/act calls
    // Pattern: await act(async () => { fireEvent.change(input, { target: { value: "text" });
    content = content.replace(
      /await act\(async \(\) => \{ fireEvent\.([a-zA-Z]+)\(([^,]+),\s*\{\s*target:\s*\{\s*value:\s*"([^"]+)"\s*\}\s*\}\);$/gm,
      'await act(async () => { fireEvent.$1($2, { target: { value: "$3" } }) })'
    );

    // Fix 2: Simple fireEvent calls without act
    // Pattern: fireEvent.click(element) })
    content = content.replace(
      /fireEvent\.([a-zA-Z]+)\(([^)]+)\)\s*\}\)$/gm,
      'fireEvent.$1($2))'
    );

    // Fix 3: Missing closing braces in act calls
    // Pattern: await act(async () => { fireEvent.click(btn) })
    content = content.replace(
      /await act\(async \(\) => \{ fireEvent\.([a-zA-Z]+)\(([^)]+)\)\s*\}\)$/gm,
      'await act(async () => { fireEvent.$1($2) })'
    );

    // Fix 4: Handle nested waitFor/expect patterns
    content = content.replace(
      /await waitFor\(\(\) => \{\s*expect\(([^)]+)\)\.toBeInTheDocument\(\)\s*\}\)\s*\}\)/gm,
      'await waitFor(() => {\n        expect($1).toBeInTheDocument()\n      })'
    );

    // Fix 5: Fix malformed closing braces after })
    // Pattern: }) at end of line followed by }) on next line
    const lines = content.split('\n');
    let fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      
      // Skip redundant closing braces
      if (trimmedLine === '})' && nextLine === '})') {
        // Check context to see if we should skip this line
        const prevLine = i > 0 ? lines[i - 1].trim() : '';
        if (prevLine.endsWith('})') || prevLine.endsWith('});')) {
          modified = true;
          continue; // Skip this line
        }
      }
      
      fixedLines.push(line);
    }
    
    if (fixedLines.length !== lines.length) {
      content = fixedLines.join('\n');
    }

    // Fix 6: Missing closing parentheses in specific patterns
    // Pattern: fireEvent.change(input, { target: { value: "text" });
    content = content.replace(
      /fireEvent\.([a-zA-Z]+)\(([^,]+),\s*\{\s*target:\s*\{\s*value:\s*"([^"]+)"\s*\}\s*\}\);$/gm,
      'fireEvent.$1($2, { target: { value: "$3" } })'
    );

    // Fix 7: Missing closing for await act patterns
    content = content.replace(
      /await act\(async \(\) => \{ ([^}]+) \}\);$/gm,
      'await act(async () => { $1 })'
    );

    // Fix 8: Fix specific three-way-matching pattern
    content = content.replace(
      /fireEvent\.change\(([^,]+),\s*\{\s*target:\s*\{\s*value:\s*"([^"]+)"\s*\}\s*\}\);$/gm,
      'fireEvent.change($1, { target: { value: "$2" } })'
    );

    // Fix 9: Handle mismatched braces in nested structures
    let braceCount = 0;
    let parenCount = 0;
    const chars = content.split('');
    
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === '{') braceCount++;
      if (chars[i] === '}') braceCount--;
      if (chars[i] === '(') parenCount++;
      if (chars[i] === ')') parenCount--;
    }
    
    // If we have mismatched braces/parens, try to fix common patterns
    if (braceCount !== 0 || parenCount !== 0) {
      // Fix common pattern: missing }) at end of test blocks
      content = content.replace(
        /(\s*expect\([^)]+\)\.toBeInTheDocument\(\)\s*\n\s*)$/gm,
        '$1  })\n'
      );
      modified = true;
    }

    // Fix 10: Ensure file ends with newline
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

console.log(`\n✨ Fixed ${filesFixed} test files`);

if (errors.length > 0) {
  console.error('\n❌ Errors encountered:');
  errors.forEach(({ file, error }) => {
    console.error(`   ${file}: ${error}`);
  });
}