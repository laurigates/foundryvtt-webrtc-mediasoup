# Multi-stage build for optimized production image
FROM rust:1.70-bullseye as builder

# Create app directory
WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Create a dummy main.rs to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies
RUN cargo build --release && rm -rf src target/release/deps/mediasoup_server*

# Copy source code
COPY src ./src

# Build application
RUN cargo build --release

# Runtime stage
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r mediasoup && useradd -r -g mediasoup mediasoup

# Create directories
RUN mkdir -p /app && chown mediasoup:mediasoup /app

# Copy binary
COPY --from=builder /app/target/release/mediasoup-server /usr/local/bin/mediasoup-server
RUN chmod +x /usr/local/bin/mediasoup-server

# Switch to non-root user
USER mediasoup
WORKDIR /app

# Expose ports
EXPOSE 3000
EXPOSE 10000-10100/udp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run the application
CMD ["mediasoup-server"]