const fs = require('fs');
const path = require('path');

const e2eDir = path.join(process.cwd(), 'e2e');

// Find all E2E test files
function findE2ETestFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && item !== 'storage-state') {
      files.push(...findE2ETestFiles(fullPath));
    } else if (item.endsWith('.spec.ts') || item.endsWith('.spec.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix E2E test issues
function fixE2ETest(content, fileName) {
  let fixed = content;
  
  // 1. Ensure proper imports
  if (!fixed.includes("import { test, expect }")) {
    fixed = "import { test, expect } from '@playwright/test';\n" + fixed;
  }
  
  // 2. Fix authentication setup - use storage state instead of manual login in each test
  if (fixed.includes('page.goto') && fixed.includes('login') && !fileName.includes('auth')) {
    // Add use of storage state if not present
    if (!fixed.includes('storageState:')) {
      fixed = fixed.replace(/test\(/g, 'test.use({ storageState: "./e2e/storage-state/admin-state.json" });\n\ntest(');
    }
  }
  
  // 3. Fix selector issues - update to modern Playwright selectors
  fixed = fixed.replace(/page\.locator\(['"]text=/g, 'page.getByText(');
  fixed = fixed.replace(/page\.locator\(['"]role=/g, 'page.getByRole(');
  fixed = fixed.replace(/page\.locator\(['"]placeholder=/g, 'page.getByPlaceholder(');
  
  // 4. Fix wait patterns
  fixed = fixed.replace(/page\.waitForSelector\(/g, 'await page.waitForSelector(');
  fixed = fixed.replace(/page\.waitForLoadState\(/g, 'await page.waitForLoadState(');
  
  // 5. Ensure test structure
  fixed = fixed.replace(/describe\s*\(/g, 'test.describe(');
  
  // 6. Fix timeout issues - add proper timeouts
  fixed = fixed.replace(/waitForSelector\s*\([^,)]+\)/g, (match) => {
    if (!match.includes('timeout')) {
      return match.replace(')', ', { timeout: 30000 })');
    }
    return match;
  });
  
  // 7. Fix API response waiting
  fixed = fixed.replace(/page\.waitForResponse\(/g, 'await page.waitForResponse(');
  
  // 8. Add proper error handling for navigation
  if (fixed.includes('page.goto') && !fixed.includes('waitUntil')) {
    fixed = fixed.replace(/page\.goto\(([^)]+)\)/g, 'await page.goto($1, { waitUntil: "networkidle" })');
  }
  
  return fixed;
}

// Process file
async function processFile(filePath) {
  console.log(`Processing ${path.relative(process.cwd(), filePath)}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const fileName = path.basename(filePath);
    
    content = fixE2ETest(content, fileName);
    
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

// Create necessary directories
function ensureDirectories() {
  const dirs = [
    'e2e/storage-state',
    'e2e-test-results',
    'e2e-test-results/html-report',
    'e2e-test-results/artifacts'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
}

// Main
async function main() {
  console.log('Setting up E2E tests...\n');
  
  // Ensure directories exist
  ensureDirectories();
  
  // Find and fix test files
  const testFiles = findE2ETestFiles(e2eDir);
  console.log(`\nFound ${testFiles.length} E2E test files\n`);
  
  let fixedCount = 0;
  
  for (const file of testFiles) {
    if (await processFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✓ Fixed ${fixedCount} files`);
  console.log('\nE2E test setup complete!');
}

main().catch(console.error);