#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing component test import syntax errors...\n');

const testsDir = path.join(process.cwd(), 'tests');
const componentTestFiles = glob.sync('**/tests/components/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

componentTestFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Fix the specific import syntax error with misplaced }, act }
    // Pattern: "import { ... } , act } from '@testing-library/react'"
    if (content.includes('} , act } from')) {
      content = content.replace(
        /import\s*\{([^}]+)\}\s*,\s*act\s*\}\s*from\s*['"]@testing-library\/react['"]/g,
        "import { $1, act } from '@testing-library/react'"
      );
      modified = true;
    }

    // Also fix if act is imported separately but incorrectly
    if (content.includes('waitFor } , act }')) {
      content = content.replace(
        /waitFor\s*\}\s*,\s*act\s*\}/g,
        'waitFor, act }'
      );
      modified = true;
    }

    // Fix any other malformed imports from @testing-library/react
    const rtlImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@testing-library\/react['"]/);
    if (rtlImportMatch) {
      const imports = rtlImportMatch[1];
      // Clean up the imports - remove duplicates and fix formatting
      const importItems = imports.split(',').map(item => item.trim()).filter(Boolean);
      const uniqueImports = [...new Set(importItems)];
      
      // Make sure act is included if it's used in the file
      if (content.includes('act(') && !uniqueImports.includes('act')) {
        uniqueImports.push('act');
      }
      
      const cleanedImports = uniqueImports.join(', ');
      const newImport = `import { ${cleanedImports} } from '@testing-library/react'`;
      
      content = content.replace(rtlImportMatch[0], newImport);
      if (content !== originalContent) {
        modified = true;
      }
    }

    // Fix imports from component-test-utils
    if (content.includes('@/tests/helpers/component-test-utils')) {
      // Check what's being imported
      const utilsImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@\/tests\/helpers\/component-test-utils['"]/);
      if (utilsImportMatch) {
        const imports = utilsImportMatch[1];
        // These utilities should include act
        if (!imports.includes('act') && content.includes('act(')) {
          const importItems = imports.split(',').map(item => item.trim()).filter(Boolean);
          importItems.push('act');
          const newImports = importItems.join(', ');
          const newImport = `import { ${newImports} } from '@/tests/helpers/component-test-utils'`;
          content = content.replace(utilsImportMatch[0], newImport);
          modified = true;
        }
      }
    }

    // Remove duplicate React imports
    const reactImportCount = (content.match(/import\s+React\s+from\s+['"]react['"]/g) || []).length;
    if (reactImportCount > 1) {
      // Keep only the first React import
      let firstFound = false;
      content = content.split('\n').filter(line => {
        if (line.match(/import\s+React\s+from\s+['"]react['"]/)) {
          if (!firstFound) {
            firstFound = true;
            return true;
          }
          return false;
        }
        return true;
      }).join('\n');
      modified = true;
    }

    // Fix misplaced fireEvent imports
    if (content.includes('fireEvent') && !content.includes('import') && content.includes('fireEvent')) {
      // Make sure fireEvent is imported
      const rtlImportLine = content.split('\n').find(line => line.includes("from '@testing-library/react'"));
      if (rtlImportLine && !rtlImportLine.includes('fireEvent')) {
        content = content.replace(
          /import\s*\{([^}]+)\}\s*from\s*['"]@testing-library\/react['"]/,
          (match, imports) => {
            const importList = imports.split(',').map(i => i.trim()).filter(Boolean);
            if (!importList.includes('fireEvent')) {
              importList.push('fireEvent');
            }
            return `import { ${importList.join(', ')} } from '@testing-library/react'`;
          }
        );
        modified = true;
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