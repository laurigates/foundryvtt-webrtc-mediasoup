/**
 * MediaSoupVTT - Main entry point for FoundryVTT MediaSoup Plugin
 * 
 * A WebRTC audio/video communication module for FoundryVTT using MediaSoup SFU server
 */

import { MODULE_ID, MODULE_TITLE, SETTING_AUTO_CONNECT } from './constants/index.js';
import { log } from './utils/logger.js';
import { MediaSoupVTTClient } from './client/MediaSoupVTTClient.js';
import { registerSettings, setupSettingsHooks } from './ui/settings.js';
import { setupSceneControls } from './ui/sceneControls.js';
import { setupPlayerListHooks } from './ui/playerList.js';
import { injectStyles } from './ui/styles.js';

// Global instance of our client
let mediaSoupVTTClientInstance = null;

// +-------------------------------------------------------------------+
// |                        FOUNDRY VTT HOOKS                          |
// +-------------------------------------------------------------------+

Hooks.once('init', () => {
    log('Initializing MediaSoupVTT Plugin...', 'info', true);

    // Register all module settings
    registerSettings();

    // Setup settings-related hooks
    setupSettingsHooks();

    // Inject CSS styles
    injectStyles();
});

Hooks.once('ready', async () => {
    log('Foundry VTT is ready. MediaSoupVTT is active.', 'info', true);
    
    // Wait for mediasoup-client to be available (it might still be loading)
    let retryCount = 0;
    const maxRetries = 10;
    
    while (!window.mediasoupClient && retryCount < maxRetries) {
        log(`Waiting for mediasoup-client library... (attempt ${retryCount + 1}/${maxRetries})`, 'info');
        await new Promise(resolve => setTimeout(resolve, 500));
        retryCount++;
    }
    
    if (!window.mediasoupClient) {
        log('mediasoup-client library was not found after waiting. Attempting to load from CDN...', 'warn');
        
        try {
            // Try to load mediasoup-client dynamically
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/mediasoup-client@3.7.6/lib/mediasoup-client.js';
                script.onload = () => {
                    log('mediasoup-client loaded successfully from CDN', 'info');
                    resolve();
                };
                script.onerror = (error) => {
                    log('Failed to load mediasoup-client from CDN', 'error');
                    reject(error);
                };
                document.head.appendChild(script);
            });
            
            // Wait a bit for the library to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            log('Failed to dynamically load mediasoup-client', 'error');
        }
    }
    
    if (!window.mediasoupClient) {
        ui.notifications.error(`${MODULE_TITLE}: mediasoup-client library was not found. Plugin will not function. Please check your internet connection or try reloading.`, { permanent: true });
        return;
    }
    
    log('mediasoup-client library confirmed available', 'info');

    // Create global client instance
    mediaSoupVTTClientInstance = new MediaSoupVTTClient();
    window.MediaSoupVTT_Client = mediaSoupVTTClientInstance;

    // Setup UI hooks
    setupSceneControls();
    setupPlayerListHooks();

    // Handle auto-connection
    const autoConnect = game.settings.get(MODULE_ID, SETTING_AUTO_CONNECT);
    if (autoConnect && mediaSoupVTTClientInstance.serverUrl) {
        log('Auto-connecting to MediaSoup server...');
        try { 
            await mediaSoupVTTClientInstance.connect(); 
        } catch (err) { 
            log(`Auto-connect initial attempt failed: ${err.message}`, 'error'); 
        }
    } else if (autoConnect && !mediaSoupVTTClientInstance.serverUrl) {
        log('Auto-connect enabled, but server URL is not set. Skipping connection.', 'warn');
        ui.notifications.warn(`${MODULE_TITLE}: Auto-connect is on, but server URL is not set.`);
    } else {
        // Try to populate device settings if permissions are already granted
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const micPerm = await navigator.permissions.query({name: 'microphone'});
                const camPerm = await navigator.permissions.query({name: 'camera'});
                if (micPerm.state === 'granted' || camPerm.state === 'granted') {
                    await mediaSoupVTTClientInstance._populateDeviceSettings();
                }
            } catch (e) { 
                log("Error querying permissions on ready: " + e.message, "warn"); 
            }
        }
    }
});

log('MediaSoupVTT Plugin script loaded.');