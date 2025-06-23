# MediaSoupVTT

A WebRTC audio/video communication module for FoundryVTT using MediaSoup SFU (Selective Forwarding Unit) server for real-time media streaming between players.

> **Status:** ✅ **Fully Implemented** - Complete MediaSoup client with modular architecture, ready for testing with MediaSoup server.

## Features

- 🎤 **Audio Communication**: Real-time voice chat with push-to-talk and mute controls
- 📹 **Video Streaming**: Webcam sharing with local preview and remote video display
- 🎛️ **Device Management**: Select preferred microphone and camera devices
- 🏗️ **SFU Architecture**: Uses MediaSoup for efficient multi-party communication
- 📊 **Server Recording**: Enables server-side audio recording for external processing
- 🎮 **FoundryVTT Integration**: Seamless integration with player list and scene controls

## Requirements

### Client Requirements
- FoundryVTT v10.291+ (verified up to v13.330)
- Modern web browser with WebRTC support (Chrome/Chromium recommended)
- Microphone and/or camera access permissions

### Server Requirements
- **MediaSoup Server**: Self-hosted MediaSoup signaling server (not included)
- **WebSocket Connection**: WSS recommended for production
- **Network Configuration**: Proper firewall and DTLS-SRTP setup

## Installation

### Development Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/foundryvtt-webrtc-mediasoup.git
   cd foundryvtt-webrtc-mediasoup
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the module:**
   ```bash
   npm run build
   ```

4. **Copy to FoundryVTT modules directory:**
   ```bash
   # Copy the entire project (excluding node_modules)
   cp -r . /path/to/foundrydata/Data/modules/mediasoup-vtt/
   
   # Or use the package command to create a clean zip
   npm run package
   # Then extract mediasoup-vtt.zip to your modules directory
   ```

### Production Installation

1. Download the latest release from the [releases page](https://github.com/yourusername/foundryvtt-webrtc-mediasoup/releases)
2. Extract to your FoundryVTT modules directory
3. Enable the module in FoundryVTT module management

## Development

### Build Commands

```bash
# Development build with file watching
npm run dev

# Production build
npm run build

# Clean build directory
npm run clean

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Create distribution package
npm run package
```

### Project Structure

```
src/
├── client/
│   └── MediaSoupVTTClient.js    # Main WebRTC client logic
├── constants/
│   └── index.js                 # Module constants and message types
├── ui/
│   ├── settings.js              # Settings registration and hooks
│   ├── sceneControls.js         # Scene controls integration
│   ├── playerList.js            # Player list video integration
│   └── styles.js                # CSS injection
├── utils/
│   └── logger.js                # Logging utilities
└── mediasoup-vtt.js             # Main entry point
```

### Module Architecture

- **MediaSoupVTTClient**: Core class handling WebRTC connections, signaling, and media management
- **Modular Design**: Separated concerns across logical modules (client, UI, utils, constants)
- **Settings System**: FoundryVTT settings integration with device enumeration  
- **UI Integration**: Scene controls for A/V buttons and player list video display
- **Signaling Protocol**: Custom WebSocket-based protocol for MediaSoup communication
- **Build System**: Modern ES modules with Rollup bundling and ESLint quality checks

## Configuration

### Module Settings

Access via **Game Settings → Module Settings → MediaSoupVTT**:

- **MediaSoup Server WebSocket URL**: Your MediaSoup server endpoint (e.g., `wss://your.server.com:4443`)
- **Auto-connect**: Automatically connect when joining a world
- **Default Microphone/Camera**: Preferred devices (populated after first connection)
- **Debug Logging**: Enable verbose console logging

### MediaSoup Server Setup

This module requires a separate MediaSoup server. Key server features needed:

- WebSocket signaling endpoint matching the `SIG_MSG_TYPES` protocol
- RTP capabilities negotiation
- WebRTC transport management (createWebRtcTransport, connectTransport)
- Producer/consumer lifecycle handling (produce, consume, close)
- Server-side recording capability (optional)

**Protocol Implementation:** The server must handle all message types defined in `src/constants/index.js`

Refer to [MediaSoup documentation](https://mediasoup.org/) for server implementation guidance.

## Usage

### Basic Operation

1. **Configure Server URL**: Set MediaSoup server WebSocket URL in module settings
2. **Connect**: Click the headset button in scene controls or enable auto-connect
3. **Start Media**: Use microphone and camera buttons to begin streaming
4. **View Remote Streams**: See other players' video in the player list

### Scene Controls

- 🎧 **Connection Toggle**: Connect/disconnect from MediaSoup server
- 🎤 **Microphone**: Start/stop/mute audio capture
- 📹 **Camera**: Start/stop/pause video capture

### Troubleshooting

**Common Issues:**

- **"mediasoup-client library not found"**: The module expects `window.mediasoupClient` to be available. Install mediasoup-client via CDN or bundle it with the module
- **Connection failures**: Check server URL, network connectivity, and firewall settings. Ensure MediaSoup server implements the correct signaling protocol
- **No audio/video**: Verify browser permissions and device access. Check browser developer console for WebRTC errors
- **Poor quality**: Check network bandwidth and MediaSoup server configuration. Monitor WebRTC connection states in console logs
- **Module not loading**: Ensure the built `dist/mediasoup-vtt.js` file exists and module.json points to correct file path

**Debug Logging:**

Enable debug logging in module settings for detailed console output during troubleshooting.

## Implementation Status

### ✅ Completed Features

- **Core MediaSoup Client**: Full WebRTC client implementation with transport management
- **Audio/Video Capture**: Local media capture with device selection and controls
- **Remote Media Handling**: Consumer management for remote audio/video streams  
- **Signaling Protocol**: Complete WebSocket-based communication with MediaSoup server
- **FoundryVTT Integration**: Scene controls, player list, and settings integration
- **v13 Compatibility**: Enhanced player list integration with fallback support for v10-v13
- **Build System**: Modern development workflow with linting and bundling
- **Documentation**: Complete API documentation and setup guides

### 🔄 Ready for Testing

The module is **fully implemented** and ready for integration testing with a MediaSoup server.

## Development Server Requirements

For development and testing, you'll need:

1. **MediaSoup Server**: Implement signaling protocol matching `SIG_MSG_TYPES` constants
2. **Message Types**: Support all message types defined in `src/constants/index.js`
3. **Transport Management**: Handle WebRTC transport creation and connection
4. **Producer/Consumer**: Manage media stream producers and consumers

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration (`npm run lint`)
- Use semantic commit messages
- Test with actual MediaSoup server implementation
- Update documentation for new features
- Run full build and test cycle before PRs: `npm run lint && npm run build`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [MediaSoup](https://mediasoup.org/) - WebRTC SFU library
- [FoundryVTT](https://foundryvtt.com/) - Virtual tabletop platform
- [mediasoup-client](https://www.npmjs.com/package/mediasoup-client) - Client-side MediaSoup library

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/foundryvtt-webrtc-mediasoup/issues)
- **Documentation**: [FoundryVTT API](https://foundryvtt.com/api/) | [MediaSoup Docs](https://mediasoup.org/documentation/)
- **Community**: FoundryVTT Discord server