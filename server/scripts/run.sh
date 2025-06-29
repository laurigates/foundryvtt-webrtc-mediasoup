#!/bin/bash
set -e

# Load environment variables if .env exists
if [ -f .env ]; then
    echo "Loading environment from .env..."
    export $(grep -v '^#' .env | xargs)
fi

# Set default values
export MEDIASOUP_LISTEN_ADDR=${MEDIASOUP_LISTEN_ADDR:-"0.0.0.0:3000"}
export MEDIASOUP_NUM_WORKERS=${MEDIASOUP_NUM_WORKERS:-"1"}
export MEDIASOUP_LOG_LEVEL=${MEDIASOUP_LOG_LEVEL:-"warn"}
export MEDIASOUP_LOG_TAGS=${MEDIASOUP_LOG_TAGS:-"info"}
export MEDIASOUP_RTC_MIN_PORT=${MEDIASOUP_RTC_MIN_PORT:-"10000"}
export MEDIASOUP_RTC_MAX_PORT=${MEDIASOUP_RTC_MAX_PORT:-"10100"}

echo "Starting MediaSoup Server..."
echo "Listen Address: $MEDIASOUP_LISTEN_ADDR"
echo "Workers: $MEDIASOUP_NUM_WORKERS"
echo "Log Level: $MEDIASOUP_LOG_LEVEL"
echo "RTC Ports: $MEDIASOUP_RTC_MIN_PORT-$MEDIASOUP_RTC_MAX_PORT"

# Run the server
cargo run --release