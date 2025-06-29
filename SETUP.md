# MediaSoupVTT Configuration Guide

This guide explains how to configure FoundryVTT to use the MediaSoup WebRTC server for audio/video communication.

## Quick Setup Checklist

- [ ] MediaSoup server is running and accessible
- [ ] FoundryVTT A/V settings configured for "Third Party Module"
- [ ] MediaSoup server URL configured in the plugin
- [ ] Connection tested successfully
- [ ] Browser permissions granted for microphone/camera

## Step 1: Start MediaSoup Server

Ensure your MediaSoup server is running and accessible. The default configuration expects:

```
wss://your-server.com:4443
```

For local testing, you might use:
```
ws://localhost:4443
```

## Step 2: Configure FoundryVTT Audio/Video Settings

**This is the most important step!** FoundryVTT must be configured to use third-party modules for A/V.

1. Go to **Game Settings** → **Configure Audio/Video**
2. Set **Audio/Video Conference Mode** to **"Third Party Module"**
3. Configure your voice activation settings:
   - **Push to Talk**: Hold a key to transmit audio
   - **Voice Activation**: Automatic transmission based on volume threshold
4. Select your preferred microphone and camera devices
5. **Save** the settings
6. **Reload** the page if prompted

## Step 3: Configure MediaSoup Plugin

### Option A: Use the Configuration Dialog (Recommended)

1. Go to **Game Settings** → **Configure Settings**
2. Find the **MediaSoupVTT** section
3. Click **"Configure MediaSoup Server"** button
4. Follow the detailed setup instructions in the dialog
5. Enter your MediaSoup server URL
6. Test the connection
7. Save the configuration

### Option B: Manual Settings Configuration

1. Go to **Game Settings** → **Configure Settings**
2. Find the **MediaSoupVTT** section
3. Set **MediaSoup Server WebSocket URL** to your server URL
4. Enable **Auto-connect to MediaSoup Server** if desired
5. Configure microphone and camera device preferences

## Step 4: Test Your Setup

1. Save all settings and reload if necessary
2. Join or create a game world
3. Check the module status in settings (should show "Connected")
4. Test audio/video with other players

## Troubleshooting

### Common Issues

**"A/V not working" or "No audio/video"**
- ✅ Verify FoundryVTT A/V is set to "Third Party Module"
- ✅ Check that the MediaSoup server is running and accessible
- ✅ Ensure browser permissions are granted for microphone/camera

**"Connection failed"**
- ✅ Verify the server URL is correct (including protocol: ws:// or wss://)
- ✅ Check that the MediaSoup server port is accessible from your network
- ✅ For HTTPS FoundryVTT instances, use wss:// (secure WebSocket)

**"Browser permissions denied"**
- ✅ Grant microphone and camera permissions when prompted
- ✅ Check browser settings to ensure permissions are allowed
- ✅ Try refreshing the page and granting permissions again

**"SSL/Certificate errors"**
- ✅ Use wss:// (secure WebSocket) for HTTPS-hosted FoundryVTT instances
- ✅ Ensure your MediaSoup server has valid SSL certificates
- ✅ For local testing, you may use ws:// with HTTP FoundryVTT

### Debug Information

Enable debug logging in the module settings to see detailed connection information in the browser console.

To check module status:
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for MediaSoupVTT log messages

### Network Requirements

- **Firewall**: Ensure the MediaSoup server port is accessible from client machines
- **WebSocket Support**: Modern browsers support WebSocket connections
- **Media Permissions**: Users must grant microphone/camera permissions

## Advanced Configuration

### Multiple Servers / Load Balancing

For production deployments, you may want to:
- Set up multiple MediaSoup server instances
- Use a load balancer with WebSocket support
- Configure SSL termination at the load balancer

### Security Considerations

- Always use wss:// (secure WebSocket) in production
- Ensure proper firewall configuration
- Consider authentication mechanisms for your MediaSoup server
- Regularly update both FoundryVTT and the MediaSoup components

## Support

If you encounter issues:

1. Check this setup guide carefully
2. Verify all settings are correct
3. Test with the built-in connection test
4. Check browser console for error messages
5. Review MediaSoup server logs for connection issues

For development or advanced configuration, consult the MediaSoup documentation at https://mediasoup.org/