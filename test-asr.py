#!/usr/bin/env python3
import sys
import json

# Try to import FunASR, fall back to whisper if it fails
try:
    from funasr import AutoModel
    print("FunASR imported successfully")
    use_funasr = True
except ImportError as e:
    print(f"FunASR import failed: {e}")
    try:
        from faster_whisper import WhisperModel
        print("faster-whisper imported successfully")
        use_faster_whisper = True
    except ImportError as e:
        print(f"faster-whisper import failed: {e}")
        try:
            import whisper
            print("whisper imported successfully")
            use_whisper = True
        except ImportError as e:
            print(f"whisper import failed: {e}")
            use_whisper = False
        use_faster_whisper = False
    use_funasr = False

print("\nTesting model loading...")

if use_funasr:
    try:
        model = AutoModel(model="paraformer-zh")
        print("FunASR model loaded successfully")
    except Exception as e:
        print(f"FunASR model loading failed: {e}")
elif use_faster_whisper:
    try:
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
        print("faster-whisper model loaded successfully")
    except Exception as e:
        print(f"faster-whisper model loading failed: {e}")
elif use_whisper:
    try:
        model = whisper.load_model("tiny")
        print("whisper model loaded successfully")
    except Exception as e:
        print(f"whisper model loading failed: {e}")
else:
    print("No ASR models available")
