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

// Fix syntax errors in test files
function fixSyntaxErrors(content) {
  let fixed = content;
  
  // Remove all excessive closing braces/parens at the end
  fixed = fixed.replace(/(\s*[})]\s*){3,}$/gm, '');
  
  // Fix specific patterns of broken closings
  fixed = fixed.replace(/}\s*}\s*}\s*}\s*}\s*\)\s*\)\s*\)\s*\)\s*$/gm, '});');
  fixed = fixed.replace(/}\s*}\s*}\s*}\s*\)\s*\)\s*\)\s*$/gm, '});');
  fixed = fixed.replace(/}\s*}\s*}\s*\)\s*\)\s*$/gm, '});');
  fixed = fixed.replace(/}\s*}\s*\)\s*\)$/gm, '});');
  
  // Fix patterns like })})
  fixed = fixed.replace(/}\s*\)\s*}\s*\)\s*$/gm, '});');
  
  // Fix incomplete parentheses at line end
  const lines = fixed.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Fix lines that end with incomplete parentheses
    if (line.trim().match(/expect\([^)]+\)\.\w+\([^)]*$/)) {
      lines[i] = line + ')';
    }
    
    // Fix lines with unclosed expect
    if (line.trim().match(/expect\([^)]+$/)) {
      lines[i] = line + ')';
    }
  }
  fixed = lines.join('\n');
  
  // Ensure proper test/describe closure
  let openDescribes = 0;
  let openTests = 0;
  let openBraces = 0;
  let openParens = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < fixed.length; i++) {
    const char = fixed[i];
    const prevChar = i > 0 ? fixed[i - 1] : '';
    const substr = fixed.substring(Math.max(0, i - 10), i);
    
    // Handle strings
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      if (prevChar !== '\\') {
        inString = true;
        stringChar = char;
      }
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
    }
    
    if (!inString) {
      // Track describe/test blocks
      if (substr.match(/describe\s*\($/)) openDescribes++;
      if (substr.match(/(?:it|test)\s*\($/)) openTests++;
      
      // Track braces and parens
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '(') openParens++;
      if (char === ')') openParens--;
    }
  }
  
  // Add missing closings at the end
  fixed = fixed.trimRight();
  
  // Close all open structures properly
  while (openTests > 0) {
    fixed += '\n  });';
    openTests--;
    openBraces--;
    openParens--;
  }
  
  while (openDescribes > 0) {
    fixed += '\n});';
    openDescribes--;
    openBraces--;
    openParens--;
  }
  
  // Add any remaining braces/parens
  if (openBraces > 0) {
    fixed += '\n' + '}'.repeat(openBraces);
  }
  if (openParens > 0) {
    fixed += ')'.repeat(openParens);
  }
  
  // Ensure newline at end
  if (!fixed.endsWith('\n')) {
    fixed += '\n';
  }
  
  return fixed;
}

// Process file
async function processFile(filePath) {
  console.log(`Processing ${path.relative(process.cwd(), filePath)}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = fixSyntaxErrors(content);
    
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
  console.log('Fixing syntax errors in test files...\n');
  
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
  
  for (const file of allFiles) {
    if (await processFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✓ Fixed ${fixedCount} files`);
}

main().catch(console.error);