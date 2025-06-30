/**
 * Constants for the MediaSoupVTT plugin
 */

const MODULE_ID = 'mediasoup-vtt';
const MODULE_TITLE = 'MediaSoupVTT';
const LOG_PREFIX = `${MODULE_TITLE} |`;

// Settings keys
const SETTING_MEDIASOUP_URL = 'mediaSoupServerUrl';
const SETTING_AUTO_CONNECT = 'autoConnect';
const SETTING_DEFAULT_AUDIO_DEVICE = 'defaultAudioDevice';
const SETTING_DEFAULT_VIDEO_DEVICE = 'defaultVideoDevice';
const SETTING_DEBUG_LOGGING = 'debugLogging';

// Media track kinds
const MEDIA_KIND_AUDIO = 'audio';
const MEDIA_KIND_VIDEO = 'video';

// AppData tags for producers
const APP_DATA_TAG_MIC = 'mic';
const APP_DATA_TAG_WEBCAM = 'webcam';

// Signaling message types
const SIG_MSG_TYPES = {
    GET_ROUTER_RTP_CAPABILITIES: 'getRouterRtpCapabilities',
    ROUTER_RTP_CAPABILITIES: 'routerRtpCapabilities',
    CREATE_WEBRTC_TRANSPORT: 'createWebRtcTransport',
    TRANSPORT_CREATED: 'transportCreated',
    CONNECT_TRANSPORT: 'connectTransport',
    TRANSPORT_CONNECTED: 'transportConnected',
    PRODUCE: 'produce',
    PRODUCED: 'produced',
    NEW_PRODUCER: 'newProducer',
    CONSUME: 'consume',
    CONSUMED: 'consumed',
    PRODUCER_CLOSED: 'producerClosed',
    PAUSE_PRODUCER: 'pauseProducer',
    RESUME_PRODUCER: 'resumeProducer',
    CONSUMER_PAUSE: 'consumerPause',
    CONSUMER_RESUME: 'consumerResume',
    CONSUMER_CLOSE: 'consumerClose',
};

/**
 * Logging utilities for MediaSoupVTT
 */


function log(message, level = 'info', force = false) {
    const settingDebug = game.settings.get(MODULE_ID, SETTING_DEBUG_LOGGING);
    if (level === 'debug' && !settingDebug && !force) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const enrichedMessage = `[${timestamp}] ${message}`;
    
    switch (level) {
    case 'warn': 
        console.warn(`${LOG_PREFIX} ${enrichedMessage}`); 
        break;
    case 'error': 
        console.error(`${LOG_PREFIX} ${enrichedMessage}`); 
        break;
    case 'info': 
        console.info(`${LOG_PREFIX} ${enrichedMessage}`); 
        break;
    case 'debug': 
        console.debug(`${LOG_PREFIX} ${enrichedMessage}`); 
        break;
    default: 
        console.log(`${LOG_PREFIX} ${enrichedMessage}`);
    }
}

/**
 * MediaSoup WebRTC Client for FoundryVTT
 */


class MediaSoupVTTClient {
    constructor() {
        this.device = null;
        this.socket = null;
        this.sendTransport = null;
        this.recvTransport = null;
        this.producers = new Map();
        this.consumers = new Map();

        this.serverUrl = game.settings.get(MODULE_ID, SETTING_MEDIASOUP_URL);
        this.isConnected = false;
        this.isConnecting = false;
        this.requestMap = new Map();
        this.requestIdCounter = 0;

        this.localAudioStream = null;
        this.localVideoStream = null;
        this.remoteUserStreams = new Map();

        if (!window.mediasoupClient) {
            log('mediasoup-client library is not loaded. This plugin will not function.', 'error', true);
            ui.notifications.error(`${MODULE_TITLE}: mediasoup-client library not found! Critical error.`, { permanent: true });
        }
    }

    async connect() {
        if (this.isConnected || this.isConnecting) {
            log(`Cannot connect. Already connected or connecting. Connected: ${this.isConnected}, Connecting: ${this.isConnecting}`, 'warn');
            return;
        }
        if (!this.serverUrl) {
            log('MediaSoup server URL is not configured.', 'warn', true);
            ui.notifications.warn(`${MODULE_TITLE}: MediaSoup server URL not configured. Please set it in module settings.`);
            return;
        }
        if (!window.mediasoupClient) {
            log('mediasoup-client library not found. Cannot connect.', 'error', true);
            ui.notifications.error(`${MODULE_TITLE}: mediasoup-client library not available. Cannot connect.`);
            return;
        }

        this.isConnecting = true;
        this._updateConnectionStatus('connecting');
        log(`Attempting to connect to MediaSoup server at ${this.serverUrl}...`);

        try {
            this.socket = new WebSocket(this.serverUrl);
            this.socket.onopen = async () => {
                log('WebSocket connection established.', 'info');
                await this._initializeMediasoupDevice();
            };
            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this._handleSignalingMessage(message);
                } catch (error) {
                    log(`Error parsing signaling message: ${error.message}`, 'error');
                    console.error('Raw message data:', event.data);
                }
            };
            this.socket.onerror = (error) => {
                log(`WebSocket error: ${error.message || 'Unknown error'}`, 'error', true);
                console.error('WebSocket error object:', error);
                ui.notifications.error(`${MODULE_TITLE}: WebSocket connection error.`);
                this._handleConnectionFailure();
            };
            this.socket.onclose = (event) => {
                log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason given'}`, event.wasClean ? 'info' : 'warn');
                if (!event.wasClean) {
                    ui.notifications.warn(`${MODULE_TITLE}: WebSocket connection closed unexpectedly.`);
                }
                this._handleConnectionFailure();
            };
        } catch (error) {
            log(`Failed to initiate WebSocket connection: ${error.message}`, 'error', true);
            ui.notifications.error(`${MODULE_TITLE}: Failed to initiate connection.`);
            this._handleConnectionFailure();
        }
    }

    disconnect(showNotification = true) {
        log('Disconnecting from MediaSoup server...', 'info');
        this.isConnecting = false;

        this.stopLocalAudio(false);
        this.stopLocalVideo(false);

        if (this.socket) {
            this.socket.onopen = null;
            this.socket.onmessage = null;
            this.socket.onerror = null;
            this.socket.onclose = null;
            if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
                this.socket.close();
            }
            this.socket = null;
        }

        this.producers.forEach(p => { if (p && !p.closed) p.close(); });
        this.producers.clear();

        this.consumers.forEach(consumer => {
            if (consumer && !consumer.closed) consumer.close();
            const userStreamData = Array.from(this.remoteUserStreams.entries()).find(
                ([_uid, data]) => data.audioConsumerId === consumer.id || data.videoConsumerId === consumer.id
            );
            if (userStreamData) {
                const userId = userStreamData[0];
                if (consumer.kind === MEDIA_KIND_AUDIO) $(`#mediasoup-consumer-audio-${userId}`).remove();
                else if (consumer.kind === MEDIA_KIND_VIDEO) this._removeRemoteVideoElement(userId);
            }
        });
        this.consumers.clear();
        this.remoteUserStreams.clear();

        if (this.sendTransport && !this.sendTransport.closed) {
            this.sendTransport.close();
            this.sendTransport = null;
        }
        if (this.recvTransport && !this.recvTransport.closed) {
            this.recvTransport.close();
            this.recvTransport = null;
        }

        this.device = null;
        this.requestMap.forEach(({ reject }) => reject(new Error('Disconnecting.')));
        this.requestMap.clear();
        this.requestIdCounter = 0;

        if (this.localAudioStream) {
            this.localAudioStream.getTracks().forEach(track => track.stop());
            this.localAudioStream = null;
        }
        if (this.localVideoStream) {
            this.localVideoStream.getTracks().forEach(track => track.stop());
            this.localVideoStream = null;
        }
        this._removeLocalVideoPreview();

        if (this.isConnected && showNotification) {
            ui.notifications.info(`${MODULE_TITLE}: Disconnected from MediaSoup server.`);
        }
        this.isConnected = false;
        this._updateConnectionStatus('disconnected');
        ui.players.render(true);
    }

    _handleConnectionFailure() {
        this.isConnecting = false;
        if (this.isConnected) {
            ui.notifications.info(`${MODULE_TITLE}: Disconnected from MediaSoup server.`);
        }
        this.disconnect(false);
        this._updateConnectionStatus('error');
    }

    async _initializeMediasoupDevice() {
        try {
            log('Initializing mediasoup-client Device...');
            this.device = new window.mediasoupClient.Device();
            const routerRtpCapabilities = await this._sendSignalingRequest({ type: SIG_MSG_TYPES.GET_ROUTER_RTP_CAPABILITIES });
            if (!routerRtpCapabilities || Object.keys(routerRtpCapabilities).length === 0) {
                throw new Error('Received empty or invalid routerRtpCapabilities from server.');
            }
            log('Received Router RTP Capabilities. Loading into device...', 'debug');
            await this.device.load({ routerRtpCapabilities });
            log('Mediasoup Device loaded successfully.', 'info');

            await this._createSendTransport();
            await this._createRecvTransport();

            this.isConnected = true;
            this.isConnecting = false;
            this._updateConnectionStatus('connected');
            ui.notifications.info(`${MODULE_TITLE}: Successfully connected to MediaSoup server.`);
            await this._populateDeviceSettings();
            ui.players.render(true);

        } catch (error) {
            log(`Error initializing MediaSoup Device: ${error.message}`, 'error', true);
            console.error(error);
            ui.notifications.error(`${MODULE_TITLE}: Initialization failed - ${error.message}`);
            this._handleConnectionFailure();
        }
    }

    _sendSignalingRequest(requestData, timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                return reject(new Error('WebSocket is not open.'));
            }
            const requestId = `req_${this.requestIdCounter++}`;
            const message = { ...requestData, requestId, userId: game.userId };

            this.requestMap.set(requestId, { resolve, reject });
            log(`Sending signaling request (ID: ${requestId}): ${JSON.stringify(requestData)}`, 'debug');
            this.socket.send(JSON.stringify(message));

            setTimeout(() => {
                if (this.requestMap.has(requestId)) {
                    this.requestMap.delete(requestId);
                    log(`Signaling request (ID: ${requestId}, Type: ${requestData.type}) timed out.`, 'warn');
                    reject(new Error(`Request '${requestData.type}' timed out`));
                }
            }, timeoutMs);
        });
    }

    _handleSignalingMessage(message) {
        log(`Received signaling message: ${JSON.stringify(message)}`, 'debug');
        if (message.requestId && this.requestMap.has(message.requestId)) {
            const { resolve, reject } = this.requestMap.get(message.requestId);
            if (message.error) {
                log(`Signaling request (ID: ${message.requestId}) failed: ${message.error}`, 'error');
                reject(new Error(message.error));
            } else {
                resolve(message.data || message);
            }
            this.requestMap.delete(message.requestId);
            return;
        }
        switch (message.type) {
        case SIG_MSG_TYPES.NEW_PRODUCER:
            log(`Server notified of new producer: ${message.producerId} for user ${message.userId} of kind ${message.kind}`, 'info');
            this._handleNewRemoteProducer(message);
            break;
        case SIG_MSG_TYPES.PRODUCER_CLOSED:
            log(`Server notified producer closed: ${message.producerId}`, 'info');
            this._handleRemoteProducerClosed(message.producerId);
            break;
        default:
            log(`Received unhandled signaling message type: ${message.type}`, 'warn');
        }
    }

    async _createSendTransport() {
        try {
            log('Requesting server to create send transport...', 'debug');
            const transportInfo = await this._sendSignalingRequest({
                type: SIG_MSG_TYPES.CREATE_WEBRTC_TRANSPORT,
                forceTcp: false, 
                producing: true,
                consuming: false,
                sctpCapabilities: this.device.sctpCapabilities 
            });

            if (!this.device) throw new Error('Device not initialized for creating send transport.');
            this.sendTransport = this.device.createSendTransport(transportInfo);
            log('Send transport created locally.', 'debug');

            this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                log('Send transport "connect" event triggered.', 'debug');
                try {
                    await this._sendSignalingRequest({
                        type: SIG_MSG_TYPES.CONNECT_TRANSPORT,
                        transportId: this.sendTransport.id,
                        dtlsParameters
                    });
                    callback(); 
                    log('Send transport connected to server.', 'info');
                } catch (error) {
                    log(`Error connecting send transport: ${error.message}`, 'error');
                    errback(error);
                }
            });

            this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                log(`Send transport "produce" event triggered for kind: ${kind}`, 'debug');
                try {
                    const { id } = await this._sendSignalingRequest({
                        type: SIG_MSG_TYPES.PRODUCE,
                        transportId: this.sendTransport.id,
                        kind,
                        rtpParameters,
                        appData 
                    });
                    callback({ id }); 
                    log(`Successfully produced ${kind} (Producer ID: ${id}, AppData: ${JSON.stringify(appData)})`, 'info');
                } catch (error) {
                    log(`Error on "produce" event for send transport: ${error.message}`, 'error');
                    errback(error);
                }
            });

            this.sendTransport.on('connectionstatechange', (state) => {
                log(`Send transport connection state changed: ${state}`, 'debug');
                if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                    log(`Send transport entered critical state: ${state}.`, 'warn');
                }
            });

        } catch (error) {
            log(`Error creating send transport: ${error.message}`, 'error', true);
            ui.notifications.error(`${MODULE_TITLE}: Could not create send transport - ${error.message}`);
            this._handleConnectionFailure(); 
        }
    }

    async _createRecvTransport() {
        try {
            log('Requesting server to create receive transport...', 'debug');
            const transportInfo = await this._sendSignalingRequest({
                type: SIG_MSG_TYPES.CREATE_WEBRTC_TRANSPORT,
                forceTcp: false,
                producing: false,
                consuming: true,
                sctpCapabilities: this.device.sctpCapabilities
            });

            if (!this.device) throw new Error('Device not initialized for creating recv transport.');
            this.recvTransport = this.device.createRecvTransport(transportInfo);
            log('Receive transport created locally.', 'debug');

            this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                log('Receive transport "connect" event triggered.', 'debug');
                try {
                    await this._sendSignalingRequest({
                        type: SIG_MSG_TYPES.CONNECT_TRANSPORT,
                        transportId: this.recvTransport.id,
                        dtlsParameters
                    });
                    callback();
                    log('Receive transport connected to server.', 'info');
                } catch (error) {
                    log(`Error connecting receive transport: ${error.message}`, 'error');
                    errback(error);
                }
            });

            this.recvTransport.on('connectionstatechange', (state) => {
                log(`Receive transport connection state changed: ${state}`, 'debug');
                if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                    log(`Receive transport entered critical state: ${state}.`, 'warn');
                }
            });

        } catch (error) {
            log(`Error creating receive transport: ${error.message}`, 'error', true);
            ui.notifications.error(`${MODULE_TITLE}: Could not create receive transport - ${error.message}`);
            this._handleConnectionFailure(); 
        }
    }

    async startLocalAudio() {
        if (!this.isConnected || !this.sendTransport || !this.device.canProduce(MEDIA_KIND_AUDIO)) {
            log('Cannot start local audio: Not connected, send transport not ready, or cannot produce audio.', 'warn');
            ui.notifications.warn(`${MODULE_TITLE}: Cannot start audio. Not ready.`);
            return;
        }
        if (this.producers.has(APP_DATA_TAG_MIC)) {
            log('Audio already started.', 'info');
            const producer = this.producers.get(APP_DATA_TAG_MIC);
            if (producer.paused) await this.resumeProducer(producer);
            return;
        }

        log('Starting local audio capture...', 'info');
        try {
            const deviceId = game.settings.get(MODULE_ID, SETTING_DEFAULT_AUDIO_DEVICE);
            const constraints = { audio: deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : true };
            log(`Using audio constraints: ${JSON.stringify(constraints)}`, 'debug');

            this.localAudioStream = await navigator.mediaDevices.getUserMedia(constraints);
            const track = this.localAudioStream.getAudioTracks()[0];
            if (!track) throw new Error('No audio track found in stream.');

            const producer = await this.sendTransport.produce({
                track,
                appData: { mediaTag: APP_DATA_TAG_MIC, userId: game.userId } 
            });
            this.producers.set(APP_DATA_TAG_MIC, producer);
            log(`Audio producer created (ID: ${producer.id})`, 'info');
            this._updateMediaButtonState(APP_DATA_TAG_MIC, true, producer.paused);

            producer.on('trackended', () => {
                log('Audio track ended (e.g., device unplugged).', 'warn');
                this.stopLocalAudio(true); 
            });
            producer.on('transportclose', () => {
                log('Audio producer transport closed.', 'warn');
                this.producers.delete(APP_DATA_TAG_MIC);
                this._updateMediaButtonState(APP_DATA_TAG_MIC, false, false);
                if (this.localAudioStream) {
                    this.localAudioStream.getTracks().forEach(t => t.stop());
                    this.localAudioStream = null;
                }
            });

        } catch (error) {
            log(`Error starting local audio: ${error.message}`, 'error', true);
            ui.notifications.error(`${MODULE_TITLE}: Could not start microphone - ${error.message}`);
            if (this.localAudioStream) { 
                this.localAudioStream.getTracks().forEach(t => t.stop()); 
                this.localAudioStream = null; 
            }
        }
    }

    async stopLocalAudio(_notifyServer = true) {
        const producer = this.producers.get(APP_DATA_TAG_MIC);
        if (!producer) {
            log('No local audio producer to stop.', 'debug');
            return;
        }
        log('Stopping local audio...', 'info');
        if (!producer.closed) {
            producer.close(); 
        }
        
        if (this.producers.has(APP_DATA_TAG_MIC)) {
            this.producers.delete(APP_DATA_TAG_MIC);
            this._updateMediaButtonState(APP_DATA_TAG_MIC, false, false);
        }

        if (this.localAudioStream) {
            this.localAudioStream.getTracks().forEach(track => track.stop());
            this.localAudioStream = null;
        }
    }

    async toggleAudioMute() {
        const producer = this.producers.get(APP_DATA_TAG_MIC);
        if (!producer || producer.closed) {
            log('Cannot toggle mute: No active audio producer. Attempting to start audio.', 'info');
            await this.startLocalAudio();
            return;
        }
        if (producer.paused) {
            await this.resumeProducer(producer);
        } else {
            await this.pauseProducer(producer);
        }
    }

    async startLocalVideo() {
        if (!this.isConnected || !this.sendTransport || !this.device.canProduce(MEDIA_KIND_VIDEO)) {
            log('Cannot start local video: Not connected, send transport not ready, or cannot produce video.', 'warn');
            ui.notifications.warn(`${MODULE_TITLE}: Cannot start video. Not ready.`);
            return;
        }
        if (this.producers.has(APP_DATA_TAG_WEBCAM)) {
            log('Video already started.', 'info');
            const producer = this.producers.get(APP_DATA_TAG_WEBCAM);
            if (producer.paused) await this.resumeProducer(producer);
            return;
        }

        log('Starting local video capture...', 'info');
        try {
            const deviceId = game.settings.get(MODULE_ID, SETTING_DEFAULT_VIDEO_DEVICE);
            const constraints = { video: deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : true };
            log(`Using video constraints: ${JSON.stringify(constraints)}`, 'debug');

            this.localVideoStream = await navigator.mediaDevices.getUserMedia(constraints);
            const track = this.localVideoStream.getVideoTracks()[0];
            if (!track) throw new Error('No video track found in stream.');

            const producer = await this.sendTransport.produce({
                track,
                encodings: [],
                appData: { mediaTag: APP_DATA_TAG_WEBCAM, userId: game.userId }
            });
            this.producers.set(APP_DATA_TAG_WEBCAM, producer);
            log(`Video producer created (ID: ${producer.id})`, 'info');
            this._updateMediaButtonState(APP_DATA_TAG_WEBCAM, true, producer.paused);
            this._displayLocalVideoPreview(this.localVideoStream);

            producer.on('trackended', () => {
                log('Video track ended.', 'warn');
                this.stopLocalVideo(true);
            });
            producer.on('transportclose', () => {
                log('Video producer transport closed.', 'warn');
                this.producers.delete(APP_DATA_TAG_WEBCAM);
                this._updateMediaButtonState(APP_DATA_TAG_WEBCAM, false, false);
                this._removeLocalVideoPreview();
                if (this.localVideoStream) {
                    this.localVideoStream.getTracks().forEach(t => t.stop());
                    this.localVideoStream = null;
                }
            });

        } catch (error) {
            log(`Error starting local video: ${error.message}`, 'error', true);
            ui.notifications.error(`${MODULE_TITLE}: Could not start webcam - ${error.message}`);
            if (this.localVideoStream) { 
                this.localVideoStream.getTracks().forEach(t => t.stop()); 
                this.localVideoStream = null; 
            }
            this._removeLocalVideoPreview();
        }
    }

    async stopLocalVideo(_notifyServer = true) {
        const producer = this.producers.get(APP_DATA_TAG_WEBCAM);
        if (!producer) {
            log('No local video producer to stop.', 'debug');
            return;
        }
        log('Stopping local video...', 'info');
        if (!producer.closed) {
            producer.close();
        }
        
        if (this.producers.has(APP_DATA_TAG_WEBCAM)) {
            this.producers.delete(APP_DATA_TAG_WEBCAM);
            this._updateMediaButtonState(APP_DATA_TAG_WEBCAM, false, false);
        }

        if (this.localVideoStream) {
            this.localVideoStream.getTracks().forEach(track => track.stop());
            this.localVideoStream = null;
        }
        this._removeLocalVideoPreview();
    }

    async toggleVideoEnabled() {
        const producer = this.producers.get(APP_DATA_TAG_WEBCAM);
        if (!producer || producer.closed) { 
            log('No active video producer to toggle. Attempting to start video.', 'info');
            await this.startLocalVideo();
            return;
        }
        if (producer.paused) {
            await this.resumeProducer(producer);
            this._displayLocalVideoPreview(this.localVideoStream); 
        } else { 
            await this.pauseProducer(producer);
            this._removeLocalVideoPreview(); 
        }
    }

    async pauseProducer(producer) {
        if (!producer || producer.closed || producer.paused) return;
        log(`Pausing producer ${producer.id} (Kind: ${producer.kind}, AppData: ${JSON.stringify(producer.appData)})`, 'info');
        try {
            await producer.pause();
            log(`Producer ${producer.id} paused.`, 'info');
            this._updateMediaButtonState(producer.appData.mediaTag, true, true);
            
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this._sendSignalingRequest({ type: SIG_MSG_TYPES.PAUSE_PRODUCER, producerId: producer.id })
                    .catch(e => log(`Error notifying server of producer pause: ${e.message}`, 'warn'));
            }
        } catch (error) {
            log(`Error pausing producer ${producer.id}: ${error.message}`, 'error');
        }
    }

    async resumeProducer(producer) {
        if (!producer || producer.closed || !producer.paused) return;
        log(`Resuming producer ${producer.id} (Kind: ${producer.kind}, AppData: ${JSON.stringify(producer.appData)})`, 'info');
        try {
            await producer.resume();
            log(`Producer ${producer.id} resumed.`, 'info');
            this._updateMediaButtonState(producer.appData.mediaTag, true, false);
            
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this._sendSignalingRequest({ type: SIG_MSG_TYPES.RESUME_PRODUCER, producerId: producer.id })
                    .catch(e => log(`Error notifying server of producer resume: ${e.message}`, 'warn'));
            }
        } catch (error) {
            log(`Error resuming producer ${producer.id}: ${error.message}`, 'error');
        }
    }

    async _handleNewRemoteProducer({ producerId, userId, kind, appData }) {
        if (userId === game.userId) {
            log(`Skipping consumption of own producer ${producerId}`, 'debug');
            return;
        }
        
        if (!appData || !appData.rtpParameters) {
            log(`Cannot consume producer ${producerId}: Missing rtpParameters in appData from server notification.`, 'error');
            return;
        }

        if (!this.isConnected || !this.recvTransport || !this.device.canConsume({ producerId, kind, rtpParameters: appData.rtpParameters })) {
            log(`Cannot consume new producer ${producerId}: Not ready or device cannot consume. Device consumable check failed.`, 'warn');
            return;
        }
        log(`Handling new remote producer ${producerId} of kind ${kind} from user ${userId}`, 'info');

        try {
            const consumerParams = await this._sendSignalingRequest({
                type: SIG_MSG_TYPES.CONSUME,
                producerId: producerId,
                rtpCapabilities: this.device.rtpCapabilities,
            });

            if (!consumerParams || !consumerParams.id) {
                throw new Error('Server did not return valid consumer parameters.');
            }

            const consumer = await this.recvTransport.consume({
                id: consumerParams.id,
                producerId: consumerParams.producerId,
                kind: consumerParams.kind,
                rtpParameters: consumerParams.rtpParameters,
                appData: { ...appData, userId, kind }
            });

            this.consumers.set(consumer.id, consumer);
            log(`Consumer created (ID: ${consumer.id}, Kind: ${kind}) for producer ${producerId}`, 'info');

            let userStreams = this.remoteUserStreams.get(userId) || {};
            if (kind === MEDIA_KIND_AUDIO) {
                userStreams.audioTrack = consumer.track;
                userStreams.audioConsumerId = consumer.id;
                const audioElement = document.createElement('audio');
                audioElement.id = `mediasoup-consumer-audio-${userId}`;
                audioElement.srcObject = new MediaStream([consumer.track]);
                audioElement.autoplay = true;
                document.body.appendChild(audioElement);
                log(`Playing remote audio for user ${userId}, consumer ${consumer.id}`, 'debug');
            } else if (kind === MEDIA_KIND_VIDEO) {
                userStreams.videoTrack = consumer.track;
                userStreams.videoConsumerId = consumer.id;
                log(`Received remote video track for user ${userId}, consumer ${consumer.id}. Attaching to UI.`, 'info');
            }
            this.remoteUserStreams.set(userId, userStreams);

            if (consumerParams.producerPaused) {
                log(`Remote producer ${producerId} is paused. Pausing consumer ${consumer.id}.`, 'info');
            }

            consumer.on('trackended', () => {
                log(`Remote track ended for consumer ${consumer.id}.`, 'warn');
                this._handleRemoteProducerClosed(consumer.producerId);
            });
            consumer.on('transportclose', () => {
                log(`Consumer transport closed for consumer ${consumer.id}.`, 'warn');
                this._handleRemoteProducerClosed(consumer.producerId);
            });

            ui.players.render(true);

        } catch (error) {
            log(`Error consuming producer ${producerId}: ${error.message}`, 'error', true);
            console.error(error);
        }
    }

    _handleRemoteProducerClosed(producerId) {
        let consumerToClose = null;
        let consumerIdToRemove = null;

        for (const [cId, c] of this.consumers) {
            if (c.producerId === producerId) {
                consumerToClose = c;
                consumerIdToRemove = cId;
                break;
            }
        }

        if (consumerToClose) {
            log(`Closing consumer ${consumerToClose.id} for remote producer ${producerId}`, 'info');
            if (!consumerToClose.closed) {
                consumerToClose.close();
            }
            this.consumers.delete(consumerIdToRemove);

            const userId = consumerToClose.appData.userId;
            const kind = consumerToClose.kind;
            let userStreams = this.remoteUserStreams.get(userId);

            if (userStreams) {
                if (kind === MEDIA_KIND_AUDIO) {
                    $(`#mediasoup-consumer-audio-${userId}`).remove();
                    userStreams.audioTrack = null;
                    userStreams.audioConsumerId = null;
                } else if (kind === MEDIA_KIND_VIDEO) {
                    this._removeRemoteVideoElement(userId);
                    userStreams.videoTrack = null;
                    userStreams.videoConsumerId = null;
                }
                if (!userStreams.audioTrack && !userStreams.videoTrack) {
                    this.remoteUserStreams.delete(userId);
                } else {
                    this.remoteUserStreams.set(userId, userStreams);
                }
            }
            ui.players.render(true);
        } else {
            log(`No active consumer found for producerId ${producerId} to close.`, 'debug');
        }
    }

    // UI helper methods
    _updateConnectionStatus(_status) {
        // This method is called but implementation is handled in UI modules
        // Keeping as placeholder for interface compatibility
    }

    _updateMediaButtonState(_mediaTag, _isActive, _isPaused) {
        // This method is called but implementation is handled in UI modules
        // Keeping as placeholder for interface compatibility
    }

    _displayLocalVideoPreview(_stream) {
        // This method is called but implementation is handled in UI modules
        // Keeping as placeholder for interface compatibility
    }

    _removeLocalVideoPreview() {
        // This method is called but implementation is handled in UI modules
        // Keeping as placeholder for interface compatibility
    }

    _removeRemoteVideoElement(userId) {
        // Support both v12 and v13 player list structures
        const playerSelectors = [
            `#player-list li[data-user-id="${userId}"]`,
            `#player-list .player[data-user-id="${userId}"]`,
            `.players-list li[data-user-id="${userId}"]`,
            `.players-list .player[data-user-id="${userId}"]`
        ];
        
        for (const selector of playerSelectors) {
            const playerLi = $(selector);
            if (playerLi.length) {
                playerLi.find('.mediasoup-video-container').remove();
                break;
            }
        }
        
        // Also remove any standalone audio elements
        $(`#mediasoup-consumer-audio-${userId}`).remove();
    }

    async _populateDeviceSettings() {
        // This method is called but implementation is handled in UI modules
        // Keeping as placeholder for interface compatibility
    }
}

/**
 * MediaSoup Configuration Dialog for FoundryVTT
 * Provides a comprehensive setup guide and configuration interface
 */


class MediaSoupConfigDialog extends Dialog {
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
function showConfigDialog() {
    new MediaSoupConfigDialog().render(true);
}

/**
 * Settings registration and management for MediaSoupVTT
 */


function registerSettings() {
    // Configuration dialog button
    game.settings.registerMenu(MODULE_ID, 'configDialog', {
        name: 'MediaSoup Server Configuration',
        label: 'Configure MediaSoup Server',
        hint: 'Open the comprehensive configuration dialog with setup instructions.',
        icon: 'fas fa-cogs',
        type: 'button',
        onClick: () => showConfigDialog()
    });

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
        hint: 'The WebSocket URL (e.g., wss://your.server.com:4443). Use the configuration dialog above for detailed setup instructions.',
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

function setupSettingsHooks() {
    Hooks.on('renderSettingsConfig', async (app, html, _data) => {
        const clientInstance = window.MediaSoupVTT_Client;
        if (clientInstance && app.constructor.name === 'SettingsConfig') {
            const moduleDetails = html.find(`details[data-module-id="${MODULE_ID}"]`);
            if (moduleDetails.length) {
                // Add helpful styling and status information
                addSettingsEnhancements(moduleDetails, clientInstance);
                
                if (moduleDetails.attr('open') !== undefined || !clientInstance.availableAudioDevices) {
                    log('SettingsConfig rendered for our module, attempting to populate device lists.', 'debug');
                    await clientInstance._populateDeviceSettings();
                    if (app.element && app.element.length) {
                        const currentScroll = app.element.find('.scrollable').scrollTop();
                        app.render(false, {focus: false});
                        app.element.find('.scrollable').scrollTop(currentScroll);
                    }
                }
            }
        }
    });
}

function addSettingsEnhancements(moduleDetails, clientInstance) {
    // Add status indicator to module header
    const summary = moduleDetails.find('summary');
    const isConnected = clientInstance?.isConnected;
    const statusHtml = `
        <span class="mediasoup-status-indicator" style="
            margin-left: 10px;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
            ${isConnected ? 
                'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
                'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
            }
        ">
            ${isConnected ? '● Connected' : '● Disconnected'}
        </span>
    `;
    summary.append(statusHtml);

    // Add helpful information after the module settings
    const helpInfo = `
        <div class="mediasoup-settings-help" style="
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            font-size: 12px;
            line-height: 1.4;
        ">
            <h4 style="margin-top: 0; color: #495057;">
                <i class="fas fa-info-circle"></i> Quick Setup Guide
            </h4>
            <p style="margin: 10px 0;">
                <strong>1.</strong> Set FoundryVTT A/V to "Third Party Module" in Game Settings → Configure Audio/Video<br>
                <strong>2.</strong> Use the "Configure MediaSoup Server" button above for detailed setup<br>
                <strong>3.</strong> Test your connection before starting a session
            </p>
            <p style="margin: 10px 0; padding: 8px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 3px;">
                <i class="fas fa-exclamation-triangle"></i> 
                <strong>Important:</strong> FoundryVTT must be configured for "Third Party Module" A/V mode for this plugin to work.
            </p>
        </div>
    `;
    
    moduleDetails.find('.form-group').last().after(helpInfo);
}

/**
 * Scene controls integration for MediaSoupVTT
 */


function setupSceneControls() {
    Hooks.on('getSceneControlButtons', (controls) => {
        let avControlsGroup = controls.find(c => c.name === `${MODULE_ID}-controls`);
        if (!avControlsGroup) {
            avControlsGroup = {
                name: `${MODULE_ID}-controls`,
                title: 'MediaSoup A/V',
                layer: `${MODULE_ID}-layer`,
                icon: 'fas fa-network-wired',
                tools: [],
                activeTool: ''
            };
            controls.push(avControlsGroup);
        } else {
            avControlsGroup.tools = [];
        }

        const commonOnClick = async (action) => {
            const clientInstance = window.MediaSoupVTT_Client;
            if (!clientInstance) {
                ui.notifications.error(`${MODULE_TITLE}: Client not ready.`);
                return;
            }
            if (!clientInstance.isConnected && !['connect', 'disconnect'].includes(action)) {
                ui.notifications.warn(`${MODULE_TITLE}: Not connected to MediaSoup server.`);
                return;
            }
            try {
                switch (action) {
                case 'connect':
                    if (clientInstance.isConnected || clientInstance.isConnecting) {
                        clientInstance.disconnect();
                    } else if (!clientInstance.serverUrl) {
                        ui.notifications.warn(`${MODULE_TITLE}: Server URL not set.`);
                    } else {
                        await clientInstance.connect();
                    }
                    break;
                case 'toggleAudio': 
                    await clientInstance.toggleAudioMute(); 
                    break;
                case 'toggleVideo': 
                    await clientInstance.toggleVideoEnabled(); 
                    break;
                }
            } catch (error) {
                log(`Error in scene control action '${action}': ${error.message}`, 'error');
                ui.notifications.error(`${MODULE_TITLE}: Action failed - ${error.message}`);
            }
        };

        avControlsGroup.tools.push(
            { 
                name: MODULE_ID + '-toggle', 
                title: 'Connect MediaSoup A/V', 
                icon: 'fas fa-headset', 
                onClick: () => commonOnClick('connect'), 
                button: true, 
                'data-tool': MODULE_ID + '-toggle' 
            },
            { 
                name: MODULE_ID + '-media-mic', 
                title: 'Start Microphone', 
                icon: 'fas fa-microphone', 
                onClick: () => commonOnClick('toggleAudio'), 
                button: true, 
                visible: false, 
                'data-tool': `${MODULE_ID}-media-mic` 
            },
            { 
                name: MODULE_ID + '-media-webcam', 
                title: 'Start Webcam', 
                icon: 'fas fa-video', 
                onClick: () => commonOnClick('toggleVideo'), 
                button: true, 
                visible: false, 
                'data-tool': `${MODULE_ID}-media-webcam` 
            }
        );

        // Update visibility after adding
        const clientInstance = window.MediaSoupVTT_Client;
        if (clientInstance) {
            clientInstance._updateConnectionStatus(
                clientInstance.isConnected ? 'connected' : 
                    (clientInstance.isConnecting ? 'connecting' : 'disconnected')
            );
            if (clientInstance.isConnected) {
                clientInstance._updateMediaButtonState(
                    APP_DATA_TAG_MIC, 
                    clientInstance.producers.has(APP_DATA_TAG_MIC), 
                    clientInstance.producers.get(APP_DATA_TAG_MIC)?.paused
                );
                clientInstance._updateMediaButtonState(
                    APP_DATA_TAG_WEBCAM, 
                    clientInstance.producers.has(APP_DATA_TAG_WEBCAM), 
                    clientInstance.producers.get(APP_DATA_TAG_WEBCAM)?.paused
                );
            }
        }
    });
}

/**
 * Player list integration for MediaSoupVTT
 */


function setupPlayerListHooks() {
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

/**
 * CSS styles for MediaSoupVTT UI elements
 */

function injectStyles() {
    const styles = `
        .mediasoup-video-container {
            max-width: 160px;
            max-height: 120px;
            margin-top: 5px;
            overflow: hidden;
            border-radius: 4px;
            background-color: #111;
        }
        .mediasoup-remote-video, .mediasoup-video-preview {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .mediasoup-video-preview {
            position: fixed;
            bottom: 70px;
            right: 20px;
            width: 200px; 
            height: 150px;
            border: 2px solid #555;
            background-color: black;
            z-index: 1050;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        #player-list .player .player-name {
            position: relative;
            z-index: 1;
        }
    `;
    $('head').append(`<style id="mediasoup-vtt-styles">${styles}</style>`);
}

/**
 * MediaSoupVTT - Main entry point for FoundryVTT MediaSoup Plugin
 * 
 * A WebRTC audio/video communication module for FoundryVTT using MediaSoup SFU server
 */


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
    
    if (!window.mediasoupClient) {
        ui.notifications.error(`${MODULE_TITLE}: mediasoup-client library was not found. Plugin will not function.`, { permanent: true });
        return;
    }

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
//# sourceMappingURL=mediasoup-vtt.js.map
