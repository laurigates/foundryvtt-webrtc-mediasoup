import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for MediaSoup FoundryVTT Plugin Integration Tests
 * 
 * This configuration enables WebRTC testing with proper browser flags
 * and sets up the testing environment for the plugin.
 */
export default defineConfig({
  testDir: './tests/integration/specs',
  
  /* Run tests sequentially to avoid browser crashes */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  
  /* Use single worker to prevent browser instability */
  workers: 1,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [
    ['list'],
    ['github'],
    ['json', { outputFile: 'tests/results/results.json' }],
    ['junit', { outputFile: 'tests/results/junit.xml' }]
  ] : [
    ['html', { outputFolder: 'tests/results/html-report' }],
    ['json', { outputFile: 'tests/results/results.json' }],
    ['junit', { outputFile: 'tests/results/junit.xml' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Capture video on failure */
    video: 'retain-on-failure',
    
    /* Action timeout - increase for CI environment */
    actionTimeout: process.env.CI ? 60000 : 30000, // 60s in CI, 30s locally
    
    /* Navigation timeout - increase for CI environment */
    navigationTimeout: process.env.CI ? 60000 : 30000, // 60s in CI, 30s locally
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-webrtc',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome flags for testing with CI-specific optimizations
        launchOptions: {
          args: [
            // Essential testing flags
            '--disable-web-security',
            '--allow-file-access-from-files',
            // Enable fake media devices for testing
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--allow-running-insecure-content',
            // CI environment optimizations
            ...(process.env.CI ? [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
              '--disable-renderer-backgrounding',
              '--disable-features=TranslateUI',
              '--disable-ipc-flooding-protection',
              '--memory-pressure-off',
              '--max_old_space_size=4096',
            ] : []),
          ],
        },
        
        // Grant permissions for media devices
        permissions: ['camera', 'microphone'],
        
        // Mock geolocation if needed
        geolocation: { latitude: 59.95, longitude: 30.31667 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
      },
    },
    
    {
      name: 'firefox-webrtc',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
          }
        },
        // Firefox doesn't support camera/microphone permissions in this context
        // Using firefoxUserPrefs instead to handle media access
      },
    },
  ],

  /* Global setup and teardown */
  globalSetup: './tests/integration/setup/global-setup.js',
  globalTeardown: './tests/integration/setup/global-teardown.js',
  
  /* Test timeout - increase for CI environment */
  timeout: process.env.CI ? 120000 : 60000, // 2 minutes in CI, 1 minute locally
  
  /* Expect timeout - increase for CI environment */
  expect: {
    timeout: process.env.CI ? 30000 : 15000, // 30s in CI, 15s locally
  },
  
  /* Test file patterns */
  testMatch: [
    'tests/integration/specs/**/*.spec.js',
    'tests/integration/specs/**/*.test.js'
  ],
  
  /* Ignore certain files */
  testIgnore: [
    'tests/integration/fixtures/**',
    'tests/integration/setup/**'
  ],
  
  /* Web server configuration for serving test files */
  webServer: {
    command: 'python3 -m http.server 3000',
    port: 3000,
    cwd: '.',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  }
});