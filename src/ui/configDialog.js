/**
 * MediaSoup Configuration Dialog for FoundryVTT
 * Provides a comprehensive setup guide and configuration interface
 */

import { MODULE_ID, MODULE_TITLE, SETTING_MEDIASOUP_URL, SETTING_AUTO_CONNECT } from '../constants/index.js';
import { log } from '../utils/logger.js';

export class MediaSoupConfigDialog extends Dialog {
    constructor(options = {}) {
        super({
            title: `${MODULE_TITLE} Configuration`,
            content: MediaSoupConfigDialog.getDialogContent(),
            buttons: {
                save: {
                    icon: '<i class="fas fa-save"></i>',
                    label: "Save Configuration",
                    callback: (html) => this._onSave(html)
                },
                test: {
                    icon: '<i class="fas fa-plug"></i>',
                    label: "Test Connection",
                    callback: (html) => this._onTestConnection(html)
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel"
                }
            },
            default: "save",
            close: () => {},
            resizable: true,
            ...options
        }, {
            width: 700,
            height: 800,
            classes: ["mediasoup-config-dialog"]
        });
    }

    static getDialogContent() {
        const currentServerUrl = game.settings.get(MODULE_ID, SETTING_MEDIASOUP_URL) || '';
        const autoConnect = game.settings.get(MODULE_ID, SETTING_AUTO_CONNECT);

        return `
            <div class="mediasoup-config-container">
                <style>
                    .mediasoup-config-container {
                        padding: 10px;
                        font-family: var(--font-primary);
                    }
                    .mediasoup-config-section {
                        margin-bottom: 20px;
                        padding: 15px;
                        border: 1px solid var(--color-border-light-primary);
                        border-radius: 5px;
                        background: var(--color-bg-option);
                    }
                    .mediasoup-config-section h3 {
                        margin-top: 0;
                        color: var(--color-text-dark-primary);
                        border-bottom: 1px solid var(--color-border-light-primary);
                        padding-bottom: 5px;
                    }
                    .mediasoup-step {
                        margin-bottom: 15px;
                        padding: 10px;
                        background: var(--color-bg);
                        border-left: 4px solid var(--color-border-highlight);
                        border-radius: 3px;
                    }
                    .mediasoup-step-number {
                        font-weight: bold;
                        color: var(--color-text-hyperlink);
                        margin-right: 8px;
                    }
                    .mediasoup-config-form {
                        display: grid;
                        gap: 15px;
                    }
                    .mediasoup-form-group {
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                    }
                    .mediasoup-form-group label {
                        font-weight: bold;
                        color: var(--color-text-dark-primary);
                    }
                    .mediasoup-form-group input, .mediasoup-form-group select {
                        padding: 8px;
                        border: 1px solid var(--color-border-light-primary);
                        border-radius: 3px;
                        background: var(--color-bg);
                        color: var(--color-text-dark-primary);
                    }
                    .mediasoup-form-group input:focus, .mediasoup-form-group select:focus {
                        border-color: var(--color-border-highlight);
                        outline: none;
                    }
                    .mediasoup-connection-status {
                        padding: 10px;
                        border-radius: 3px;
                        margin-top: 10px;
                    }
                    .mediasoup-status-success {
                        background: var(--color-bg-option);
                        border: 1px solid #28a745;
                        color: #155724;
                    }
                    .mediasoup-status-error {
                        background: var(--color-bg-option);
                        border: 1px solid #dc3545;
                        color: #721c24;
                    }
                    .mediasoup-status-testing {
                        background: var(--color-bg-option);
                        border: 1px solid #ffc107;
                        color: #856404;
                    }
                    .mediasoup-warning {
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        color: #856404;
                        padding: 10px;
                        border-radius: 3px;
                        margin: 10px 0;
                    }
                    .mediasoup-code {
                        background: var(--color-bg);
                        border: 1px solid var(--color-border-light-primary);
                        padding: 10px;
                        border-radius: 3px;
                        font-family: monospace;
                        white-space: pre-wrap;
                        word-break: break-all;
                    }
                </style>

                <!-- Configuration Instructions -->
                <div class="mediasoup-config-section">
                    <h3><i class="fas fa-cogs"></i> Setup Instructions</h3>
                    
                    <div class="mediasoup-step">
                        <span class="mediasoup-step-number">1.</span>
                        <strong>Start MediaSoup Server:</strong> Ensure your MediaSoup server is running. The default configuration expects it at:
                        <div class="mediasoup-code">wss://your-server.com:4443</div>
                    </div>

                    <div class="mediasoup-step">
                        <span class="mediasoup-step-number">2.</span>
                        <strong>Configure FoundryVTT A/V Settings:</strong> In FoundryVTT's Game Settings → Configure Audio/Video:
                        <ul>
                            <li>Set <strong>Audio/Video Conference Mode</strong> to <strong>"Third Party Module"</strong></li>
                            <li>Set <strong>Voice Mode</strong> to <strong>"Push to Talk"</strong> or <strong>"Voice Activation"</strong></li>
                            <li>Configure your preferred microphone and camera devices</li>
                        </ul>
                    </div>

                    <div class="mediasoup-step">
                        <span class="mediasoup-step-number">3.</span>
                        <strong>Configure MediaSoup Server URL:</strong> Enter your server's WebSocket URL below and test the connection.
                    </div>

                    <div class="mediasoup-step">
                        <span class="mediasoup-step-number">4.</span>
                        <strong>Enable the Module:</strong> The MediaSoup A/V integration will replace FoundryVTT's default WebRTC system.
                    </div>
                </div>

                <!-- Configuration Form -->
                <div class="mediasoup-config-section">
                    <h3><i class="fas fa-server"></i> Server Configuration</h3>
                    
                    <div class="mediasoup-config-form">
                        <div class="mediasoup-form-group">
                            <label for="mediasoup-server-url">MediaSoup Server WebSocket URL:</label>
                            <input type="url" 
                                   id="mediasoup-server-url" 
                                   name="serverUrl" 
                                   value="${currentServerUrl}"
                                   placeholder="wss://your-server.com:4443"
                                   required>
                            <small>Enter the full WebSocket URL including protocol (wss:// for secure, ws:// for local testing)</small>
                        </div>

                        <div class="mediasoup-form-group">
                            <label>
                                <input type="checkbox" 
                                       id="mediasoup-auto-connect" 
                                       name="autoConnect" 
                                       ${autoConnect ? 'checked' : ''}>
                                Auto-connect when joining a world
                            </label>
                            <small>Automatically attempt to connect to the MediaSoup server when you join a game world</small>
                        </div>
                    </div>

                    <div id="mediasoup-connection-status" class="mediasoup-connection-status" style="display: none;">
                        <!-- Connection status will be displayed here -->
                    </div>
                </div>

                <!-- FoundryVTT A/V Configuration Guide -->
                <div class="mediasoup-config-section">
                    <h3><i class="fas fa-video"></i> FoundryVTT A/V Settings Guide</h3>
                    
                    <div class="mediasoup-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Important:</strong> You must configure FoundryVTT's A/V settings to use "Third Party Module" before this plugin will work.
                    </div>

                    <p>To configure FoundryVTT for MediaSoup:</p>
                    <ol>
                        <li>Go to <strong>Game Settings</strong> → <strong>Configure Audio/Video</strong></li>
                        <li>Set <strong>"Audio/Video Conference Mode"</strong> to <strong>"Third Party Module"</strong></li>
                        <li>Configure your voice activation settings:
                            <ul>
                                <li><strong>Push to Talk:</strong> Hold a key to transmit</li>
                                <li><strong>Voice Activation:</strong> Automatic based on volume threshold</li>
                            </ul>
                        </li>
                        <li>Select your preferred microphone and camera devices</li>
                        <li>Save the settings and reload if prompted</li>
                    </ol>
                </div>

                <!-- Troubleshooting Section -->
                <div class="mediasoup-config-section">
                    <h3><i class="fas fa-wrench"></i> Troubleshooting</h3>
                    
                    <p><strong>Common Issues:</strong></p>
                    <ul>
                        <li><strong>Connection Failed:</strong> Check that your MediaSoup server is running and accessible</li>
                        <li><strong>No Audio/Video:</strong> Ensure FoundryVTT A/V is set to "Third Party Module"</li>
                        <li><strong>Browser Permissions:</strong> Grant microphone/camera permissions when prompted</li>
                        <li><strong>SSL/HTTPS:</strong> Use wss:// (secure WebSocket) for HTTPS-hosted FoundryVTT instances</li>
                        <li><strong>Firewall:</strong> Ensure the MediaSoup server port is accessible from clients</li>
                    </ul>

                    <p><strong>Debug Information:</strong></p>
                    <div class="mediasoup-code">Current Module Status: ${window.MediaSoupVTT_Client ? 'Loaded' : 'Not Loaded'}
Current Connection: ${window.MediaSoupVTT_Client?.isConnected ? 'Connected' : 'Disconnected'}
FoundryVTT Version: ${game.version}
Browser: ${navigator.userAgent}</div>
                </div>
            </div>
        `;
    }

    async _onSave(html) {
        const formData = new FormData(html[0].querySelector('.mediasoup-config-form'));
        const serverUrl = formData.get('serverUrl') || html.find('#mediasoup-server-url').val();
        const autoConnect = html.find('#mediasoup-auto-connect').is(':checked');

        try {
            // Validate URL format
            if (serverUrl && !this._isValidWebSocketUrl(serverUrl)) {
                ui.notifications.error('Please enter a valid WebSocket URL (ws:// or wss://)');
                return;
            }

            // Save settings
            await game.settings.set(MODULE_ID, SETTING_MEDIASOUP_URL, serverUrl);
            await game.settings.set(MODULE_ID, SETTING_AUTO_CONNECT, autoConnect);

            ui.notifications.info(`${MODULE_TITLE} configuration saved successfully!`);
            log('Configuration saved', { serverUrl, autoConnect });

            // Close dialog
            this.close();

        } catch (error) {
            log('Error saving configuration:', error, 'error');
            ui.notifications.error('Failed to save configuration. Check console for details.');
        }
    }

    async _onTestConnection(html) {
        const serverUrl = html.find('#mediasoup-server-url').val();
        const statusDiv = html.find('#mediasoup-connection-status');

        if (!serverUrl) {
            ui.notifications.warn('Please enter a server URL before testing');
            return;
        }

        if (!this._isValidWebSocketUrl(serverUrl)) {
            ui.notifications.error('Please enter a valid WebSocket URL (ws:// or wss://)');
            return;
        }

        // Show testing status
        statusDiv.show().removeClass('mediasoup-status-success mediasoup-status-error')
               .addClass('mediasoup-status-testing')
               .html('<i class="fas fa-spinner fa-spin"></i> Testing connection...');

        try {
            const result = await this._testWebSocketConnection(serverUrl);
            
            if (result.success) {
                statusDiv.removeClass('mediasoup-status-testing')
                         .addClass('mediasoup-status-success')
                         .html(`<i class="fas fa-check-circle"></i> Connection successful! (${result.latency}ms)`);
                ui.notifications.info('MediaSoup server connection test successful!');
            } else {
                statusDiv.removeClass('mediasoup-status-testing')
                         .addClass('mediasoup-status-error')
                         .html(`<i class="fas fa-times-circle"></i> Connection failed: ${result.error}`);
                ui.notifications.error(`Connection test failed: ${result.error}`);
            }
        } catch (error) {
            statusDiv.removeClass('mediasoup-status-testing')
                     .addClass('mediasoup-status-error')
                     .html(`<i class="fas fa-times-circle"></i> Connection test error: ${error.message}`);
            log('Connection test error:', error, 'error');
        }
    }

    _isValidWebSocketUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
        } catch {
            return false;
        }
    }

    async _testWebSocketConnection(url) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const timeout = setTimeout(() => {
                resolve({ success: false, error: 'Connection timeout (10 seconds)' });
                if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }, 10000);

            const ws = new WebSocket(url);

            ws.onopen = () => {
                const latency = Date.now() - startTime;
                clearTimeout(timeout);
                ws.close();
                resolve({ success: true, latency });
            };

            ws.onerror = (error) => {
                clearTimeout(timeout);
                resolve({ success: false, error: 'WebSocket connection error' });
            };

            ws.onclose = (event) => {
                if (event.code !== 1000) { // Not a normal closure
                    clearTimeout(timeout);
                    resolve({ success: false, error: `Connection closed with code ${event.code}` });
                }
            };
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Add real-time URL validation
        html.find('#mediasoup-server-url').on('input', (event) => {
            const input = event.target;
            const url = input.value;
            
            if (url && !this._isValidWebSocketUrl(url)) {
                input.setCustomValidity('Please enter a valid WebSocket URL (ws:// or wss://)');
            } else {
                input.setCustomValidity('');
            }
        });
    }
}

/**
 * Show the MediaSoup configuration dialog
 */
export function showConfigDialog() {
    new MediaSoupConfigDialog().render(true);
}