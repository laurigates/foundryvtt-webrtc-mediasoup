#!/bin/bash
set -e

echo "Building MediaSoup Server..."

# Format code
echo "Formatting code..."
cargo fmt

# Run clippy
echo "Running clippy..."
cargo clippy -- -D warnings

# Run tests
echo "Running tests..."
cargo test

# Build release
echo "Building release..."
cargo build --release

echo "Build completed successfully!"
echo "Binary location: target/release/mediasoup-server"