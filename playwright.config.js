import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for MediaSoup FoundryVTT Plugin Integration Tests
 * 
 * This configuration enables WebRTC testing with proper browser flags
 * and sets up the testing environment for the plugin.
 */
export default defineConfig({
  testDir: './tests/integration/specs',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
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
    
    /* Global timeout for each test */
    actionTimeout: 30000,
    
    /* Navigation timeout */
    navigationTimeout: 60000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-webrtc',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome flags for WebRTC testing
        launchOptions: {
          args: [
            // WebRTC testing flags
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--use-file-for-fake-video-capture=tests/integration/fixtures/test-video.y4m',
            '--use-file-for-fake-audio-capture=tests/integration/fixtures/test-audio.wav',
            
            // Allow fake media streams
            '--allow-file-access-from-files',
            '--disable-web-security',
            '--allow-running-insecure-content',
            
            // Media permissions
            '--auto-accept-camera-and-microphone-capture',
            '--auto-select-desktop-capture-source=Test',
            
            // Disable security features for testing
            '--disable-features=VizDisplayCompositor',
            '--disable-backgrounding-occluded-windows',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-ipc-flooding-protection',
            
            // Enable WebRTC debug logging (optional)
            process.env.WEBRTC_DEBUG ? '--enable-logging=stderr --log-level=0 --vmodule=*/webrtc/*=1' : '',
          ].filter(Boolean),
          
          // Additional Chrome preferences for WebRTC
          ignoreDefaultArgs: ['--mute-audio'],
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
          // Firefox preferences for WebRTC testing
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
            'media.gmp-manager.updateEnabled': false,
            'media.peerconnection.ice.loopback': true,
            'media.peerconnection.use_document_iceservers': false,
            'media.peerconnection.identity.timeout': 1000,
            'media.peerconnection.ice.tcp': false,
            'media.webrtc.debug.trace_mask': 65535,
            'media.webrtc.debug.multi_log': true,
            'logging.config.media_element': 5,
            'dom.disable_beforeunload': true,
          }
        },
        permissions: ['camera', 'microphone'],
      },
    },
    
    // Test on WebKit with limited WebRTC support
    {
      name: 'webkit-webrtc',
      use: { 
        ...devices['Desktop Safari'],
        permissions: ['camera', 'microphone'],
      },
    },
    
    // Mobile testing (optional)
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--auto-accept-camera-and-microphone-capture',
          ]
        },
        permissions: ['camera', 'microphone'],
      },
    },
  ],

  /* Global setup and teardown */
  globalSetup: './tests/integration/setup/global-setup.js',
  globalTeardown: './tests/integration/setup/global-teardown.js',
  
  /* Test timeout */
  timeout: 120000, // 2 minutes per test
  
  /* Expect timeout */
  expect: {
    timeout: 10000,
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