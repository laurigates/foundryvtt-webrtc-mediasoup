/**
 * MediaSoupVTT - Main entry point for FoundryVTT MediaSoup Plugin
 * 
 * A WebRTC audio/video communication module for FoundryVTT using MediaSoup SFU server
 */

import mediasoupClient from 'mediasoup-client';
import { MODULE_ID, MODULE_TITLE, SETTING_AUTO_CONNECT } from './constants/index.js';
import { log } from './utils/logger.js';
import { MediaSoupVTTClient } from './client/MediaSoupVTTClient.js';
import { registerSettings, setupSettingsHooks } from './ui/settings.js';
import { setupSceneControls } from './ui/sceneControls.js';
import { setupPlayerListHooks } from './ui/playerList.js';
import { injectStyles } from './ui/styles.js';

// Expose mediasoup-client to global scope for FoundryVTT compatibility
window.mediasoupClient = mediasoupClient;

// Debug: Log mediasoup-client availability immediately
console.log('MediaSoupVTT: mediasoup-client assigned to window:', {
    available: !!window.mediasoupClient,
    version: window.mediasoupClient?.version,
    hasDevice: !!window.mediasoupClient?.Device,
    exports: window.mediasoupClient ? Object.keys(window.mediasoupClient) : []
});

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
    
    // mediasoup-client should now be bundled with the plugin
    if (!window.mediasoupClient) {
        ui.notifications.error(`${MODULE_TITLE}: mediasoup-client library was not found. Plugin bundle may be corrupted.`, { permanent: true });
        log('mediasoup-client library not found. This should not happen with bundled version.', 'error');
        return;
    }
    
    log('mediasoup-client library is available', 'info');

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