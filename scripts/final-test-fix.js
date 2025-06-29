const fs = require('fs');
const path = require('path');

// Find all test files
function findTestFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (item.endsWith('.test.ts') || item.endsWith('.test.tsx') || item.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix common test syntax errors
function fixTestSyntax(content) {
  let fixed = content;
  
  // Fix unclosed mocks
  fixed = fixed.replace(/jest\.mock\([^)]+\)\s*=>\s*\(\s*\{[^}]+$(?!\s*\}\s*\)\s*\))/gm, (match) => {
    if (!match.includes('}))')) {
      return match + '\n  }))\n}))';
    }
    return match;
  });
  
  // Fix await outside async function
  fixed = fixed.replace(/^\s*}\s*\)\s*\n\s*await\s+/gm, '  })\n\n  it(\'temp\', async () => {\n    await ');
  
  // Fix missing test closures
  fixed = fixed.replace(/expect\([^)]+\)\.to[A-Za-z]+\([^)]*\)\s*it\s*\(/g, (match) => {
    return match.replace(/\)\s*it\s*\(/, ')\n  })\n\n  it(');
  });
  
  // Fix double await
  fixed = fixed.replace(/await\s+await\s+/g, 'await ');
  
  // Fix test.test. pattern
  fixed = fixed.replace(/test\.test\./g, 'test.');
  
  // Fix missing parentheses in expect statements
  fixed = fixed.replace(/expect\([^)]+\)\.[a-zA-Z]+\([^)]*$/gm, (match) => {
    return match + ')';
  });
  
  // Remove excessive closing braces at end of file
  fixed = fixed.replace(/(\s*[})]){4,}\s*$/g, (match) => {
    // Count actual open blocks
    let openDescribes = (fixed.match(/describe\s*\(/g) || []).length;
    let openTests = (fixed.match(/(it|test)\s*\(/g) || []).length;
    let totalNeeded = Math.max(1, openDescribes); // At least one describe block
    
    return '\n' + '})'.repeat(totalNeeded);
  });
  
  return fixed;
}

// Process file
async function processFile(filePath) {
  console.log(`Processing ${path.relative(process.cwd(), filePath)}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = fixTestSyntax(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed ${path.relative(process.cwd(), filePath)}`);
      return true;
    } else {
      console.log(`  No changes needed`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Main
async function main() {
  console.log('Running final test fixes...\n');
  
  const testDirs = ['tests', 'e2e'];
  let allFiles = [];
  
  for (const dir of testDirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      allFiles = allFiles.concat(findTestFiles(fullPath));
    }
  }
  
  console.log(`Found ${allFiles.length} test files\n`);
  
  let fixedCount = 0;
  
  // Process in batches
  const batchSize = 10;
  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(file => processFile(file)));
    fixedCount += results.filter(r => r).length;
    
    console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allFiles.length/batchSize)}`);
  }
  
  console.log(`\n✓ Fixed ${fixedCount} files`);
}

main().catch(console.error);