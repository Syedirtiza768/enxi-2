#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing component test mock syntax errors...\n');

const componentTestFiles = glob.sync('**/tests/components/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

componentTestFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Fix duplicate mock definitions like:
    // jest.mock('next/navigation', () => ({
    //   useRouter: jest.fn(),
    //   useParams: jest.fn(),
    //   useSearchParams: jest.fn()
    // })) => ({
    //   useRouter: jest.fn(),
    //   useParams: jest.fn(),
    // })
    
    // This pattern has a malformed double arrow function
    const duplicateMockPattern = /jest\.mock\([^)]+\)\s*=>\s*\([^)]+\)\s*=>\s*\([^)]+\)/gs;
    if (duplicateMockPattern.test(content)) {
      content = content.replace(
        /jest\.mock\(['"]([^'"]+)['"]\s*,\s*\(\)\s*=>\s*\(([^)]+)\)\)\s*=>\s*\([^)]+\)/gs,
        "jest.mock('$1', () => ($2))"
      );
      modified = true;
    }

    // Fix render component syntax errors like "render(<Component / / />)"
    const doubleSlashPattern = /render\s*\(\s*<([^>]+)\s*\/\s*\/\s*\/>\s*\)/g;
    if (doubleSlashPattern.test(content)) {
      content = content.replace(doubleSlashPattern, 'render(<$1 />)');
      modified = true;
    }

    // Fix act syntax with double act calls like "act(async () => { await act(async () => {"
    const doubleActPattern = /act\s*\(\s*async\s*\(\)\s*=>\s*\{\s*await\s*act\s*\(\s*async\s*\(\)\s*=>\s*\{/g;
    if (doubleActPattern.test(content)) {
      content = content.replace(doubleActPattern, 'act(async () => {');
      // Also need to remove the extra closing braces
      content = content.replace(/\}\s*\)\s*;\s*\}\s*\)/g, (match) => {
        // Count the braces to ensure we're removing the right amount
        const openBraces = (match.match(/\{/g) || []).length;
        const closeBraces = (match.match(/\}/g) || []).length;
        if (closeBraces > openBraces) {
          return '})';
        }
        return match;
      });
      modified = true;
    }

    // Fix fireEvent calls wrapped in double act
    content = content.replace(
      /await\s+act\s*\(\s*async\s*\(\)\s*=>\s*\{\s*fireEvent\.([^(]+)\(([^)]+)\)\s*\}\s*\);/g,
      'fireEvent.$1($2);'
    );
    if (content !== originalContent) modified = true;

    // Fix malformed object syntax in expect calls
    const expectPattern = /expect\s*\(([^)]+)\)\.toHaveBeenCalledWith\s*\(\s*expect\.objectContaining\s*\(\s*\{[^}]+\}\s*\)\s*\)\s*headers:/g;
    if (expectPattern.test(content)) {
      // This is a tricky one - need to properly nest the object
      content = content.replace(
        /expect\(([^)]+)\)\.toHaveBeenCalledWith\(\s*'([^']+)',\s*expect\.objectContaining\(\{([^}]+)\}\)\s*\)\s*headers:\s*\{([^}]+)\}/g,
        "expect($1).toHaveBeenCalledWith(\n        '$2',\n        expect.objectContaining({\n          $3,\n          headers: {$4}\n        })\n      )"
      );
      modified = true;
    }

    // Fix waitFor syntax with improper closing
    content = content.replace(
      /await\s+waitFor\s*\(\s*\(\)\s*=>\s*\{\s*expect\(([^)]+)\)\.toBeInTheDocument\(\)\s*\)\s*\}/g,
      'await waitFor(() => {\n        expect($1).toBeInTheDocument()\n      })'
    );
    if (content !== originalContent) modified = true;

    // Fix missing closing braces in waitFor blocks
    const lines = content.split('\n');
    let inWaitFor = false;
    let waitForBraceCount = 0;
    let fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('await waitFor(')) {
        inWaitFor = true;
        waitForBraceCount = 0;
      }
      
      if (inWaitFor) {
        waitForBraceCount += (line.match(/\{/g) || []).length;
        waitForBraceCount -= (line.match(/\}/g) || []).length;
        
        if (waitForBraceCount === 0 && !line.includes('})')) {
          // We're missing the closing
          fixedLines.push(line);
          fixedLines.push('      })');
          inWaitFor = false;
          modified = true;
          continue;
        }
      }
      
      fixedLines.push(line);
    }
    
    if (modified && fixedLines.length > 0) {
      content = fixedLines.join('\n');
    }

    // Fix component-test-utils imports
    if (content.includes('@/tests/helpers/component-test-utils')) {
      // Ensure fireEvent is imported if used
      if (content.includes('fireEvent.') && !content.includes('import') && content.includes('fireEvent')) {
        const utilsImport = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@\/tests\/helpers\/component-test-utils['"]/);
        if (utilsImport) {
          const imports = utilsImport[1].split(',').map(i => i.trim());
          if (!imports.includes('fireEvent')) {
            imports.push('fireEvent');
            content = content.replace(
              utilsImport[0],
              `import { ${imports.join(', ')} } from '@/tests/helpers/component-test-utils'`
            );
            modified = true;
          }
        }
      }
    }

    if (modified) {
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