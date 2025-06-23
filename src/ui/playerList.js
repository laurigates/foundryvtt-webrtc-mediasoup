/**
 * Player list integration for MediaSoupVTT
 */

import { log } from '../utils/logger.js';

export function setupPlayerListHooks() {
    /**
     * Hook into rendering the player list to add video elements.
     */
    Hooks.on('renderPlayerList', (playerListApp, html, _data) => {
        const clientInstance = window.MediaSoupVTT_Client;
        if (!clientInstance || !clientInstance.isConnected) {
            // Clean up any existing video elements if not connected
            html.find('.mediasoup-video-container').remove();
            return;
        }

        log('Rendering player list. Updating A/V elements.', 'debug');

        // Support both v12 and v13 player list structures
        const playerElements = html.find('li.player, .player');
        playerElements.each((index, playerElement) => {
            const playerLi = $(playerElement);
            
            // Try multiple ways to get userId for v13 compatibility
            let userId = playerLi.data('user-id') || playerLi.data('userId') || playerLi.attr('data-user-id');
            
            // Fallback: look for user ID in nested elements or attributes
            if (!userId) {
                const userElement = playerLi.find('[data-user-id]').first();
                if (userElement.length) {
                    userId = userElement.data('user-id') || userElement.attr('data-user-id');
                }
            }
            
            if (!userId) return;

            // Remove old container first to ensure clean update
            playerLi.find('.mediasoup-video-container').remove();

            const userStreams = clientInstance.remoteUserStreams.get(userId);

            if (userStreams && userStreams.videoTrack) {
                log(`User ${userId} has a video track. Creating video element.`, 'debug');
                const videoContainer = $('<div class="mediasoup-video-container"></div>');
                const videoElement = $(`<video id="mediasoup-remote-video-${userId}" class="mediasoup-remote-video" autoplay playsinline muted></video>`);
                
                try {
                    videoElement.get(0).srcObject = new MediaStream([userStreams.videoTrack]);
                } catch (e) {
                    log(`Error setting srcObject for user ${userId}: ${e.message}`, 'error');
                }
                
                videoContainer.append(videoElement);
                
                // Try multiple insertion points for v13 compatibility
                const insertionTargets = [
                    playerLi.find('.player-name'),
                    playerLi.find('.player-title'),
                    playerLi.find('h3'),
                    playerLi.find('.name'),
                    playerLi.find('label')
                ];
                
                let inserted = false;
                for (const target of insertionTargets) {
                    if (target.length) {
                        target.after(videoContainer);
                        inserted = true;
                        break;
                    }
                }
                
                // Fallback: append to player element
                if (!inserted) {
                    playerLi.append(videoContainer);
                }
            }
        });
    });
}