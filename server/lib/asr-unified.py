#!/usr/bin/env python3
"""
Unified ASR Script - Supports multiple backends:
1. FunASR (paraformer-zh) - Best for Chinese/Chinese-English mixed
2. faster-whisper - Best for English/other languages (4x faster than openai-whisper)

Usage:
    python3 asr-unified.py <audio_path> [language] [hotwords]
    
Args:
    audio_path: Path to audio file (wav, mp3, etc.)
    language: 'zh' (Chinese), 'en' (English), 'mixed' (Chinese-English mixed)
    hotwords: Space-separated hotwords for better recognition (optional)

Performance:
    - FunASR RTF: ~0.1-0.2 (1s audio takes 0.1-0.2s to process)
    - Whisper RTF: ~0.3-0.5 (1s audio takes 0.3-0.5s to process)
    - 50 words (~10-15s audio): FunASR ~1.5-3s, Whisper ~3-7s
"""

import sys
import os
import json
import io
import time

# Set modelscope cache directory (use project root/models)
script_dir = os.path.dirname(os.path.abspath(__file__))
# Go up to project root (server/lib -> server -> project root)
project_root = os.path.dirname(os.path.dirname(script_dir))
modelscope_cache = os.path.join(project_root, 'models')
os.environ['MODELSCOPE_CACHE'] = modelscope_cache
os.environ['MODELSCOPE_HOME'] = modelscope_cache
os.environ['MODELSCOPE_LOG_LEVEL'] = 'error'  # Reduce log noise

if not os.path.exists(modelscope_cache):
    os.makedirs(modelscope_cache, exist_ok=True)

# Global variables for models
funasr_model = None
funasr_model_en = None
whisper_model = None
model_backend = None  # 'funasr' or 'whisper'

# Performance tracking
model_load_time = 0
last_recognition_time = 0

def get_cache_dir():
    """Get FunASR model cache directory"""
    return os.path.join(modelscope_cache, 'models', 'damo')

def check_model_cached(model_name: str) -> bool:
    """Check if FunASR model is already downloaded"""
    # FunASR 1.3+ uses iic/ prefix and new model names
    cache_patterns = [
        os.path.join(modelscope_cache, 'models', 'iic', 'speech_seaco_paraformer_large_asr_nat-zh-cn-16k-common-vocab8404-pytorch'),
        os.path.join(modelscope_cache, 'hub', 'models', 'iic', 'speech_seaco_paraformer_large_asr_nat-zh-cn-16k-common-vocab8404-pytorch'),
        os.path.join(os.path.expanduser('~'), '.cache', 'modelscope', 'hub', 'models', 'iic', 'speech_seaco_paraformer_large_asr_nat-zh-cn-16k-common-vocab8404-pytorch'),
    ]
    
    for full_path in cache_patterns:
        if os.path.exists(full_path) and len(os.listdir(full_path)) > 0:
            return True
    
    return False

def load_funasr_models():
    """Load FunASR models for Chinese and English"""
    global funasr_model, funasr_model_en, model_load_time
    
    if funasr_model is not None:
        return True
    
    start_time = time.time()
        
    try:
        from funasr import AutoModel
        
        # Load Chinese model (also good for Chinese-English mixed)
        print("[ASR] Loading FunASR Chinese model...", file=sys.stderr)
        zh_cached = check_model_cached('paraformer-zh')
        
        if not zh_cached:
            print("[ASR] Downloading Chinese model (first time, ~2GB)...", file=sys.stderr)
        
        # Use model name - FunASR will find it in MODELSCOPE_CACHE
        # or download if not exists
        funasr_model = AutoModel(
            model="iic/speech_seaco_paraformer_large_asr_nat-zh-cn-16k-common-vocab8404-pytorch",
            disable_update=True,
            trust_remote_code=True,
            device="cpu"
        )
        
        model_load_time = time.time() - start_time
        print(f"[ASR] Chinese model loaded in {model_load_time:.1f}s", file=sys.stderr)
        
        return True
    except ImportError:
        print("[ASR] FunASR not installed", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[ASR] Failed to load FunASR: {e}", file=sys.stderr)
        return False

def load_whisper_model():
    """Load faster-whisper model for English recognition"""
    global whisper_model, model_load_time
    
    if whisper_model is not None:
        return True
    
    start_time = time.time()
        
    try:
        from faster_whisper import WhisperModel
        print("[ASR] Loading faster-whisper model...", file=sys.stderr)
        whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
        model_load_time = time.time() - start_time
        print(f"[ASR] faster-whisper loaded in {model_load_time:.1f}s", file=sys.stderr)
        return True
    except ImportError:
        print("[ASR] faster-whisper not installed. Run: pip install faster-whisper", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[ASR] Failed to load faster-whisper: {e}", file=sys.stderr)
        return False

def init_models():
    """Initialize available models"""
    global model_backend
    
    # Try FunASR first (better for Chinese)
    if load_funasr_models():
        model_backend = 'funasr'
        return True
    
    # Fallback to Whisper
    if load_whisper_model():
        model_backend = 'whisper'
        return True
        
    return False

def get_optimal_backend(language: str) -> str:
    """Get optimal backend based on language"""
    # Language-based backend selection:
    # - zh: FunASR (best for Chinese)
    # - en: Whisper (best for English)  
    # - mixed: FunASR (best for code-switching)
    if language == 'en':
        # For pure English, prefer Whisper if available
        if whisper_model is not None:
            return 'whisper'
        elif funasr_model is not None:
            return 'funasr'
    else:
        # For Chinese or mixed, prefer FunASR
        if funasr_model is not None:
            return 'funasr'
        elif whisper_model is not None:
            return 'whisper'
    
    return model_backend or 'funasr'

def recognize_with_funasr(audio_path: str, language: str, hotwords: str = ""):
    """Recognize using FunASR"""
    global funasr_model, last_recognition_time
    
    start_time = time.time()
    
    # Build hotword string
    hotword_str = hotwords if hotwords else None
    
    # Generate transcription
    if hotword_str:
        result = funasr_model.generate(input=audio_path, hotword=hotword_str)
    else:
        result = funasr_model.generate(input=audio_path)
    
    # Extract text
    if isinstance(result, list) and len(result) > 0:
        if isinstance(result[0], dict) and 'text' in result[0]:
            text = result[0]['text']
        else:
            text = str(result[0])
    else:
        text = str(result)
    
    last_recognition_time = time.time() - start_time
    return text.strip()

def recognize_with_whisper(audio_path: str, language: str):
    """Recognize using faster-whisper"""
    global whisper_model, last_recognition_time
    
    start_time = time.time()
    
    # Map language codes
    lang_map = {
        'zh': 'zh',
        'en': 'en',
        'mixed': 'zh'  # Use Chinese for mixed
    }
    lang_code = lang_map.get(language, language)
    
    # faster-whisper recognition
    segments, info = whisper_model.transcribe(audio_path, language=lang_code)
    text = " ".join([segment.text for segment in segments])
    
    last_recognition_time = time.time() - start_time
    return text.strip()

def estimate_recognition_time(audio_duration: float, backend: str) -> float:
    """Estimate recognition time based on audio duration"""
    # RTF (Real-Time Factor) estimates:
    # FunASR: 0.1-0.2 (very fast)
    # Whisper: 0.3-0.5 (moderate)
    rtf = 0.15 if backend == 'funasr' else 0.4
    return audio_duration * rtf

def recognize(audio_path: str, language: str = "zh", hotwords: str = ""):
    """Main recognition function with intelligent backend selection"""
    global model_backend, last_recognition_time
    
    total_start = time.time()
    
    # Initialize models if not already done
    if model_backend is None:
        if not init_models():
            return {"error": "No ASR backend available"}
    
    # Get audio duration for estimation
    try:
        import wave
        with wave.open(audio_path, 'rb') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            audio_duration = frames / float(rate)
    except:
        audio_duration = 10  # Default estimate
    
    # Select optimal backend based on language
    selected_backend = get_optimal_backend(language)
    
    try:
        # Use appropriate backend
        if selected_backend == 'funasr' and funasr_model is not None:
            text = recognize_with_funasr(audio_path, language, hotwords)
            backend_used = 'funasr'
        elif whisper_model is not None:
            text = recognize_with_whisper(audio_path, language)
            backend_used = 'whisper'
        else:
            return {"error": "No suitable backend available"}
        
        total_time = time.time() - total_start
        
        return {
            "text": text,
            "language": language,
            "backend": backend_used,
            "audio_duration": round(audio_duration, 2),
            "recognition_time": round(last_recognition_time, 2),
            "total_time": round(total_time, 2),
            "rtf": round(last_recognition_time / max(audio_duration, 0.1), 3),
            "estimated_time": round(estimate_recognition_time(audio_duration, backend_used), 2)
        }
    except Exception as e:
        return {"error": str(e)}

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ('--help', '-h'):
        print(json.dumps({"status": "ok", "message": "ASR unified script"}))
        sys.exit(0)
    
    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "zh"
    hotwords = sys.argv[3] if len(sys.argv) > 3 else ""
    
    # Check if file exists
    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"Audio file not found: {audio_path}"}))
        sys.exit(1)
    
    result = recognize(audio_path, language, hotwords)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    # Suppress stdout from model loading, but keep stderr for errors
    main()
