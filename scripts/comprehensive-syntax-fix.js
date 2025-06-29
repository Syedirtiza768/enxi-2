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

// Comprehensive syntax fixes
function comprehensiveSyntaxFix(content, filePath) {
  let fixed = content;
  
  // 1. Fix incomplete mock calls
  fixed = fixed.replace(/\.toHaveBeenCalledWith\(\{\)$/gm, '.toHaveBeenCalledWith({})');
  fixed = fixed.replace(/\.toEqual\(\{\)$/gm, '.toEqual({})');
  fixed = fixed.replace(/\.mockResolvedValue\(\{\s*value:\s*1$/gm, '.mockResolvedValue({ value: 1 })');
  fixed = fixed.replace(/\.mockReturnValue\(\{$/gm, '.mockReturnValue({})');
  
  // 2. Fix incomplete function calls
  fixed = fixed.replace(/\.toThrow\('([^']+)'$/gm, ".toThrow('$1')");
  fixed = fixed.replace(/\.mockResolvedValue\('([^']+)'$/gm, ".mockResolvedValue('$1')");
  fixed = fixed.replace(/jest\.restoreAllMocks\($/gm, 'jest.restoreAllMocks()');
  fixed = fixed.replace(/super\(\.\.\.args$/gm, 'super(...args)');
  
  // 3. Fix incomplete expect statements with standalone objects
  fixed = fixed.replace(/expect\([^)]+\)\.toHaveBeenCalledWith\(\)\s*\{\s*([^}]+)\s*\}/gm, 
    (match, objectContent) => {
      return match.replace('()', `({ ${objectContent} })`);
    });
  
  // 4. Fix missing closing brackets after role: 'USER'
  fixed = fixed.replace(/role:\s*['"]USER['"],?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/gm, 
    "role: 'USER'\n    })\n    $1 =");
  
  // 5. Fix incomplete assignment after object creation
  fixed = fixed.replace(/role:\s*['"]USER['"],?\s*testUserId\s*=/gm, 
    "role: 'USER'\n    })\n    testUserId =");
  
  // 6. Fix standalone objects after expect calls
  const lines = fixed.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1].trim();
    
    // If current line ends with expect().method() and next line starts with {
    if (line.match(/expect\([^)]+\)\.[a-zA-Z]+\(\)$/) && nextLine.startsWith('{')) {
      // Find the matching closing brace
      let braceCount = 0;
      let endIndex = i + 1;
      for (let j = i + 1; j < lines.length; j++) {
        const checkLine = lines[j];
        braceCount += (checkLine.match(/\{/g) || []).length;
        braceCount -= (checkLine.match(/\}/g) || []).length;
        if (braceCount === 0) {
          endIndex = j;
          break;
        }
      }
      
      // Combine the lines
      const objectContent = lines.slice(i + 1, endIndex + 1).join('\n');
      lines[i] = line.replace(/\(\)$/, `(${objectContent})`);
      // Remove the standalone object lines
      lines.splice(i + 1, endIndex - i);
      i = endIndex; // Skip processed lines
    }
  }
  fixed = lines.join('\n');
  
  // 7. Remove excessive closing braces/parens at file end
  fixed = fixed.replace(/(\s*[})]){3,}\s*$/g, '\n})\n');
  
  // 8. Fix missing closing for expect statements
  fixed = fixed.replace(/expect\([^)]+\)\.[a-zA-Z]+\([^)]*$/gm, (match) => {
    return match + ')';
  });
  
  // 9. Fix incomplete parentheses in test calls
  fixed = fixed.replace(/await expect\([^)]+\)\.rejects\.toThrow\([^)]*$/gm, (match) => {
    return match + ')';
  });
  
  // 10. Ensure proper file ending
  fixed = fixed.trimRight();
  if (!fixed.endsWith('\n')) {
    fixed += '\n';
  }
  
  // 11. Balance braces and parentheses if needed
  let openBraces = (fixed.match(/\{/g) || []).length;
  let closeBraces = (fixed.match(/\}/g) || []).length;
  let openParens = (fixed.match(/\(/g) || []).length;
  let closeParens = (fixed.match(/\)/g) || []).length;
  
  // Only add closers if there's a reasonable imbalance (not too many)
  if (openBraces > closeBraces && openBraces - closeBraces <= 3) {
    fixed = fixed.trimRight() + '\n' + '}'.repeat(openBraces - closeBraces) + '\n';
  }
  
  return fixed;
}

// Process file
async function processFile(filePath) {
  console.log(`Processing ${path.relative(process.cwd(), filePath)}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = comprehensiveSyntaxFix(content, filePath);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed ${path.relative(process.cwd(), filePath)}`);
      return true;
    } else {
      console.log(`  No changes needed`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return false;
  }
}

// Main
async function main() {
  console.log('Running comprehensive syntax fixes...\n');
  
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
  
  // Process files in parallel batches
  const batchSize = 20;
  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(file => processFile(file)));
    fixedCount += results.filter(r => r).length;
    
    console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allFiles.length/batchSize)}`);
  }
  
  console.log(`\n✓ Fixed ${fixedCount} files`);
}

main().catch(console.error);