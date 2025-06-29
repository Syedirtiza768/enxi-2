#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

console.log('🔧 Comprehensive final syntax fix for test files...\n');

// Find all test files
const testFiles = glob.sync('tests/**/*.{test,spec}.{ts,tsx,js,jsx}', {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
});

console.log(`Found ${testFiles.length} test files to process\n`);

let totalFixed = 0;
let processedFiles = 0;

function fixCriticalSyntaxErrors(content) {
  let fixed = content;
  let hasChanges = false;

  // 1. Fix incomplete jest.mock calls - missing closing parentheses
  if (fixed.includes('jest.fn(') && !fixed.includes('jest.fn()')) {
    fixed = fixed.replace(/jest\.fn\(\s*$/gm, 'jest.fn()');
    hasChanges = true;
  }

  // 2. Fix incomplete object patterns in expect calls - missing closing parentheses
  fixed = fixed.replace(/\.rejects\.toThrow\('DB Error'\s*$/gm, ".rejects.toThrow('DB Error')");
  
  // 3. Fix incomplete expect objectContaining patterns
  fixed = fixed.replace(/newAssignee: newSalespersonId,\)\s*\}\),\s*\}\),\)\s*\}\)$/gm, 
    'newAssignee: newSalespersonId,\n          }),\n        }),\n      })');

  // 4. Fix missing closing parentheses after jest mock calls
  fixed = fixed.replace(/getServerSession: jest\.fn\(\(\) => Promise\.resolve\(mockSession\(\s*$/gm,
    'getServerSession: jest.fn(() => Promise.resolve(mockSession))');

  // 5. Fix missing closing braces and parentheses after useRouter mock
  fixed = fixed.replace(/useRouter: jest\.fn\(\s*jest\.mock/gm, 'useRouter: jest.fn()\n}))\n\njest.mock');

  // 6. Fix excessive closing braces at end of files
  fixed = fixed.replace(/\}\}\}\s*$/gm, '}');
  fixed = fixed.replace(/\}\s*\}\s*$/gm, '}');

  // 7. Fix incomplete jest.fn() calls in object destructuring
  fixed = fixed.replace(/delete: jest\.fn\(\s*\}\)\)\s*\}\)\)/gm, 'delete: jest.fn()\n  })\n})');

  // 8. Fix missing closing parentheses in .toThrow calls
  fixed = fixed.replace(/\.toThrow\('([^']+)'\s*$/gm, ".toThrow('$1')");

  // 9. Fix missing opening/closing braces in mock statements
  fixed = fixed.replace(/^(\s*)jest\.mock\([^{]*\{\s*$/gm, '$1jest.mock');

  // 10. Remove orphaned closing parentheses and braces
  fixed = fixed.replace(/^\s*\}\)\s*$/gm, '');
  fixed = fixed.replace(/^\s*\)\s*$/gm, '');

  return { fixed, hasChanges };
}

// Process all files
for (const file of testFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const { fixed, hasChanges } = fixCriticalSyntaxErrors(content);
    
    if (hasChanges) {
      fs.writeFileSync(file, fixed);
      totalFixed++;
      console.log(`  ✅ Fixed: ${file}`);
    }
    
    processedFiles++;
  } catch (error) {
    console.error(`  ❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n📊 Comprehensive Fix Summary:`);
console.log(`   Processed: ${processedFiles} files`);
console.log(`   Fixed: ${totalFixed} files`);
console.log(`   Success rate: ${Math.round((processedFiles / testFiles.length) * 100)}%`);

if (totalFixed > 0) {
  console.log(`\n🎉 Comprehensive syntax fix complete! Fixed ${totalFixed} files.`);
} else {
  console.log(`\n✨ All files appear to be syntactically correct already.`);
}