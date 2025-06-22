/**
 * Settings registration and management for MediaSoupVTT
 */

import { 
    MODULE_ID, MODULE_TITLE,
    SETTING_DEBUG_LOGGING, SETTING_MEDIASOUP_URL, SETTING_AUTO_CONNECT,
    SETTING_DEFAULT_AUDIO_DEVICE, SETTING_DEFAULT_VIDEO_DEVICE
} from '../constants/index.js';
import { log } from '../utils/logger.js';

export function registerSettings() {
    game.settings.register(MODULE_ID, SETTING_DEBUG_LOGGING, {
        name: `${MODULE_TITLE} Debug Logging`,
        hint: 'Outputs verbose logging to the console for debugging purposes.',
        scope: 'client', 
        config: true, 
        type: Boolean, 
        default: false,
    });

    game.settings.register(MODULE_ID, SETTING_MEDIASOUP_URL, {
        name: 'MediaSoup Server WebSocket URL',
        hint: 'The WebSocket URL (e.g., wss://your.server.com:4443). Required.',
        scope: 'world', 
        config: true, 
        type: String, 
        default: '',
        onChange: value => {
            log(`MediaSoup Server URL changed to: ${value}`);
            const clientInstance = window.MediaSoupVTT_Client;
            if (clientInstance) {
                clientInstance.serverUrl = value;
                if (clientInstance.isConnected || clientInstance.isConnecting) {
                    clientInstance.disconnect();
                    ui.notifications.info(`${MODULE_TITLE}: Server URL changed. Disconnected. Please reconnect manually.`);
                }
            }
        }
    });

    game.settings.register(MODULE_ID, SETTING_AUTO_CONNECT, {
        name: 'Auto-connect to MediaSoup Server',
        hint: 'If checked, attempts to connect automatically when you join a game world.',
        scope: 'client', 
        config: true, 
        type: Boolean, 
        default: true,
    });

    game.settings.register(MODULE_ID, SETTING_DEFAULT_AUDIO_DEVICE, {
        name: 'Default Microphone',
        hint: 'Select preferred microphone. List populates after connecting or opening settings. May need page reload after first permission grant for all labels.',
        scope: 'client', 
        config: true, 
        type: String, 
        default: 'default', 
        choices: {'default': 'Browser Default'}
    });

    game.settings.register(MODULE_ID, SETTING_DEFAULT_VIDEO_DEVICE, {
        name: 'Default Webcam',
        hint: 'Select preferred webcam. List populates after connecting or opening settings. May need page reload after first permission grant for all labels.',
        scope: 'client', 
        config: true, 
        type: String, 
        default: 'default', 
        choices: {'default': 'Browser Default'}
    });
}

export function setupSettingsHooks() {
    Hooks.on('renderSettingsConfig', async (app, html, _data) => {
        const clientInstance = window.MediaSoupVTT_Client;
        if (clientInstance && app.constructor.name === 'SettingsConfig') {
            const moduleDetails = html.find(`details[data-module-id="${MODULE_ID}"]`);
            if (moduleDetails.length && (moduleDetails.attr('open') !== undefined || !clientInstance.availableAudioDevices)) {
                log('SettingsConfig rendered for our module, attempting to populate device lists.', 'debug');
                await clientInstance._populateDeviceSettings();
                if (app.element && app.element.length) {
                    const currentScroll = app.element.find('.scrollable').scrollTop();
                    app.render(false, {focus: false});
                    app.element.find('.scrollable').scrollTop(currentScroll);
                }
            }
        }
    });
}