#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Component Tests...\n');

// Component test fix patterns
const componentTestFixes = {
  // Fix imports to use enhanced test utils
  fixImports: (content) => {
    // Replace old testing library imports with our enhanced version
    content = content.replace(
      /import\s*{\s*render[^}]*}\s*from\s*['"]@testing-library\/react['"]/g,
      "import { render, screen, waitFor, act } from '@/tests/helpers/component-test-utils'"
    );
    
    // Add user event import if missing
    if (!content.includes('userEvent') && content.includes('fireEvent')) {
      content = content.replace(
        /import\s*{([^}]+fireEvent[^}]*)}\s*from\s*['"]@\/tests\/helpers\/component-test-utils['"]/g,
        "import { $1 } from '@/tests/helpers/component-test-utils'"
      );
    }
    
    return content;
  },
  
  // Fix async handling in tests
  fixAsyncHandling: (content) => {
    // Wrap fireEvent calls in act
    content = content.replace(
      /fireEvent\.(click|change|submit|focus|blur)\(/g,
      'await act(async () => { fireEvent.$1('
    );
    
    // Close the act wrapper
    content = content.replace(
      /(await act\(async \(\) => { fireEvent\.[^(]+\([^)]+\))/g,
      '$1 })'
    );
    
    // Fix standalone fireEvent calls
    content = content.replace(
      /^\s*fireEvent\.(click|change|submit|focus|blur)\(/gm,
      '    await act(async () => { fireEvent.$1('
    );
    
    // Add async to test functions that use await
    content = content.replace(
      /it\(['"]([^'"]+)['"],\s*\(\)\s*=>\s*{/g,
      (match, testName) => {
        // Check if the test body contains await
        const testEndIndex = content.indexOf('});', content.indexOf(match));
        const testBody = content.substring(content.indexOf(match), testEndIndex);
        if (testBody.includes('await') || testBody.includes('waitFor')) {
          return `it('${testName}', async () => {`;
        }
        return match;
      }
    );
    
    return content;
  },
  
  // Fix provider usage
  fixProviders: (content) => {
    // Remove manual provider wrapping
    content = content.replace(
      /<(QueryClientProvider|SessionProvider)[^>]*>[\s\S]*?<\/\1>/g,
      (match) => {
        if (match.includes('render(')) {
          return match; // Keep if it's part of render
        }
        return '{children}'; // Replace with just children
      }
    );
    
    // Fix render calls to use options
    content = content.replace(
      /render\(\s*<([^>]+)>\s*\)/g,
      'render(<$1 />)'
    );
    
    return content;
  },
  
  // Fix mock setup
  fixMockSetup: (content) => {
    // Add proper fetch mock if missing
    if (!content.includes('global.fetch') && content.includes('fetch')) {
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
      content = content.replace(
        /(import[^;]+component-test-utils[^;]+;)/,
        '$1\n' + mockSetup
      );
    }
    
    // Fix useRouter mock
    if (content.includes('useRouter') && !content.includes('mockPush')) {
      const routerMock = `
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
};
(useRouter as jest.Mock).mockReturnValue(mockRouter);
`;
      content = content.replace(
        /beforeEach\(\(\)\s*=>\s*{/,
        'beforeEach(() => {\n' + routerMock
      );
    }
    
    return content;
  },
  
  // Fix waitFor usage
  fixWaitFor: (content) => {
    // Fix waitFor with proper expect inside
    content = content.replace(
      /await waitFor\(\(\)\s*=>\s*{?\s*expect/g,
      'await waitFor(() => {\n      expect'
    );
    
    // Close waitFor properly
    content = content.replace(
      /(await waitFor\(\(\) => {\n\s*expect[^}]+)$/gm,
      '$1\n    })'
    );
    
    return content;
  },
  
  // Fix specific component test patterns
  fixComponentPatterns: (content) => {
    // Fix form submission patterns
    content = content.replace(
      /const form = screen\.getByRole\('form'\);[\s\n]*fireEvent\.submit\(form\);/g,
      `const submitButton = screen.getByRole('button', { name: /submit/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });`
    );
    
    // Fix select element changes
    content = content.replace(
      /fireEvent\.change\(([^,]+),\s*{\s*target:\s*{\s*value:\s*['"]([^'"]+)['"]\s*}\s*}\)/g,
      'await act(async () => { fireEvent.change($1, { target: { value: "$2" } }) })'
    );
    
    return content;
  },
  
  // Clean up the file
  cleanup: (content) => {
    // Remove duplicate act imports
    content = content.replace(/import\s*{\s*act\s*}\s*from\s*['"]react-dom\/test-utils['"];?\n/g, '');
    
    // Fix malformed act calls
    content = content.replace(/}\s*}\)\s*;/g, '});');
    
    // Remove extra closing braces
    content = content.replace(/}\)\s*}\)/g, '})');
    
    return content;
  }
};

// Process component test files
function fixComponentTest(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip if already fixed
    if (content.includes('// COMPONENT TEST FIXED')) {
      return false;
    }
    
    // Apply fixes in order
    content = componentTestFixes.fixImports(content);
    content = componentTestFixes.fixAsyncHandling(content);
    content = componentTestFixes.fixProviders(content);
    content = componentTestFixes.fixMockSetup(content);
    content = componentTestFixes.fixWaitFor(content);
    content = componentTestFixes.fixComponentPatterns(content);
    content = componentTestFixes.cleanup(content);
    
    // Add fixed marker
    if (content !== originalContent) {
      content = '// COMPONENT TEST FIXED\n' + content;
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
console.log('🔍 Searching for component tests to fix...\n');

const fixedCount = findAndFixComponentTests();

console.log(`\n✨ Fixed ${fixedCount} component test files`);
console.log('\n🎯 Next: Run npm test to verify component test fixes');