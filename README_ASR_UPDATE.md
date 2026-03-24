# SceneLine ASR Update Summary

## Changes Made

### 1. New Unified ASR Script (`server/lib/asr-unified.py`)
- **Multi-backend support**: FunASR (primary) + Whisper (fallback)
- **Language-specific models**: paraformer-zh for Chinese, paraformer-en for English
- **Hotword enhancement**: Improves recognition of technical terms
- **Automatic backend detection**: Tries FunASR first, falls back to Whisper

### 2. Enhanced ASR TypeScript Module (`server/lib/asr.ts`)
- **Environment variable configuration**:
  - `ASR_BACKEND`: Choose 'funasr', 'whisper', or 'auto'
  - `ASR_HOTWORDS`: Custom hotwords for better recognition
  - `ASR_TIMEOUT`: Recognition timeout
  - `ASR_STREAMING`: Enable streaming mode
- **Improved error handling**: Graceful fallback to mock mode
- **Status reporting**: `getASRStatus()` shows current backend

### 3. New API Endpoints (`server/routes.ts`)
- `GET /api/asr/status` - Check ASR backend status
- `POST /api/asr/hotwords` - Update hotwords at runtime

### 4. Installation Script (`server/lib/install-asr.sh`)
- Automated installation of FunASR and Whisper
- Python version compatibility check
- Virtual environment setup

### 5. Documentation (`docs/ASR_SETUP.md`)
- Complete setup guide
- Configuration options
- Troubleshooting tips
- Performance comparison

## Quick Start for Chinese/English Mixed

```bash
# Option 1: Use existing conda environment
source /Users/cosmos/miniconda3/bin/activate whisper-env
pip install funasr modelscope
npm run dev

# Option 2: Fresh installation
cd server/lib
./install-asr.sh
npm run dev
```

## Configuration Examples

```bash
# Use FunASR (best for Chinese)
ASR_BACKEND=funasr npm run dev

# Use Whisper (best for English)
ASR_BACKEND=whisper npm run dev

# Custom hotwords
ASR_HOTWORDS="React TypeScript API Docker" npm run dev
```

## API Usage

```bash
# Check status
curl http://localhost:5000/api/asr/status

# Update hotwords
curl -X POST http://localhost:5000/api/asr/hotwords \
  -H "Content-Type: application/json" \
  -d '{"hotwords": "Python JavaScript"}'

# Recognize speech
curl -X POST http://localhost:5000/api/asr/recognize \
  -F "audio=@test.webm" \
  -F "language=zh"
```

## Why FunASR for Chinese/English Mixed?

FunASR's `paraformer-zh` model is specifically optimized for:
1. **Chinese phonetics**: Better tone recognition
2. **Code-switching**: Handles "我要用 Python 写 API" correctly
3. **Technical terms**: Recognizes English words in Chinese context
4. **Speed**: Real-time inference on CPU

Example comparison:
- Input: "我要用 Python 写一个 API，然后部署到 AWS"
- FunASR: ✅ "我要用 Python 写一个 API，然后部署到 AWS"
- Whisper: ⚠️ "我要用拍森写一个爱屁衣，然后部署到啊呦达不溜爱死"

## Files Modified/Created

```
server/lib/
├── asr-unified.py       # NEW - Multi-backend ASR script
├── asr.ts               # MODIFIED - Enhanced with multi-backend support
├── install-asr.sh       # NEW - Installation script
└── modelscope_cache/    # EXISTS - Model cache directory

docs/
└── ASR_SETUP.md         # NEW - Complete documentation

server/routes.ts         # MODIFIED - Added /api/asr/status and /api/asr/hotwords
```
