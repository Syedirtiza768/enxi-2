#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing remaining component test syntax issues...\n');

const componentTestFiles = glob.sync('**/tests/components/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

componentTestFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Fix 1: Missing closing braces for fireEvent.change
    // Pattern: await act(async () => { fireEvent.change(input, { target: { value: "text" });
    content = content.replace(
      /await act\(async \(\) => \{ fireEvent\.change\(([^,]+),\s*\{\s*target:\s*\{\s*value:\s*"([^"]+)"\s*\}\s*\}\);$/gm,
      'await act(async () => { fireEvent.change($1, { target: { value: "$2" } }) })'
    );

    // Fix 2: Missing closing for await act with fireEvent.click
    content = content.replace(
      /await act\(async \(\) => \{ fireEvent\.click\(([^)]+)\);$/gm,
      'await act(async () => { fireEvent.click($1) })'
    );

    // Fix 3: Double closing braces issue
    content = content.replace(
      /\}\)\s*\}\)$/gm,
      '})'
    );

    // Fix 4: Fix missing closing braces after }})
    content = content.replace(
      /\}\}\)\s*$/gm,
      '}})'
    );

    // Fix 5: Fix expect statements inside waitFor
    content = content.replace(
      /await waitFor\(\(\) => \{\s*expect\(([^)]+)\)\.toBeInTheDocument\(\)\s*\}\)\s*\}\)$/gm,
      'await waitFor(() => {\n      expect($1).toBeInTheDocument()\n    })'
    );

    // Fix 6: Fix unclosed }) patterns
    content = content.replace(
      /\}\)\s*\}\)\s*$/gm,
      '})'
    );

    // Fix 7: Fix specific pattern with }) inside expect
    content = content.replace(
      /expect\.objectContaining\(\{\s*([^}]+)\s*\}\)\s*\}\)/g,
      'expect.objectContaining({\n      $1\n    })'
    );

    // Fix 8: Fix fireEvent without proper closing
    content = content.replace(
      /fireEvent\.([a-zA-Z]+)\(([^)]+)\)\s*\}\)$/gm,
      'fireEvent.$1($2))'
    );

    // Fix 9: Fix mismatched parentheses in specific patterns
    content = content.replace(
      /await act\(async \(\) => \{ fireEvent\.click\(([^)]+)\)\)\s*$/gm,
      'await act(async () => { fireEvent.click($1) })'
    );

    // Fix 10: Clean up redundant })
    const lines = content.split('\n');
    let cleanedLines = [];
    let skipNext = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (skipNext) {
        skipNext = false;
        continue;
      }
      
      const line = lines[i];
      const trimmedLine = line.trim();
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      
      // Skip redundant }) patterns
      if (trimmedLine === '})' && (nextLine === '})' || nextLine === '}))')) {
        const prevLine = i > 0 ? lines[i - 1].trim() : '';
        if (prevLine.endsWith('})') || prevLine.endsWith('});')) {
          skipNext = true;
          modified = true;
          continue;
        }
      }
      
      cleanedLines.push(line);
    }
    
    if (cleanedLines.length !== lines.length) {
      content = cleanedLines.join('\n');
    }

    // Ensure file ends with newline
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