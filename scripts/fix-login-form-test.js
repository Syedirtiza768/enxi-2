const fs = require('fs');
const path = require('path');

// Read the login-form.test.tsx file
const filePath = path.join(__dirname, '../tests/components/auth/login-form.test.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Count open/close blocks
function countBlocks(content) {
  let openDescribes = 0;
  let openTests = 0;
  let openBraces = 0;
  let openParens = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    const nextFew = content.substring(i, Math.min(i + 20, content.length));
    
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
      // Count describe blocks
      if (nextFew.match(/^describe\s*\(/)) {
        openDescribes++;
        i += 8; // Skip 'describe'
      }
      
      // Count test/it blocks
      if (nextFew.match(/^(it|test)\s*\(/)) {
        openTests++;
        i += 2; // Skip 'it' or advance past 'test'
      }
      
      // Count braces and parens
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '(') openParens++;
      if (char === ')') openParens--;
    }
  }
  
  return { openDescribes, openTests, openBraces, openParens };
}

// Fix the structure
const lines = content.split('\n');
let fixed = [];
let inTestBlock = false;
let testIndent = 2;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Track when we're in a test block
  if (trimmed.match(/^it\s*\(|^test\s*\(/)) {
    inTestBlock = true;
  }
  
  // Fix lines that have test declarations without proper closure
  if (i > 0 && trimmed.match(/^it\s*\(/) && !lines[i-1].trim().endsWith('})')) {
    // This test is missing closure from previous test
    const prevNonEmpty = fixed.filter(l => l.trim()).pop();
    if (prevNonEmpty && !prevNonEmpty.trim().endsWith('})')) {
      // Add proper closure for previous test
      fixed.push('  })');
      fixed.push('');
    }
  }
  
  fixed.push(line);
}

// Join and clean up
let result = fixed.join('\n');

// Ensure proper closure at the end
const counts = countBlocks(result);

// We should have exactly 1 describe block and it should be closed
if (counts.openDescribes > 0) {
  result = result.trimRight();
  // Remove any excessive closures at the end
  result = result.replace(/(\s*\}\s*\)\s*)+$/, '');
  // Add proper closure
  result += '\n})';
}

// Make sure no excessive closures
result = result.replace(/\}\s*\)\s*\}\s*\)\s*\}\s*\)\s*\}\s*\)\s*\)\s*\)$/, '})');

// Write the fixed content
fs.writeFileSync(filePath, result);

console.log('Fixed login-form.test.tsx');
console.log('Block counts:', countBlocks(result));