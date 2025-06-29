#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing API Test Syntax Issues...\n');

// Fix patterns for syntax issues
const syntaxFixes = {
  // Fix duplicate closing parentheses
  fixDuplicateParentheses: (content) => {
    // Fix patterns like }))\n}))
    content = content.replace(/\}\)\)\n\}\)\)/g, '}))\n');
    
    // Fix patterns like }))\n})) at end of mocks
    content = content.replace(/\}\)\)\n\}\)\)\n\n/g, '}))\n\n');
    
    // Fix })) at the beginning of lines after jest.mock
    content = content.replace(/^\}\)\)\n/gm, '');
    
    return content;
  },
  
  // Fix duplicate mock definitions
  fixDuplicateMocks: (content) => {
    // Remove duplicate service mocks
    const servicePattern = /jest\.mock\('(@\/lib\/services\/[^']+)'[^}]+\}\)\)\n*jest\.mock\(\1[^}]+\}\)\)/gs;
    content = content.replace(servicePattern, (match, servicePath) => {
      // Keep only the first mock
      const firstMock = match.split('jest.mock(')[1];
      return 'jest.mock(' + firstMock;
    });
    
    return content;
  },
  
  // Fix malformed imports
  fixImports: (content) => {
    // Fix duplicate imports with act
    content = content.replace(/} , act, waitFor } , act, waitFor }/g, ', act, waitFor }');
    
    // Fix missing newlines
    content = content.replace(/\}\)\)import/g, '})\n\nimport');
    
    return content;
  },
  
  // Fix getUserFromRequest mocks
  fixAuthMocks: (content) => {
    // Fix incomplete getUserFromRequest mock
    content = content.replace(
      /jest\.mock\('@\/lib\/utils\/auth', \(\) => \(\{\n No newline at end of file\n  getUserFromRequest:/g,
      "jest.mock('@/lib/utils/auth', () => ({\n  getUserFromRequest:"
    );
    
    return content;
  },
  
  // Fix specific test file issues
  fixSpecificIssues: (content, filePath) => {
    const fileName = path.basename(filePath);
    
    if (fileName === 'leads.test.ts') {
      // Fix the specific syntax error in leads.test.ts
      content = content.replace(
        /jest\.mock\('@\/lib\/services\/lead\.service'.*?\}\)\)\n\}\)\)\n\}\)\)/gs,
        `jest.mock('@/lib/services/lead.service', () => ({
  LeadService: jest.fn().mockImplementation(() => ({
    createLead: jest.fn(),
    getLeads: jest.fn(),
    updateLead: jest.fn(),
    deleteLead: jest.fn(),
    getLeadById: jest.fn()
  }))
}))`
      );
    }
    
    if (fileName === 'auth.test.ts') {
      // Fix the malformed NextResponse mock
      content = content.replace(
        /\n;\n      this\.json = jest\.fn.*?\n    \}\n  \},\n  NextResponse: \{[^}]+\}\n\}\)\)/gs,
        ''
      );
    }
    
    if (fileName === 'quotation-api.test.ts') {
      // Fix duplicate enum declaration
      content = content.replace(
        /enum QuotationStatus \{[\s\S]*?\n\}/g,
        ''
      );
    }
    
    return content;
  },
  
  // Clean up the file
  cleanup: (content) => {
    // Remove "No newline at end of file" comments
    content = content.replace(/\n No newline at end of file/g, '');
    
    // Remove duplicate empty lines
    content = content.replace(/\n{4,}/g, '\n\n\n');
    
    // Ensure file ends with newline
    if (!content.endsWith('\n')) {
      content += '\n';
    }
    
    return content;
  }
};

// Process test files
function fixTestFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const originalContent = content;
    
    // Apply all fixes in order
    content = syntaxFixes.fixDuplicateParentheses(content);
    content = syntaxFixes.fixDuplicateMocks(content);
    content = syntaxFixes.fixImports(content);
    content = syntaxFixes.fixAuthMocks(content);
    content = syntaxFixes.fixSpecificIssues(content, filePath);
    content = syntaxFixes.cleanup(content);
    
    if (content !== originalContent) {
      modified = true;
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

// Find and fix all test files with syntax issues
function findAndFixTests() {
  const testDirs = ['tests/api', 'tests/integration', 'tests/unit'];
  let fixedCount = 0;
  
  testDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) return;
    
    // Recursively find test files
    function walkDir(currentPath) {
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
    
    walkDir(fullPath);
  });
  
  return fixedCount;
}

// Main execution
console.log('🔍 Searching for test files with syntax issues...\n');

const fixedCount = findAndFixTests();

console.log(`\n✨ Fixed ${fixedCount} test files`);
console.log('\n🎯 Next: Run npm test to verify fixes');