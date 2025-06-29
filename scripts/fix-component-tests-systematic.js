#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const testsDir = path.join(process.cwd(), 'tests', 'components');

// Find all .test.tsx files
function findTestFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (item.endsWith('.test.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix excessive closing braces
function fixExcessiveClosingBraces(content) {
  // Remove patterns like })})})})}) at the end
  content = content.replace(/(\s*\}\s*\)\s*){3,}$/g, '');
  
  // Count opening and closing braces/parens
  let openBraces = 0;
  let closeBraces = 0;
  let openParens = 0;
  let closeParens = 0;
  
  // Count in strings and comments should be ignored
  const lines = content.split('\n');
  for (const line of lines) {
    // Skip comments and strings
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    
    // Simple counting (not perfect but good enough)
    openBraces += (line.match(/\{/g) || []).length;
    closeBraces += (line.match(/\}/g) || []).length;
    openParens += (line.match(/\(/g) || []).length;
    closeParens += (line.match(/\)/g) || []).length;
  }
  
  // Add missing closing braces/parens at the end
  const missingBraces = openBraces - closeBraces;
  const missingParens = openParens - closeParens;
  
  if (missingBraces > 0) {
    content += '\n' + '}'.repeat(missingBraces);
  }
  if (missingParens > 0) {
    content += '\n' + ')'.repeat(missingParens);
  }
  
  return content;
}

// Fix provider wrapper issues
function fixProviderWrappers(content) {
  // Check if using old render
  if (content.includes("from '@testing-library/react'") && content.includes('render(')) {
    // Replace with custom render
    content = content.replace(
      "import { render",
      "// import { render"
    );
    
    // Add custom render import if not present
    if (!content.includes("from '@/tests/helpers/component-test-utils'")) {
      const lastImportMatch = content.match(/import[^;]+;(?=\s*(?:describe|test|it|\/\/|$))/gs);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        const insertPos = content.indexOf(lastImport) + lastImport.length;
        content = content.slice(0, insertPos) + 
          "\nimport { render } from '@/tests/helpers/component-test-utils';" +
          content.slice(insertPos);
      }
    }
  }
  
  return content;
}

// Fix async handling
function fixAsyncHandling(content) {
  // Fix waitFor without await
  content = content.replace(/(\s+)waitFor\(/g, '$1await waitFor(');
  
  // Fix test functions that use waitFor but aren't async
  content = content.replace(/it\('([^']+)',\s*\(\)\s*=>\s*{([^}]+waitFor[^}]+)}/g, 
    "it('$1', async () => {$2}");
  content = content.replace(/test\('([^']+)',\s*\(\)\s*=>\s*{([^}]+waitFor[^}]+)}/g,
    "test('$1', async () => {$2}");
  
  // Fix fireEvent without act
  content = content.replace(/(fireEvent\.[a-zA-Z]+\([^)]+\))/g, 
    'await act(async () => { $1; })');
  
  // Remove duplicate awaits
  content = content.replace(/await\s+await/g, 'await');
  
  return content;
}

// Fix mock setup
function fixMockSetup(content) {
  // Replace old api with apiClient
  content = content.replace(/jest\.mock\('@\/lib\/api\/client',/g, 
    "jest.mock('@/lib/api/client',");
  
  content = content.replace(/import\s+{\s*api\s*}\s+from\s+'@\/lib\/api\/client'/g,
    "import { apiClient } from '@/lib/api/client'");
    
  content = content.replace(/\bapi\.(get|post|put|delete|patch)\(/g, 'apiClient(');
  
  // Fix mock return values
  content = content.replace(/mockResolvedValue\(\s*{\s*data:/g, 'mockResolvedValue({');
  
  return content;
}

// Main processing
async function processFile(filePath) {
  console.log(`Processing ${path.relative(process.cwd(), filePath)}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Apply fixes in order
  content = fixExcessiveClosingBraces(content);
  content = fixProviderWrappers(content);
  content = fixAsyncHandling(content);
  content = fixMockSetup(content);
  
  // Add missing imports if needed
  if (content.includes('act(') && !content.includes("import { act")) {
    if (content.includes("from '@testing-library/react'")) {
      content = content.replace(
        "from '@testing-library/react'",
        ", act } from '@testing-library/react'"
      );
    }
  }
  
  // Save if changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
}

// Main execution
async function main() {
  console.log('Fixing component tests...\n');
  
  const testFiles = findTestFiles(testsDir);
  console.log(`Found ${testFiles.length} test files\n`);
  
  let fixedCount = 0;
  
  for (const file of testFiles) {
    try {
      if (await processFile(file)) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  console.log(`\n✓ Fixed ${fixedCount} files`);
}

main().catch(console.error);