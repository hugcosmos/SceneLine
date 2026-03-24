#!/bin/bash

# SceneLine Stop Script
# Stops the background service gracefully

APP_NAME="SceneLine"
PORT="${PORT:-5000}"
LOG_DIR="logs"
PID_FILE="$LOG_DIR/sceneline.pid"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to get PID from port
get_port_pid() {
    local port=$1
    if command -v lsof &> /dev/null; then
        lsof -Pi :"$port" -sTCP:LISTEN -t 2>/dev/null | head -1
    elif command -v fuser &> /dev/null; then
        fuser "$port"/tcp 2>/dev/null | tr -d ' '
    elif command -v ss &> /dev/null; then
        ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1
    fi
}

# Check if process is running from PID file
PID_TO_STOP=""

if [ -f "$PID_FILE" ]; then
    PID_FROM_FILE=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$PID_FROM_FILE" ] && kill -0 "$PID_FROM_FILE" 2>/dev/null; then
        PID_TO_STOP="$PID_FROM_FILE"
    fi
fi

# Also check port as fallback
PID_FROM_PORT=$(get_port_pid "$PORT")

if [ -z "$PID_TO_STOP" ] && [ -n "$PID_FROM_PORT" ]; then
    PID_TO_STOP="$PID_FROM_PORT"
fi

# Stop the process
if [ -n "$PID_TO_STOP" ]; then
    log_info "Stopping $APP_NAME (PID: $PID_TO_STOP)..."
    
    # Try graceful shutdown first
    kill "$PID_TO_STOP" 2>/dev/null || true
    
    # Wait for process to exit
    for i in {1..10}; do
        if ! kill -0 "$PID_TO_STOP" 2>/dev/null; then
            break
        fi
        sleep 0.5
    done
    
    # Force kill if still running
    if kill -0 "$PID_TO_STOP" 2>/dev/null; then
        log_warn "Process not responding, force stopping..."
        kill -9 "$PID_TO_STOP" 2>/dev/null || true
        sleep 1
    fi
    
    # Verify stopped
    if ! kill -0 "$PID_TO_STOP" 2>/dev/null; then
        log_success "$APP_NAME stopped successfully"
        rm -f "$PID_FILE"
    else
        log_error "Failed to stop $APP_NAME"
        exit 1
    fi
else
    # Check if port is still in use by something else
    PORT_PID=$(get_port_pid "$PORT")
    if [ -n "$PORT_PID" ]; then
        log_warn "Found process using port $PORT (PID: $PORT_PID), but not from our PID file"
        echo -n "Do you want to stop it? [y/N]: "
        read -r response
        if [[ "$response" =~ ^[Yy] ]]; then
            kill "$PORT_PID" 2>/dev/null || true
            sleep 1
            log_success "Process stopped"
        else
            log_info "Keeping process running"
        fi
    else
        log_info "$APP_NAME is not running"
    fi
    rm -f "$PID_FILE"
fi
