#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing component test expect.objectContaining syntax issues...\n');

const componentTestFiles = glob.sync('**/tests/components/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

componentTestFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Fix misplaced }) in expect.objectContaining
    // Pattern: expect.objectContaining({ method: 'POST', }) headers: {...}
    content = content.replace(
      /expect\.objectContaining\(\{\s*([^}]*?)\s*\}\)\s*([a-zA-Z]+):\s*/gm,
      (match, props, nextProp) => {
        // Check if this is a broken objectContaining
        if (nextProp && ['headers', 'body', 'credentials'].includes(nextProp)) {
          return `expect.objectContaining({\n${props},\n    ${nextProp}: `;
        }
        return match;
      }
    );

    // Fix the specific broken pattern with closing braces
    content = content.replace(
      /expect\.objectContaining\(\{\s*method:\s*'([^']+)',\s*\}\)\s*headers:/gm,
      "expect.objectContaining({\n            method: '$1',\n            headers:"
    );

    // Fix another pattern where }) appears before the object is complete
    content = content.replace(
      /(\s*)expect\(global\.fetch\)\.toHaveBeenCalledWith\(\s*'([^']+)',\s*expect\.objectContaining\(\{\s*method:\s*'([^']+)',\s*\}\)\s*headers:\s*\{([^}]+)\},\s*([^)]+)\s*\)\s*\)/gm,
      "$1expect(global.fetch).toHaveBeenCalledWith(\n$1  '$2',\n$1  expect.objectContaining({\n$1    method: '$3',\n$1    headers: {$4},\n$1    $5\n$1  })\n$1)"
    );

    // Fix multi-line expect patterns
    const lines = content.split('\n');
    let inExpectBlock = false;
    let expectIndent = '';
    let fixedLines = [];
    let skipLines = 0;

    for (let i = 0; i < lines.length; i++) {
      if (skipLines > 0) {
        skipLines--;
        continue;
      }

      const line = lines[i];
      const trimmedLine = line.trim();

      // Detect broken expect.objectContaining pattern
      if (trimmedLine.includes('expect.objectContaining({') && 
          i + 1 < lines.length && lines[i + 1].trim().includes('method:') &&
          i + 2 < lines.length && lines[i + 2].trim() === '})' &&
          i + 3 < lines.length && lines[i + 3].trim().startsWith('headers:')) {
        
        // Found the broken pattern, reconstruct it
        const indent = line.match(/^\s*/)[0];
        const methodLine = lines[i + 1].trim();
        const headersLine = lines[i + 3].trim();
        const bodyLine = i + 4 < lines.length ? lines[i + 4].trim() : '';
        const credentialsLine = i + 5 < lines.length ? lines[i + 5].trim() : '';

        fixedLines.push(`${indent}expect.objectContaining({`);
        fixedLines.push(`${indent}  ${methodLine}`);
        fixedLines.push(`${indent}  ${headersLine}`);
        
        if (bodyLine.startsWith('body:')) {
          fixedLines.push(`${indent}  ${bodyLine}`);
          skipLines = 4;
        }
        
        if (credentialsLine.startsWith('credentials:')) {
          fixedLines.push(`${indent}  ${credentialsLine}`);
          skipLines = 5;
        }
        
        fixedLines.push(`${indent}})`);
        
        // Skip the pattern check after the closing
        if (i + skipLines + 1 < lines.length && lines[i + skipLines + 1].trim() === ')') {
          skipLines++;
        }
        
        modified = true;
        continue;
      }

      fixedLines.push(line);
    }

    if (fixedLines.length > 0 && fixedLines.join('\n') !== content) {
      content = fixedLines.join('\n');
      modified = true;
    }

    // Final cleanup of any remaining syntax issues
    content = content.replace(/\}\)\s*\}\)\s*\)/gm, '})\n        )\n      })');

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