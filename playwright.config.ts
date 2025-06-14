import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Enxi ERP E2E tests
 * Comprehensive test setup with parallel execution, screenshots, and video recording
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. */
  reporter: [
    ['html', { outputFolder: 'e2e-test-results/html-report' }],
    ['json', { outputFile: 'e2e-test-results/results.json' }],
    ['junit', { outputFile: 'e2e-test-results/junit.xml' }],
    ['list']
  ],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. */
    trace: 'retain-on-failure',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Navigation timeout */
    navigationTimeout: 30000,
    
    /* Action timeout */
    actionTimeout: 15000,
    
    /* Default timeout for assertions */
    expect: {
      timeout: 10000
    }
  },

  /* Global test timeout */
  timeout: 60000,

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
      teardown: 'cleanup'
    },
    {
      name: 'cleanup',
      testMatch: '**/cleanup.teardown.ts'
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: './e2e/storage-state/admin-state.json'
      },
      dependencies: ['setup'],
      testIgnore: ['**/auth.setup.ts', '**/cleanup.teardown.ts']
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: './e2e/storage-state/admin-state.json'
      },
      dependencies: ['setup'],
      testIgnore: ['**/auth.setup.ts', '**/cleanup.teardown.ts']
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: './e2e/storage-state/admin-state.json'
      },
      dependencies: ['setup'],
      testIgnore: ['**/auth.setup.ts', '**/cleanup.teardown.ts']
    },
    
    /* Mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: './e2e/storage-state/admin-state.json'
      },
      dependencies: ['setup'],
      testIgnore: ['**/auth.setup.ts', '**/cleanup.teardown.ts']
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: './e2e/storage-state/admin-state.json'
      },
      dependencies: ['setup'],
      testIgnore: ['**/auth.setup.ts', '**/cleanup.teardown.ts']
    }
  ],

  /* Output directories */
  outputDir: 'e2e-test-results/artifacts',
  
  /* Web server configuration */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./e2e-test.db'
    }
  }
});