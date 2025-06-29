# MediaSoup Server for FoundryVTT

A high-performance MediaSoup server implementation in Rust, designed specifically for the FoundryVTT WebRTC plugin.

## Features

- **High Performance**: Built in Rust for maximum efficiency and low latency
- **WebSocket Signaling**: Compatible with the FoundryVTT client signaling protocol
- **Multi-Worker Support**: Scalable worker management for handling multiple rooms
- **Configurable**: Environment-based configuration for flexible deployment
- **Production Ready**: Comprehensive error handling and logging

## Quick Start

### Prerequisites

- Rust 1.70+ installed
- Network connectivity for WebRTC (UDP ports)

### Installation

1. **Clone and build:**
```bash
cd server
cargo build --release
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run the server:**
```bash
cargo run --release
```

## Configuration

The server is configured through environment variables. Copy `.env.example` to `.env` and modify as needed:

### Basic Configuration

- `MEDIASOUP_LISTEN_ADDR`: WebSocket server address (default: `0.0.0.0:3000`)
- `MEDIASOUP_NUM_WORKERS`: Number of MediaSoup workers (default: `1`)

### MediaSoup Worker Configuration

- `MEDIASOUP_LOG_LEVEL`: Worker log level (`debug`, `warn`, `error`)
- `MEDIASOUP_LOG_TAGS`: Comma-separated log tags
- `MEDIASOUP_RTC_MIN_PORT`: Minimum RTC port (default: `10000`)
- `MEDIASOUP_RTC_MAX_PORT`: Maximum RTC port (default: `10100`)

### Network Configuration

- `MEDIASOUP_ANNOUNCED_IP`: Public IP for NAT traversal (optional)

## Deployment

### Docker

Create a `Dockerfile`:

```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/mediasoup-server /usr/local/bin/
EXPOSE 3000
EXPOSE 10000-10100/udp
CMD ["mediasoup-server"]
```

### Systemd Service

Create `/etc/systemd/system/mediasoup-server.service`:

```ini
[Unit]
Description=MediaSoup Server for FoundryVTT
After=network.target

[Service]
Type=simple
User=mediasoup
Group=mediasoup
EnvironmentFile=/etc/mediasoup/server.env
ExecStart=/usr/local/bin/mediasoup-server
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Firewall Configuration

The server requires the following ports:

- **WebSocket**: Port 3000 (TCP) - configurable via `MEDIASOUP_LISTEN_ADDR`
- **RTC Media**: Ports 10000-10100 (UDP) - configurable via `MEDIASOUP_RTC_*_PORT`

### UFW Example

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 10000:10100/udp
```

### iptables Example

```bash
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
iptables -A INPUT -p udp --dport 10000:10100 -j ACCEPT
```

## Client Configuration

Configure the FoundryVTT client to connect to your server:

1. Install the MediaSoupVTT module in FoundryVTT
2. In module settings, set **MediaSoup Server URL** to:
   - Local: `ws://localhost:3000`
   - Remote: `ws://your-server-ip:3000`
   - Secure: `wss://your-domain:3000` (requires reverse proxy)

## Reverse Proxy (Production)

For production deployments, use a reverse proxy with SSL:

### Nginx Example

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Architecture

### Components

- **WebSocket Server**: Handles signaling between clients
- **Worker Manager**: Manages MediaSoup worker processes
- **Room Management**: Handles peer connections and media routing
- **Signaling Protocol**: Compatible with FoundryVTT client expectations

### Message Flow

1. Client connects via WebSocket
2. Client requests router RTP capabilities
3. Client creates WebRTC transports
4. Client produces/consumes media streams
5. Server routes media between peers

## Development

### Building

```bash
cargo build
```

### Running with Debug Logs

```bash
RUST_LOG=debug cargo run
```

### Testing

```bash
cargo test
```

### Linting

```bash
cargo clippy
cargo fmt
```

## Monitoring

The server provides structured logging compatible with standard log aggregators:

- **Tracing**: Structured events with context
- **Performance**: Worker and transport metrics
- **Errors**: Detailed error reporting

Example log output:
```
2024-01-15T10:30:00.123Z INFO mediasoup_server: Starting MediaSoup server for FoundryVTT
2024-01-15T10:30:00.456Z INFO mediasoup_server: Created MediaSoup worker 0 with ID worker_12345
2024-01-15T10:30:00.789Z INFO mediasoup_server: WebSocket server listening on 0.0.0.0:3000
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```
   Error: Address already in use
   ```
   Solution: Change `MEDIASOUP_LISTEN_ADDR` or stop conflicting service

2. **No Network Connectivity**
   ```
   Error: Failed to create transport
   ```
   Solution: Check firewall rules for RTC ports

3. **Worker Startup Failure**
   ```
   Error: Failed to spawn worker
   ```
   Solution: Ensure sufficient system resources

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
MEDIASOUP_LOG_LEVEL=debug RUST_LOG=debug cargo run
```

## Performance Tuning

### System Limits

Increase file descriptor limits for high-concurrency deployments:

```bash
# /etc/security/limits.conf
mediasoup soft nofile 65536
mediasoup hard nofile 65536
```

### Worker Scaling

Scale workers based on CPU cores:

```bash
MEDIASOUP_NUM_WORKERS=4  # For 4-core system
```

### Port Range

Adjust port range for concurrent connections:

```bash
MEDIASOUP_RTC_MIN_PORT=10000
MEDIASOUP_RTC_MAX_PORT=20000  # Supports ~10,000 connections
```

## License

This MediaSoup server implementation is designed specifically for the FoundryVTT WebRTC plugin and follows the same licensing terms.