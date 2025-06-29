#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Component Tests V2...\n');

// Enhanced component test fix patterns
const componentTestFixes = {
  // Clean up malformed code first
  cleanupMalformed: (content) => {
    // Fix multiple nested act calls
    content = content.replace(/await act\(async \(\) => \{\s*await act\(async \(\) => \{[^}]+}\s*}\)/g, 
      (match) => {
        // Extract the inner content
        const innerMatch = match.match(/fireEvent\.[^}]+/);
        if (innerMatch) {
          return `await act(async () => { ${innerMatch[0]} })`;
        }
        return match;
      }
    );
    
    // Fix broken closures
    content = content.replace(/}\)\s*}\)/g, '})');
    content = content.replace(/}\s*}\)\s*;/g, '});');
    content = content.replace(/}\)\)\s*\n/g, '})\n');
    
    // Fix malformed fetch mocks
    content = content.replace(/\)\s*}\s*\n\s*}/g, ')\n          })\n        }');
    
    return content;
  },
  
  // Fix imports
  fixImports: (content) => {
    // Check if fireEvent is used
    const usesFireEvent = content.includes('fireEvent');
    
    if (usesFireEvent) {
      // Replace testing library imports
      content = content.replace(
        /import\s*{\s*render[^}]*}\s*from\s*['"]@testing-library\/react['"]/g,
        "import { render, screen, waitFor, act, fireEvent } from '@/tests/helpers/component-test-utils'"
      );
    } else {
      content = content.replace(
        /import\s*{\s*render[^}]*}\s*from\s*['"]@testing-library\/react['"]/g,
        "import { render, screen, waitFor, act } from '@/tests/helpers/component-test-utils'"
      );
    }
    
    // Remove duplicate act imports
    content = content.replace(/import\s*{\s*act\s*}\s*from\s*['"]react-dom\/test-utils['"]/g, '');
    
    return content;
  },
  
  // Fix async patterns
  fixAsyncPatterns: (content) => {
    // Fix fireEvent calls to use act properly
    content = content.replace(
      /fireEvent\.(click|change|submit|focus|blur)\(([^)]+)\)/g,
      (match, method, args) => {
        // Check if already wrapped in act
        const lines = content.split('\n');
        const matchIndex = content.indexOf(match);
        const lineStart = content.lastIndexOf('\n', matchIndex);
        const lineEnd = content.indexOf('\n', matchIndex);
        const currentLine = content.substring(lineStart, lineEnd);
        
        if (currentLine.includes('await act')) {
          return match; // Already wrapped
        }
        
        return `await act(async () => { fireEvent.${method}(${args}) })`;
      }
    );
    
    // Add async to test functions that need it
    content = content.replace(
      /it\(['"`]([^'"`]+)['"`],\s*\(\)\s*=>\s*{/g,
      (match, testName) => {
        const testStart = content.indexOf(match);
        const testEnd = content.indexOf('\n  })', testStart);
        const testBody = content.substring(testStart, testEnd);
        
        if (testBody.includes('await') || testBody.includes('waitFor')) {
          return `it('${testName}', async () => {`;
        }
        return match;
      }
    );
    
    return content;
  },
  
  // Fix render patterns
  fixRenderPatterns: (content) => {
    // Fix component rendering
    content = content.replace(/render\(<([^/>]+)\s*\/\s*>/g, 'render(<$1 />');
    content = content.replace(/render\(<([^>]+)>\s*\)/g, 'render(<$1 />)');
    
    return content;
  },
  
  // Fix waitFor patterns
  fixWaitForPatterns: (content) => {
    // Fix incomplete waitFor blocks
    content = content.replace(
      /await waitFor\(\(\) => {\s*expect/g,
      'await waitFor(() => {\n        expect'
    );
    
    // Fix waitFor without proper closure
    const lines = content.split('\n');
    let inWaitFor = false;
    let braceCount = 0;
    const fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      if (line.includes('await waitFor(() => {')) {
        inWaitFor = true;
        braceCount = 1;
      } else if (inWaitFor) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        if (braceCount === 0) {
          inWaitFor = false;
          if (!line.includes('})')) {
            line += '      })';
          }
        }
      }
      
      fixedLines.push(line);
    }
    
    return fixedLines.join('\n');
  },
  
  // Fix mock setup
  addMockSetup: (content) => {
    // Add fetch mock if needed
    if (content.includes('fetch') && !content.includes('global.fetch')) {
      const mockSetup = `
// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({}),
    status: 200,
  })
);
`;
      // Add after imports
      const lastImportIndex = content.lastIndexOf('import');
      const nextLineIndex = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, nextLineIndex + 1) + mockSetup + content.slice(nextLineIndex + 1);
    }
    
    // Fix router mock setup
    if (content.includes('mockPush') && !content.includes('const mockPush')) {
      content = content.replace(
        /(const mockUseAuth[^;]+;\n)/,
        `$1const mockPush = jest.fn();\nconst mockRefresh = jest.fn();\n`
      );
    }
    
    return content;
  },
  
  // Final cleanup
  finalCleanup: (content) => {
    // Remove extra parentheses
    content = content.replace(/\)\)\)/g, '))');
    
    // Fix spacing issues
    content = content.replace(/\n{4,}/g, '\n\n\n');
    
    // Ensure proper file ending
    if (!content.endsWith('\n')) {
      content += '\n';
    }
    
    return content;
  }
};

// Process component test file
function fixComponentTest(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Apply fixes in specific order
    content = componentTestFixes.cleanupMalformed(content);
    content = componentTestFixes.fixImports(content);
    content = componentTestFixes.fixAsyncPatterns(content);
    content = componentTestFixes.fixRenderPatterns(content);
    content = componentTestFixes.fixWaitForPatterns(content);
    content = componentTestFixes.addMockSetup(content);
    content = componentTestFixes.finalCleanup(content);
    
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

// Find and fix all component tests
function findAndFixComponentTests() {
  const testDirs = ['tests/components', 'tests/pages'];
  let fixedCount = 0;
  
  function walkDir(currentPath) {
    if (!fs.existsSync(currentPath)) return;
    
    const files = fs.readdirSync(currentPath);
    files.forEach(file => {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.test.tsx') || file.endsWith('.test.jsx')) {
        if (fixComponentTest(filePath)) {
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
console.log('🔍 Applying enhanced fixes to component tests...\n');

const fixedCount = findAndFixComponentTests();

console.log(`\n✨ Fixed ${fixedCount} component test files`);
console.log('\n🎯 Next: Run npm test -- tests/components to verify fixes');