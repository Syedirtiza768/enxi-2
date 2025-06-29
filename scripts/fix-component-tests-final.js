#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Final component test syntax fixes...\n');

const componentTestFiles = glob.sync('**/tests/components/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

componentTestFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Fix any remaining syntax issues

    // 1. Fix broken mock definitions
    content = content.replace(
      /jest\.mock\(['"]([^'"]+)['"]\s*,\s*\(\)\s*=>\s*\(([^)]+)\)\)\s*=>\s*\(([^)]+)\)/gs,
      "jest.mock('$1', () => ($2))"
    );

    // 2. Fix malformed expect calls with headers
    content = content.replace(
      /expect\(([^)]+)\)\.toHaveBeenCalledWith\(\s*'([^']+)',\s*expect\.objectContaining\(\{([^}]+)\}\)\s*\)\s*headers:\s*\{([^}]+)\}/g,
      (match, fetchVar, url, bodyContent, headersContent) => {
        // Check if headers should be inside objectContaining
        return `expect(${fetchVar}).toHaveBeenCalledWith(
        '${url}',
        expect.objectContaining({
          ${bodyContent.trim()},
          headers: {${headersContent}}
        })
      )`;
      }
    );

    // 3. Fix dangling closing braces and brackets
    const lines = content.split('\n');
    let fixedLines = [];
    let braceBalance = 0;
    let inDescribe = false;
    let inIt = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Track describe and it blocks
      if (trimmedLine.startsWith('describe(')) inDescribe = true;
      if (trimmedLine.startsWith('it(')) inIt = true;
      
      // Count braces
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceBalance += openBraces - closeBraces;
      
      // Skip lines that are just closing braces with wrong indentation
      if (trimmedLine === '})' && braceBalance < 0) {
        braceBalance++;
        modified = true;
        continue;
      }
      
      // Fix lines with just })
      if (trimmedLine === '})' && lines[i + 1] && lines[i + 1].trim().startsWith('})')) {
        // Check if this is a redundant closing
        const nextLine = lines[i + 1].trim();
        if (nextLine === '})' || nextLine === '})') {
          fixedLines.push(line);
          i++; // Skip the next line
          modified = true;
          continue;
        }
      }
      
      fixedLines.push(line);
    }
    
    if (fixedLines.length !== lines.length) {
      content = fixedLines.join('\n');
    }

    // 4. Fix missing closing parentheses in waitFor blocks
    content = content.replace(
      /await waitFor\(\(\) => \{([^}]+)\}\)(\s*)$/gm,
      'await waitFor(() => {$1})'
    );

    // 5. Fix unclosed expect statements
    content = content.replace(
      /expect\(([^)]+)\)\.toBeInTheDocument\(\)\)(\s*)$/gm,
      'expect($1).toBeInTheDocument()'
    );

    // 6. Fix fireEvent syntax with missing closing braces
    content = content.replace(
      /fireEvent\.([a-zA-Z]+)\(([^,]+),\s*\{\s*target:\s*\{\s*value:\s*"([^"]+)"\s*\}\s*$/gm,
      'fireEvent.$1($2, { target: { value: "$3" } })'
    );

    // 7. Fix async arrow functions with missing closing
    content = content.replace(
      /await act\(async \(\) => \{ fireEvent\.([^(]+)\(([^)]+)\)\s*$/gm,
      'fireEvent.$1($2)'
    );

    // 8. Fix render component calls with double slashes
    content = content.replace(
      /render\(<([^>]+)\s*\/\s*\/\s*\/>\)/g,
      'render(<$1 />)'
    );

    // 9. Remove any remaining "No newline at end of file" text
    content = content.replace(/No newline at end of file/g, '');

    // 10. Fix any remaining syntax issues with missing semicolons after fireEvent
    content = content.replace(
      /fireEvent\.([a-zA-Z]+)\(([^)]+)\)(\s*\n\s*)(expect|await|const|let|var|it|describe)/g,
      'fireEvent.$1($2);$3$4'
    );

    // 11. Ensure file ends with newline
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