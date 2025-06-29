#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Final Test Syntax Fix...\n');

// Comprehensive syntax fixes
const syntaxFixes = {
  // Fix missing closing parentheses in mocks
  fixMissingClosingParens: (content) => {
    // Fix patterns where }) is missing after jest.mock
    content = content.replace(/jest\.mock\('([^']+)', \(\) => \(\{[\s\S]*?\}\)\)(?!\))/g, 
      (match) => match + ')');
    
    // Fix next-auth mock missing closing
    content = content.replace(
      /jest\.mock\('next-auth', \(\) => \(\{[\s\n\r]*getServerSession: jest\.fn\(\(\) => Promise\.resolve\(mockSession\(\)\)\)\s*\n/g,
      `jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve(mockSession()))
}))\n`
    );
    
    // Fix next/server mock missing closing
    content = content.replace(
      /jest\.mock\('next\/server', \(\) => \(\{[\s\n\r]*NextRequest: MockNextRequest,[\s\n\r]*NextResponse: mockResponses\s*\n/g,
      `jest.mock('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: mockResponses
}))\n`
    );
    
    // Fix service mocks missing closing
    content = content.replace(
      /jest\.mock\('@\/lib\/services\/[^']+', \(\) => \(\{[\s\S]*?\}\)\)\n\n(?!import|\))/g,
      (match) => match.trimEnd() + ')\n\n'
    );
    
    return content;
  },
  
  // Remove duplicate or orphaned lines
  removeOrphanedCode: (content) => {
    // Remove orphaned semicolons and code blocks
    content = content.replace(/\n;\n\s*this\.json = jest\.fn[\s\S]*?\}\n/g, '\n');
    content = content.replace(/\n\/\/ MOCK NEXT\n[\s\S]*?jest\.mock\('next\/server'[^}]+\}\n/g, '\n');
    
    // Remove duplicate jest.mock calls
    const lines = content.split('\n');
    const seenMocks = new Set();
    const filteredLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('jest.mock(')) {
        const mockMatch = line.match(/jest\.mock\('([^']+)'/);
        if (mockMatch) {
          const mockPath = mockMatch[1];
          if (seenMocks.has(mockPath)) {
            // Skip duplicate mock and its content
            while (i < lines.length && !lines[i].endsWith('})')) {
              i++;
            }
            continue;
          }
          seenMocks.add(mockPath);
        }
      }
      filteredLines.push(line);
    }
    
    return filteredLines.join('\n');
  },
  
  // Fix test file structure
  fixTestStructure: (content) => {
    // Ensure describe blocks are properly closed
    const describeCount = (content.match(/describe\(/g) || []).length;
    const closingBraceCount = (content.match(/\}\)/g) || []).length;
    
    if (describeCount > 0 && closingBraceCount < describeCount * 2) {
      // Add missing closing braces
      const missingBraces = (describeCount * 2) - closingBraceCount;
      for (let i = 0; i < missingBraces; i++) {
        content += '\n})';
      }
    }
    
    // Fix simple.test.ts specifically
    if (content.includes('should verify boolean values')) {
      content = content.replace(/\}\);\s*$/, '});\n});');
    }
    
    return content;
  },
  
  // Clean up file endings
  cleanupFileEndings: (content) => {
    // Remove "No newline at end of file" comments
    content = content.replace(/\s*No newline at end of file\s*/g, '');
    
    // Ensure file ends with newline
    content = content.trimEnd() + '\n';
    
    return content;
  },
  
  // Apply all fixes
  applyAllFixes: (content, filePath) => {
    content = syntaxFixes.fixMissingClosingParens(content);
    content = syntaxFixes.removeOrphanedCode(content);
    content = syntaxFixes.fixTestStructure(content);
    content = syntaxFixes.cleanupFileEndings(content);
    
    return content;
  }
};

// Process test files
function fixTestFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = syntaxFixes.applyAllFixes(content, filePath);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Find and fix all test files
function findAndFixTests() {
  const testDirs = ['tests'];
  let fixedCount = 0;
  
  function walkDir(currentPath) {
    if (!fs.existsSync(currentPath)) return;
    
    const files = fs.readdirSync(currentPath);
    files.forEach(file => {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
        if (fixTestFile(filePath)) {
          fixedCount++;
        }
      }
    });
  }
  
  testDirs.forEach(dir => {
    walkDir(path.join(process.cwd(), dir));
  });
  
  return fixedCount;
}

// Main execution
console.log('🔍 Applying final syntax fixes to all test files...\n');

const fixedCount = findAndFixTests();

console.log(`\n✨ Fixed ${fixedCount} test files`);
console.log('\n🎯 Next: Run npm test to verify all syntax issues are resolved');