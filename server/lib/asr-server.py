#!/usr/bin/env python3
"""
ASR Server - Persistent process for fast recognition
Communicates via stdin/stdout (JSON lines)
"""

import sys
import os
import json
import io

# Set modelscope cache directory (use project root/models)
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))
modelscope_cache = os.path.join(project_root, 'models')
os.environ['MODELSCOPE_CACHE'] = modelscope_cache
os.environ['MODELSCOPE_HOME'] = modelscope_cache
os.environ['MODELSCOPE_LOG_LEVEL'] = 'error'

# Global model instance (loaded once)
funasr_model = None
model_load_time = 0

def load_model():
    """Load model once at startup"""
    global funasr_model, model_load_time
    
    if funasr_model is not None:
        return True
    
    import time
    start = time.time()
    
    try:
        from funasr import AutoModel
        print("[ASR-SERVER] Loading model...", file=sys.stderr)
        funasr_model = AutoModel(
            model="iic/speech_seaco_paraformer_large_asr_nat-zh-cn-16k-common-vocab8404-pytorch",
            disable_update=True,
            trust_remote_code=True,
            device="cpu"
        )
        model_load_time = time.time() - start
        print(f"[ASR-SERVER] Model loaded in {model_load_time:.1f}s", file=sys.stderr)
        return True
    except Exception as e:
        print(f"[ASR-SERVER] Failed to load model: {e}", file=sys.stderr)
        return False

def recognize(audio_path: str, language: str = "zh", hotwords: str = ""):
    """Recognize audio using loaded model"""
    import time
    
    if funasr_model is None:
        return {"error": "Model not loaded"}
    
    start_time = time.time()
    
    # Get audio duration
    try:
        import wave
        with wave.open(audio_path, 'rb') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            audio_duration = frames / float(rate)
    except:
        audio_duration = 10
    
    # Recognize
    try:
        rec_start = time.time()
        if hotwords:
            result = funasr_model.generate(input=audio_path, hotword=hotwords)
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
        
        recognition_time = time.time() - rec_start
        total_time = time.time() - start_time
        
        return {
            "text": text.strip(),
            "language": language,
            "backend": "funasr",
            "audio_duration": round(audio_duration, 2),
            "recognition_time": round(recognition_time, 2),
            "total_time": round(total_time, 2),
            "rtf": round(recognition_time / max(audio_duration, 0.1), 3),
        }
    except Exception as e:
        return {"error": str(e)}

def main():
    """Main server loop - read JSON from stdin, write JSON to stdout"""
    # Suppress funasr spam
    old_stderr = sys.stderr
    sys.stderr = io.StringIO()
    
    # Load model at startup
    if not load_model():
        print(json.dumps({"status": "error", "message": "Failed to load model"}))
        sys.exit(1)
    
    # Restore stderr for our messages
    sys.stderr = old_stderr
    print("[ASR-SERVER] Ready", file=sys.stderr)
    
    # Process requests
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            request = json.loads(line.strip())
            command = request.get("cmd")
            
            if command == "recognize":
                audio_path = request.get("audio_path", "")
                language = request.get("language", "zh")
                hotwords = request.get("hotwords", "")
                
                result = recognize(audio_path, language, hotwords)
                print(json.dumps(result, ensure_ascii=False))
                sys.stdout.flush()
            
            elif command == "ping":
                print(json.dumps({"status": "ok", "model_loaded": funasr_model is not None}))
                sys.stdout.flush()
            
            elif command == "exit":
                print(json.dumps({"status": "exiting"}))
                sys.stdout.flush()
                break
                
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON"}))
            sys.stdout.flush()
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.stdout.flush()

if __name__ == "__main__":
    main()
