#!/usr/bin/env python3
import sys
import os
import json
import time

# Set modelscope cache directory to a writable location
modelscope_cache = os.path.join(os.path.dirname(__file__), 'modelscope_cache')

# Set multiple environment variables to ensure modelscope uses our directory
os.environ['MODELSCOPE_CACHE'] = modelscope_cache
os.environ['MODELSCOPE_HOME'] = modelscope_cache
os.environ['HOME'] = os.path.dirname(__file__)  # Override HOME to avoid .modelscope in user home

# Create cache directory if it doesn't exist
if not os.path.exists(modelscope_cache):
    os.makedirs(modelscope_cache, exist_ok=True)

# Import FunASR and load model once at startup
print("[ASR Service] Loading FunASR model...")
try:
    from funasr import AutoModel
    model = AutoModel(model="paraformer-zh", disable_update=True, trust_remote_code=True)
    print("[ASR Service] Model loaded successfully")
    model_loaded = True
except Exception as e:
    print(f"[ASR Service] Failed to load model: {e}")
    model_loaded = False

print("[ASR Service] Ready to process requests")

# Process requests in a loop
while True:
    try:
        # Read request from stdin
        line = sys.stdin.readline()
        if not line:
            break
        
        # Parse request
        request = json.loads(line.strip())
        audio_path = request.get('audio_path')
        language = request.get('language', 'zh')
        
        if not audio_path:
            response = {"error": "No audio path provided"}
        else:
            # Process audio
            try:
                # 根据语言选择不同的模型参数
                if language == 'zh':
                    result = model.generate(input=audio_path)
                else:
                    result = model.generate(input=audio_path)
                
                # Extract text from result
                if isinstance(result, list) and len(result) > 0:
                    if isinstance(result[0], dict) and 'text' in result[0]:
                        text = result[0]['text']
                    else:
                        text = str(result[0])
                else:
                    text = str(result)
                
                response = {
                    "text": text.strip(),
                    "language": language,
                    "duration": 1.0
                }
            except Exception as e:
                response = {"error": str(e)}
        
        # Write response to stdout
        print(json.dumps(response))
        sys.stdout.flush()
        
    except Exception as e:
        # Send error response
        response = {"error": str(e)}
        print(json.dumps(response))
        sys.stdout.flush()
