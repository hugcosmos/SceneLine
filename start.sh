#!/bin/bash

# SceneLine Startup Script
# Features: Port check, background run, log rotation, auto-restart prompt

set -e

APP_NAME="SceneLine"
PORT="${PORT:-5000}"
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/sceneline.log"
PID_FILE="$LOG_DIR/sceneline.pid"

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

# Create logs directory
mkdir -p "$LOG_DIR"

# Check if port is in use
check_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        lsof -Pi :"$port" -sTCP:LISTEN -t &> /dev/null
    elif command -v netstat &> /dev/null; then
        netstat -tuln 2>/dev/null | grep -q ":$port "
    elif command -v ss &> /dev/null; then
        ss -tuln 2>/dev/null | grep -q ":$port "
    else
        # Fallback: try to connect
        (echo > /dev/tcp/localhost/"$port") 2>/dev/null
    fi
}

# Get PID using the port
get_port_pid() {
    local port=$1
    if command -v lsof &> /dev/null; then
        lsof -Pi :"$port" -sTCP:LISTEN -t 2>/dev/null | head -1
    elif command -v fuser &> /dev/null; then
        fuser "$port"/tcp 2>/dev/null | tr -d ' '
    fi
}

# Check for existing process
if check_port "$PORT"; then
    EXISTING_PID=$(get_port_pid "$PORT")
    log_warn "Port $PORT is already in use (PID: ${EXISTING_PID:-unknown})"
    echo ""
    echo -n "Do you want to stop the existing service and restart? [Y/n]: "
    read -r response
    
    if [[ -z "$response" || "$response" =~ ^[Yy] ]]; then
        log_info "Stopping existing service..."
        if [ -n "$EXISTING_PID" ]; then
            kill "$EXISTING_PID" 2>/dev/null || true
            sleep 2
            # Force kill if still running
            if kill -0 "$EXISTING_PID" 2>/dev/null; then
                kill -9 "$EXISTING_PID" 2>/dev/null || true
                sleep 1
            fi
        fi
        # Also check pid file
        if [ -f "$PID_FILE" ]; then
            OLD_PID=$(cat "$PID_FILE" 2>/dev/null)
            if [ -n "$OLD_PID" ]; then
                kill "$OLD_PID" 2>/dev/null || true
                sleep 1
            fi
            rm -f "$PID_FILE"
        fi
        log_success "Existing service stopped"
    else
        log_info "Keeping existing service running. Exiting."
        exit 0
    fi
fi

# Check if already running from pid file
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        log_warn "$APP_NAME is already running (PID: $OLD_PID)"
        echo -n "Do you want to restart? [Y/n]: "
        read -r response
        
        if [[ -z "$response" || "$response" =~ ^[Yy] ]]; then
            log_info "Stopping existing process..."
            kill "$OLD_PID" 2>/dev/null || true
            sleep 2
            kill -9 "$OLD_PID" 2>/dev/null || true
            rm -f "$PID_FILE"
            log_success "Existing process stopped"
        else
            log_info "Keeping existing process. Exiting."
            exit 0
        fi
    else
        # Stale pid file
        rm -f "$PID_FILE"
    fi
fi

echo ""
echo -e "${GREEN}🎭 Starting $APP_NAME...${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Install from https://nodejs.org"
    exit 1
fi

# Check Node dependencies
if [ ! -d "node_modules" ] || [ package.json -nt node_modules/.package-lock.json ]; then
    log_info "Installing Node dependencies..."
    npm install || {
        log_error "npm install failed"
        echo ""
        echo "If better-sqlite3 compilation fails, you may need:"
        echo "  macOS: xcode-select --install"
        echo "  Linux: sudo apt-get install build-essential python3"
        exit 1
    }
fi

# Verify better-sqlite3
if ! node -e "require('better-sqlite3')" 2>/dev/null; then
    log_warn "Database module not properly installed, rebuilding..."
    npm rebuild better-sqlite3 || {
        log_error "Failed to rebuild better-sqlite3"
        exit 1
    }
fi

# Check/Create database
DB_FILE="sceneline.db"
if [ -f "$DB_FILE" ]; then
    if [ ! -w "$DB_FILE" ]; then
        log_error "Database file not writable: $DB_FILE"
        exit 1
    fi
    log_info "Database: $DB_FILE"
else
    log_info "Database will be created: $DB_FILE"
fi

# Python environment setup
echo ""
log_info "Checking Python Environment..."

PYTHON_CMD=""
ASR_COMPATIBLE=false
VENV_DIR=".venv"

check_py_ver() {
    $1 -c "import sys; v=sys.version_info; exit(0 if v.major==3 and 9<=v.minor<=11 else 1)" 2>/dev/null
}

find_compatible_python() {
    for cmd in "$@"; do
        if command -v $cmd &> /dev/null && check_py_ver $cmd; then
            echo $cmd
            return 0
        fi
    done
    return 1
}

# Try conda first
if command -v conda &> /dev/null; then
    if conda env list 2>/dev/null | grep -q "^sceneline-env "; then
        eval "$(conda shell.bash hook)" 2>/dev/null || true
        if conda activate sceneline-env 2>/dev/null; then
            export PYTHON_CMD="python"
            export ASR_COMPATIBLE=true
            log_success "Using conda: sceneline-env"
        fi
    fi
    
    if [ -z "$PYTHON_CMD" ]; then
        log_info "Creating sceneline-env with Python 3.11..."
        conda create -n sceneline-env python=3.11 -y 2>&1 | grep -E '(Collecting|Downloading|Preparing|Verifying|Executing|done|error|Error| already exists)' || true
        eval "$(conda shell.bash hook)" 2>/dev/null || true
        if conda activate sceneline-env 2>/dev/null; then
            export PYTHON_CMD="python"
            export ASR_COMPATIBLE=true
            log_success "Created sceneline-env"
        else
            log_warn "Conda setup failed, trying system Python..."
        fi
    fi
fi

# No conda: try system Python with venv
if [ -z "$PYTHON_CMD" ]; then
    COMPATIBLE_PY=$(find_compatible_python python3.11 python3.10 python3.9 python3 python) || true
    
    if [ -n "$COMPATIBLE_PY" ]; then
        PY_VER=$($COMPATIBLE_PY -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
        
        if [ -d "$VENV_DIR" ] && [ -f "$VENV_DIR/bin/python" ]; then
            PYTHON_CMD="$VENV_DIR/bin/python"
            ASR_COMPATIBLE=true
            log_success "Using venv (Python $PY_VER)"
        else
            log_info "Creating venv with Python $PY_VER..."
            $COMPATIBLE_PY -m venv $VENV_DIR 2>&1 | grep -v '^[0-9]*$' || true
            PYTHON_CMD="$VENV_DIR/bin/python"
            ASR_COMPATIBLE=true
            log_success "Created venv"
        fi
    else
        FOUND_PY=""
        FOUND_VER=""
        for cmd in python3 python; do
            if command -v $cmd &> /dev/null; then
                FOUND_PY=$cmd
                FOUND_VER=$($cmd -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "unknown")
                break
            fi
        done
        
        if [ -n "$FOUND_PY" ]; then
            log_warn "Found Python $FOUND_VER, but ASR requires 3.9-3.11"
            echo ""
            echo "Options:"
            echo "  1. Install conda: https://docs.conda.io/en/latest/miniconda.html"
            echo "  2. Install Python 3.9-3.11"
            echo ""
            log_info "Starting without voice recognition..."
            PYTHON_CMD="$FOUND_PY"
        else
            log_warn "Python not found. Starting without voice recognition..."
        fi
    fi
fi

# Check if this is first time startup (no log file exists)
FIRST_STARTUP=false
if [ ! -f "$LOG_FILE" ] && [ -n "$PYTHON_CMD" ] && [ "$ASR_COMPATIBLE" = true ]; then
    FIRST_STARTUP=true
fi

# First time setup: Install all dependencies
if [ "$FIRST_STARTUP" = true ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 First time starting $APP_NAME!${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⏱️  Time Estimate:${NC}"
    echo "   • Step 1: Install Python packages (~500MB)  →  2-3 minutes"
    echo "   • Step 2: Download ASR model (~2GB)         →  3-5 minutes"
    echo "   • Step 3: Pre-load model to memory          →  30-40 seconds"
    echo ""
    echo -e "${YELLOW}   Total: 6-9 minutes for first-time setup${NC}"
    echo ""
    log_info "This is a ONE-TIME setup. Subsequent starts will be fast (~5 seconds)."
    echo ""
    
    # Ask about China mirror (with 10 second timeout, default Y)
    echo -n "Are you in China Mainland? Use Alibaba Cloud mirror for faster download? [Y/n] (default: Y, timeout 10s): "
    if read -t 10 use_china_mirror; then
        : # User input received
    else
        echo ""
        use_china_mirror="Y"
        log_info "No input, using default (Y)..."
    fi
    
    if [[ -z "$use_china_mirror" || "$use_china_mirror" =~ ^[Yy] ]]; then
        PIP_INDEX="-i https://mirrors.aliyun.com/pypi/simple/"
        log_info "Using Alibaba Cloud mirror (recommended for China)..."
    else
        PIP_INDEX=""
        log_info "Using default PyPI (may be slower in China)..."
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log_info "Step 1/3: Installing Python packages (torch, funasr, etc.)..."
    log_info "This may take 2-3 minutes..."
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Install all packages from requirements.txt
    if $PYTHON_CMD -m pip install -r requirements.txt $PIP_INDEX; then
        log_success "Step 1/3 complete: Python packages installed"
        
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        log_info "Step 2/3: Downloading ASR model (~2GB) to local directory..."
        log_info "This is a one-time download (3-5 minutes)..."
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        MODEL_DIR="$PWD/models"
        mkdir -p "$MODEL_DIR"
        
        # Set environment to download to local directory
        export MODELSCOPE_CACHE="$MODEL_DIR"
        export MODELSCOPE_HOME="$MODEL_DIR"
        
        # Pre-download the model
        $PYTHON_CMD -c "
from funasr import AutoModel
import sys
print('[ASR] Starting model download...')
try:
    model = AutoModel(
        model='iic/speech_seaco_paraformer_large_asr_nat-zh-cn-16k-common-vocab8404-pytorch',
        disable_update=True,
        device='cpu'
    )
    print('[ASR] Model downloaded successfully!')
except Exception as e:
    print(f'[ASR] Warning: {e}')
    sys.exit(0)
" 2>&1
        
        log_success "Step 2/3 complete: Model downloaded"
        log_success "First-time setup complete! Starting server..."
    else
        log_error "Failed to install packages"
        log_info "Tip: Run manually: pip install -r requirements.txt $PIP_INDEX"
        exit 1
    fi
    echo ""
elif [ -n "$PYTHON_CMD" ] && [ "$ASR_COMPATIBLE" = true ]; then
    log_info "Voice recognition ready"
elif [ -n "$PYTHON_CMD" ] && [ "$ASR_COMPATIBLE" = false ]; then
    log_info "Tip: Install conda for automatic Python management"
fi

# Export Python command for Node.js
# Note: Must detect AFTER conda activate since activate resets the environment
if command -v conda &> /dev/null && conda env list 2>/dev/null | grep -q "sceneline-env"; then
    # Conda environment exists, use it
    export SCENELINE_PYTHON_CMD="/Users/cosmos/miniconda3/envs/sceneline-env/bin/python"
    # Set model path
    export MODELSCOPE_CACHE="$PWD/models"
    export MODELSCOPE_HOME="$PWD/models"
elif command -v python &> /dev/null; then
    export SCENELINE_PYTHON_CMD="python"
    export MODELSCOPE_CACHE="$PWD/models"
    export MODELSCOPE_HOME="$PWD/models"
else
    export SCENELINE_PYTHON_CMD="python3"
    export MODELSCOPE_CACHE="$PWD/models"
    export MODELSCOPE_HOME="$PWD/models"
fi

# Log rotation - keep last 5 logs
if [ -f "$LOG_FILE" ]; then
    for i in 4 3 2 1; do
        if [ -f "$LOG_FILE.$i" ]; then
            mv "$LOG_FILE.$i" "$LOG_FILE.$((i+1))"
        fi
    done
    mv "$LOG_FILE" "$LOG_FILE.1"
fi

echo ""
log_info "Starting $APP_NAME in background..."
log_info "Log file: $LOG_FILE"
log_info "PID file: $PID_FILE"

# Start in background with nohup
nohup npm run dev > "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo $NEW_PID > "$PID_FILE"

sleep 2

# Check if process started successfully
if kill -0 "$NEW_PID" 2>/dev/null; then
    echo ""
    log_success "$APP_NAME started successfully!"
    log_info "PID: $NEW_PID"
    log_info "URL: http://localhost:$PORT"
    echo ""
    echo -e "${GREEN}Commands:${NC}"
    echo "  View logs:  tail -f $LOG_FILE"
    echo "  Stop:       ./stop.sh"
    echo "  Restart:    ./start.sh"
    echo ""
else
    log_error "Failed to start $APP_NAME. Check logs: $LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
fi
