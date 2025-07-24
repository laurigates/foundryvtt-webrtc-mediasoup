import { test, expect } from '@playwright/test';

/**
 * Plugin Loading Tests
 * 
 * Tests the basic initialization and loading of the MediaSoup plugin
 * in a mock FoundryVTT environment.
 */

/**
 * Helper function for CI-aware waiting with improved polling and timeout handling
 */
async function waitForClientWithRetry(page, options = {}) {
  const isCI = !!process.env.CI;
  const timeout = options.timeout || (isCI ? 90000 : 30000); // 90s in CI, 30s locally
  const polling = isCI ? 2000 : 500; // Slower polling in CI to reduce resource pressure
  
  return page.waitForFunction(
    () => {
      const hasClient = !!window.MediaSoupVTT_Client;
      const isCorrectType = hasClient && window.MediaSoupVTT_Client.constructor.name === 'MediaSoupVTTClient';
      const hasRequiredMethods = hasClient && typeof window.MediaSoupVTT_Client.updateServerUrl === 'function';
      
      // Log progress in CI for debugging
      if (window.location.search.includes('ci-debug')) {
        console.log(`[CI-Debug] Client check: hasClient=${hasClient}, isCorrectType=${isCorrectType}, hasRequiredMethods=${hasRequiredMethods}`);
      }
      
      return hasClient && isCorrectType && hasRequiredMethods;
    },
    { 
      timeout,
      polling: polling
    }
  );
}

test.describe('MediaSoup Plugin Loading', () => {
  let page;
  
  test.beforeEach(async ({ browser }) => {
    try {
      const isCI = !!process.env.CI;
      const setupTimeout = isCI ? 60000 : 30000; // 60s in CI, 30s locally
      
      page = await browser.newPage();
      
      // Set CI-aware default timeout for mock environment
      page.setDefaultTimeout(setupTimeout);
      
      // Navigate to test sandbox with CI-aware timeout
      await page.goto('/tests/integration/setup/test-sandbox.html', { 
        waitUntil: 'domcontentloaded',
        timeout: setupTimeout 
      });
      
      // Wait for mock environment to initialize with CI-aware timeout
      await page.waitForFunction(() => window.testSandbox && window.game, { 
        timeout: setupTimeout,
        polling: isCI ? 1000 : 500 // Slower polling in CI
      });
      
      // Verify mock environment is ready with CI-aware timeout
      await expect(page.locator('#test-status')).toContainText('Ready for testing', { 
        timeout: setupTimeout 
      });
    } catch (error) {
      console.error('BeforeEach setup failed:', error);
      if (page) {
        await page.close().catch(() => {});
      }
      throw error;
    }
  });
  
  test.afterEach(async () => {
    if (page && !page.isClosed()) {
      try {
        await page.close();
      } catch (error) {
        console.warn('Error closing page:', error.message);
      }
    }
  });
  
  test('should load mock FoundryVTT environment correctly', async () => {
    // Check that mock objects are available
    const mockObjects = await page.evaluate(() => ({
      hasGame: !!window.game,
      hasUI: !!window.ui,
      hasHooks: !!window.Hooks,
      hasJQuery: !!window.$,
      gameVersion: window.game?.version,
      userId: window.game?.userId
    }));
    
    expect(mockObjects.hasGame).toBeTruthy();
    expect(mockObjects.hasUI).toBeTruthy();
    expect(mockObjects.hasHooks).toBeTruthy();
    expect(mockObjects.hasJQuery).toBeTruthy();
    expect(mockObjects.gameVersion).toBe('13.330');
    expect(mockObjects.userId).toBe('test-user-123');
  });
  
  test('should load mock mediasoup-client library', async () => {
    // Initially should not be loaded (before plugin initialization)
    const initialState = await page.evaluate(() => !!window.mediasoupClient);
    expect(initialState).toBeFalsy();
    
    // Click initialize plugin - this should load the mock mediasoup-client
    await page.click('#btn-init-plugin');
    
    // Wait for mock library to be exposed with CI-aware timeout
    const isCI = !!process.env.CI;
    await page.waitForFunction(() => window.mediasoupClient, { 
      timeout: isCI ? 30000 : 10000,
      polling: isCI ? 1000 : 500
    });
    
    // Wait a bit for initialization to complete
    await page.waitForTimeout(1000);
    
    // Check that mock library is now available
    const mediasoupInfo = await page.evaluate(() => ({
      hasMediaSoupClient: !!window.mediasoupClient,
      version: window.mediasoupClient?.version,
      exports: window.mediasoupClient ? Object.keys(window.mediasoupClient) : [],
      typeofDevice: typeof window.mediasoupClient?.Device
    }));
    
    expect(mediasoupInfo.hasMediaSoupClient).toBeTruthy();
    expect(mediasoupInfo.version).toBe('3.11.0');
    expect(mediasoupInfo.exports).toContain('Device');
    expect(mediasoupInfo.exports).toContain('detectDevice');
    expect(mediasoupInfo.typeofDevice).toBe('function');
    
    // Check basic mock mediasoup-client functionality
    const deviceTest = await page.evaluate(() => {
      try {
        const device = new window.mediasoupClient.Device();
        return { hasDevice: true, loaded: device.loaded, deviceType: typeof device };
      } catch (error) {
        return { hasDevice: false, error: error.message };
      }
    });
    
    expect(deviceTest.hasDevice).toBeTruthy();
    expect(deviceTest.loaded).toBeFalsy(); // Should not be loaded initially
    expect(deviceTest.deviceType).toBe('object');
  });
  
  test('should initialize plugin successfully', async () => {
    // Monitor console logs and errors for debugging
    const logs = [];
    const errors = [];
    
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
      errors.push(err.message);
    });
    
    // Click the initialize plugin button
    await page.click('#btn-init-plugin');
    
    // Wait for mediasoup-client mock to be loaded first with CI-aware timeout
    const isCI = !!process.env.CI;
    await page.waitForFunction(() => window.mediasoupClient, { 
      timeout: isCI ? 20000 : 5000,
      polling: isCI ? 1000 : 500
    });
    
    // Add debugging information about what's happening
    const debugInfo = await page.evaluate(() => {
      return {
        hasMediasoupClient: !!window.mediasoupClient,
        hasGame: !!window.game,
        hasUI: !!window.ui,
        hasHooks: !!window.Hooks,
        hookCalls: window.testHookCalls || [],
        mediasoupExports: window.mediasoupClient ? Object.keys(window.mediasoupClient) : [],
        anyMediaSoupVars: Object.keys(window).filter(k => k.includes('MediaSoup'))
      };
    });
    
    console.log('Debug info before waiting for client:', debugInfo);
    
    // Use the improved CI-aware waiting function
    try {
      await waitForClientWithRetry(page);
    } catch (timeoutError) {
      // If timeout, gather detailed debug information
      const finalDebugInfo = await page.evaluate(() => ({
        logs: window.testLogs || [],
        errors: window.testErrors || [],
        hasClient: !!window.MediaSoupVTT_Client,
        clientType: window.MediaSoupVTT_Client?.constructor?.name,
        isInitialized: window.isInitialized,
        allGlobals: Object.keys(window).filter(k => k.startsWith('MediaSoup') || k.includes('mediasoup')),
        hookCalls: window.testHookCalls || []
      }));
      
      console.log('=== TIMEOUT DEBUG INFO ===');
      console.log('Console logs:', logs.slice(-20)); // Last 20 logs
      console.log('Page errors:', errors);
      console.log('Final debug info:', finalDebugInfo);
      console.log('==========================');
      
      throw timeoutError;
    }
    
    // Wait a bit more for status update
    await page.waitForTimeout(500);
    
    // Check plugin status with CI-aware timeout
    const statusTimeout = process.env.CI ? 30000 : 10000;
    await expect(page.locator('#test-status')).toContainText('Plugin initialized', { timeout: statusTimeout });
    
    // Verify client instance is created with more detailed checks
    const clientInfo = await page.evaluate(() => ({
      hasClient: !!window.MediaSoupVTT_Client,
      constructorName: window.MediaSoupVTT_Client?.constructor?.name,
      isConnected: window.MediaSoupVTT_Client?.isConnected,
      isConnecting: window.MediaSoupVTT_Client?.isConnecting,
      serverUrl: window.MediaSoupVTT_Client?.serverUrl,
      hasUpdateMethod: typeof window.MediaSoupVTT_Client?.updateServerUrl === 'function',
      deviceProperty: window.MediaSoupVTT_Client?.device
    }));
    
    expect(clientInfo.hasClient).toBeTruthy();
    expect(clientInfo.constructorName).toBe('MediaSoupVTTClient');
    expect(clientInfo.isConnected).toBeFalsy();
    expect(clientInfo.isConnecting).toBeFalsy();
    expect(clientInfo.hasUpdateMethod).toBeTruthy();
    expect(clientInfo.deviceProperty).toBeNull(); // Should be null initially
  });
  
  test('should register settings correctly', async () => {
    // Initialize plugin
    await page.click('#btn-init-plugin');
    await waitForClientWithRetry(page);
    
    // Get registered settings
    const settings = await page.evaluate(() => {
      return window.game.settings.getAllSettings().filter(setting => 
        setting.key.startsWith('mediasoup-vtt.')
      );
    });
    
    // Check that expected settings are registered
    const settingKeys = settings.map(s => s.key);
    expect(settingKeys).toContain('mediasoup-vtt.debugLogging');
    expect(settingKeys).toContain('mediasoup-vtt.mediaSoupServerUrl');
    expect(settingKeys).toContain('mediasoup-vtt.autoConnect');
    expect(settingKeys).toContain('mediasoup-vtt.defaultAudioDevice');
    expect(settingKeys).toContain('mediasoup-vtt.defaultVideoDevice');
    
    // Verify setting types and defaults
    // Note: In browser test environments, function constructors can't cross boundaries
    // so we check for the presence of type and correct default values instead
    const debugSetting = settings.find(s => s.key === 'mediasoup-vtt.debugLogging');
    expect(debugSetting).toBeDefined();
    expect(debugSetting.type).toBeDefined(); // Type should exist 
    expect(debugSetting.value).toBe(false); // Boolean default
    
    const urlSetting = settings.find(s => s.key === 'mediasoup-vtt.mediaSoupServerUrl');
    expect(urlSetting).toBeDefined();
    expect(urlSetting.type).toBeDefined(); // Type should exist
    expect(urlSetting.value).toBe(''); // String default
  });
  
  test('should register settings menu correctly', async () => {
    // Initialize plugin
    await page.click('#btn-init-plugin');
    await waitForClientWithRetry(page);
    
    // Get registered menus
    const menus = await page.evaluate(() => {
      return window.game.settings.getAllMenus().filter(menu => 
        menu.key.startsWith('mediasoup-vtt.')
      );
    });
    
    // Check that config dialog menu is registered
    expect(menus).toHaveLength(1);
    expect(menus[0].key).toBe('mediasoup-vtt.configDialog');
    expect(menus[0].name).toBe('MediaSoup Server Configuration');
    expect(menus[0].type).toBeDefined();
  });
  
  test('should handle lifecycle hooks correctly', async () => {
    // Track hook calls
    await page.evaluate(() => {
      window.testHookCalls = [];
      const originalCall = window.Hooks.call;
      window.Hooks.call = function(event, ...args) {
        window.testHookCalls.push({ event, args: args.length });
        return originalCall.call(this, event, ...args);
      };
    });
    
    // Initialize plugin
    await page.click('#btn-init-plugin');
    await waitForClientWithRetry(page);
    
    // Wait for lifecycle to complete
    await page.waitForTimeout(1000);
    
    // Check that expected hooks were called
    const hookCalls = await page.evaluate(() => window.testHookCalls);
    const hookEvents = hookCalls.map(call => call.event);
    
    expect(hookEvents).toContain('init');
    expect(hookEvents).toContain('ready');
  });
  
  test('should show appropriate notifications', async () => {
    // Clear any existing notifications
    await page.evaluate(() => window.ui.notifications.clear());
    
    // Initialize plugin
    await page.click('#btn-init-plugin');
    await waitForClientWithRetry(page);
    
    // Wait for notifications
    await page.waitForTimeout(2000);
    
    // Check notifications
    const notifications = await page.evaluate(() => 
      window.ui.notifications.getAll()
    );
    
    // Should have some notifications (at least about mediasoup-client being available)
    expect(notifications.length).toBeGreaterThan(0);
    
    // Look for specific expected notifications
    const messages = notifications.map(n => n.message);
    expect(messages.some(msg => msg.includes('MediaSoupVTT'))).toBeTruthy();
  });
  
  test('should log initialization messages', async () => {
    // Monitor console logs
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'info') {
        logs.push(msg.text());
      }
    });
    
    // Initialize plugin
    await page.click('#btn-init-plugin');
    await waitForClientWithRetry(page);
    
    // Wait for logs
    await page.waitForTimeout(1000);
    
    // Check for expected log messages
    const logText = logs.join(' ');
    expect(logText).toContain('MediaSoupVTT');
    expect(logText).toContain('Initializing');
  });
  
  test('should handle corrupted plugin bundle gracefully', async () => {
    // Mock the plugin bundle to fail loading
    await page.route('**/mediasoup-vtt-test.js', route => {
      route.abort('failed');
    });
    
    // Initialize plugin
    await page.click('#btn-init-plugin');
    
    // Should show error status due to loading failure with CI-aware timeout
    const errorTimeout = process.env.CI ? 30000 : 10000;
    await expect(page.locator('#test-status')).toContainText('Plugin load failed', { timeout: errorTimeout });
    
    // Should have logged the error
    const logEntries = await page.locator('.test-log .log-entry.error').count();
    expect(logEntries).toBeGreaterThan(0);
  });
});