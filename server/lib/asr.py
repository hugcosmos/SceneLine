#!/usr/bin/env python3
import sys
import os
import json
import io

# Set modelscope cache directory to a writable location
modelscope_cache = os.path.join(os.path.dirname(__file__), 'modelscope_cache')

# Set multiple environment variables to ensure modelscope uses our directory
os.environ['MODELSCOPE_CACHE'] = modelscope_cache
os.environ['MODELSCOPE_HOME'] = modelscope_cache
os.environ['HOME'] = os.path.dirname(__file__)  # Override HOME to avoid .modelscope in user home

# Create cache directory if it doesn't exist
if not os.path.exists(modelscope_cache):
    os.makedirs(modelscope_cache, exist_ok=True)

# Redirect all stdout and stderr to avoid干扰JSON output
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()

# Check if FunASR is available
try:
    from funasr import AutoModel
    use_funasr = True
    # 提前加载模型，避免每次识别都重新加载
    model = AutoModel(model="paraformer-zh", disable_update=True, trust_remote_code=True)
except ImportError as e:
    use_funasr = False
    model = None
finally:
    # Restore stdout and stderr
    sys.stdout = old_stdout
    sys.stderr = old_stderr

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file provided"}))
        return
    
    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "zh"
    
    # Redirect all stdout and stderr during execution
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = io.StringIO()
    sys.stderr = io.StringIO()
    
    try:
        if use_funasr and model:
            
            # Transcribe audio using generate method
            result = model.generate(input=audio_path)
            
            # Extract text from result
            if isinstance(result, list) and len(result) > 0:
                if isinstance(result[0], dict) and 'text' in result[0]:
                    text = result[0]['text']
                else:
                    text = str(result[0])
            else:
                text = str(result)
            
            output = {
                "text": text.strip(),
                "language": language,
                "duration": 1.0
            }
            print(json.dumps(output))
            return
        else:
            # No ASR models available
            print(json.dumps({"error": "FunASR not available"}))
            return
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return
    finally:
        # Restore stdout and stderr
        sys.stdout = old_stdout
        sys.stderr = old_stderr

if __name__ == "__main__":
    main()