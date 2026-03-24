import path from "path";
import fs from "fs";
import { execSync, spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createLogger } from "./logger";

const logger = createLogger("asr");

// Get Python command from environment or default to python3
const PYTHON_CMD = process.env.SCENELINE_PYTHON_CMD || 'python3';

// Configuration from environment variables
const CONFIG = {
  pythonScript: path.join(__dirname, 'asr-server.py'),  // Use server mode
  pythonCmd: PYTHON_CMD,
  hotwords: process.env.ASR_HOTWORDS || "SceneLine API TTS ASR Python JavaScript TypeScript",
  preferredBackend: (process.env.ASR_BACKEND || 'funasr') as 'funasr' | 'whisper' | 'auto',
  timeout: parseInt(process.env.ASR_TIMEOUT || '60000', 10),
  useStreaming: process.env.ASR_STREAMING === 'true',
  preloadOnStartup: process.env.ASR_PRELOAD !== 'false',
  maxRetries: parseInt(process.env.ASR_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.ASR_RETRY_DELAY || '1000', 10),
};

// Persistent Python process
let pythonProcess: ChildProcess | null = null;
let requestId = 0;
const pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (reason: any) => void }>();

// State tracking
let backendAvailable: 'funasr' | 'whisper' | null = null;
let modelsLoaded = false;
let modelLoadTime = 0;
let lastRecognitionTime = 0;

/**
 * Check model download status
 */
export function getModelStatus(): {
  funasrZhCached: boolean;
  modelLoadTime: number;
  modelsLoaded: boolean;
} {
  const cacheDir = path.join(__dirname, 'modelscope_cache', 'models', 'damo');
  const zhModelPath = path.join(cacheDir, 'speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8408-pytorch');
  
  return {
    funasrZhCached: fs.existsSync(zhModelPath) && fs.readdirSync(zhModelPath).length > 0,
    modelLoadTime,
    modelsLoaded,
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Start persistent Python ASR server process
 */
function startPythonServer(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (pythonProcess && pythonProcess.pid) {
      resolve(true);
      return;
    }
    
    logger.info("Starting ASR server process...");
    
    pythonProcess = spawn(CONFIG.pythonCmd, [CONFIG.pythonScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });
    
    let buffer = '';
    
    pythonProcess.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const response = JSON.parse(line);
          // Handle ping response during startup
          if (response.status === 'ok' || response.model_loaded !== undefined) {
            logger.info("ASR server process started");
            resolve(true);
          }
        } catch {
          // Not JSON, might be log output
        }
      }
    });
    
    pythonProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg.includes('[ASR-SERVER]')) {
        logger.info(msg);
      }
    });
    
    pythonProcess.on('error', (err) => {
      logger.error("ASR server process error", { error: String(err) });
      reject(err);
    });
    
    pythonProcess.on('exit', (code) => {
      logger.warn("ASR server process exited", { code });
      pythonProcess = null;
    });
    
    // Wait a bit for startup, then ping
    setTimeout(() => {
      if (pythonProcess?.stdin?.writable) {
        pythonProcess.stdin.write(JSON.stringify({ cmd: 'ping' }) + '\n');
      }
    }, 500);
    
    // Timeout
    setTimeout(() => {
      if (!pythonProcess?.pid) {
        reject(new Error("ASR server startup timeout"));
      }
    }, 120000); // 2 minutes for model loading
  });
}

/**
 * Send request to Python server and get response
 */
function sendRequest(request: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!pythonProcess?.stdin?.writable || !pythonProcess?.stdout?.readable) {
      reject(new Error("ASR server not running"));
      return;
    }
    
    const id = ++requestId;
    pendingRequests.set(id, { resolve, reject });
    
    let buffer = '';
    const onData = (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const response = JSON.parse(line);
          pythonProcess?.stdout?.off('data', onData);
          pendingRequests.delete(id);
          resolve(response);
          return;
        } catch {
          // Not valid JSON, continue
        }
      }
    };
    
    pythonProcess.stdout.on('data', onData);
    
    // Timeout
    setTimeout(() => {
      pythonProcess?.stdout?.off('data', onData);
      pendingRequests.delete(id);
      reject(new Error("Request timeout"));
    }, CONFIG.timeout);
    
    // Send request
    pythonProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

/**
 * Detect available backend
 */
async function detectBackend(): Promise<'funasr' | 'whisper' | null> {
  if (backendAvailable) return backendAvailable;
  
  // For server mode, just try to start the server
  try {
    const started = await startPythonServer();
    if (started) {
      backendAvailable = 'funasr';
      return backendAvailable;
    }
  } catch (err) {
    logger.error("Backend detection failed", { error: String(err) });
  }
  
  return null;
}

/**
 * Convert audio to WAV format (16kHz, mono)
 */
async function convertAudioToWav(audioBuffer: Buffer, mimeType?: string): Promise<string> {
  const tmpDir = path.resolve("tmp-audio");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const extMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
  };
  const inputExt = extMap[mimeType || ''] || 'webm';
  const timestamp = Date.now();
  const inputPath = path.join(tmpDir, `input-${timestamp}.${inputExt}`);
  const outputPath = path.join(tmpDir, `output-${timestamp}.wav`);

  try {
    fs.writeFileSync(inputPath, audioBuffer);
    
    const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}" 2>/dev/null`;
    execSync(ffmpegCmd, { timeout: 30000 });

    try { fs.unlinkSync(inputPath); } catch {}
    return outputPath;
  } catch (err) {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    throw new Error(`Audio conversion failed: ${err}`);
  }
}

/**
 * Execute recognition with retry logic
 */
async function executeRecognition(
  wavPath: string, 
  language: string, 
  attempt: number = 1
): Promise<{
  text: string;
  language: string;
  audio_duration: number;
  recognition_time: number;
  backend: string;
  rtf: number;
}> {
  const hotwordsParam = (language === 'zh' || language === 'mixed') ? CONFIG.hotwords : '';
  
  logger.debug(`ASR attempt ${attempt}/${CONFIG.maxRetries}`, { language });
  
  const startTime = Date.now();
  
  try {
    // Ensure server is running
    if (!pythonProcess?.pid) {
      await startPythonServer();
    }
    
    // Send request to persistent server
    const result = await sendRequest({
      cmd: 'recognize',
      audio_path: wavPath,
      language: language,
      hotwords: hotwordsParam
    });
    
    if (result.error) {
      throw new Error(result.error);
    }

    lastRecognitionTime = Date.now() - startTime;
    
    logger.info("ASR recognition successful", {
      backend: result.backend,
      rtf: result.rtf,
      audioDuration: result.audio_duration,
      recognitionTime: result.recognition_time,
      attempt,
    });
    
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    
    // Check if we should retry
    if (attempt < CONFIG.maxRetries) {
      const isRetryable = error.includes("timeout") || 
                         error.includes("connection") ||
                         error.includes("busy") ||
                         error.includes("temporarily");
      
      if (isRetryable) {
        const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        logger.warn(`ASR attempt ${attempt} failed, retrying in ${delay}ms`, { error });
        await sleep(delay);
        return executeRecognition(wavPath, language, attempt + 1);
      }
    }
    
    throw err;
  }
}

/**
 * Estimate recognition time for ~50 words
 */
export function estimateRecognitionTime(wordCount: number = 50): {
  funasr: number;
  whisper: number;
  audioDuration: number;
} {
  const audioDuration = wordCount / 2.17;
  const funasrRTF = 0.15;
  const whisperRTF = 0.4;
  
  return {
    funasr: Math.round(audioDuration * funasrRTF * 100) / 100,
    whisper: Math.round(audioDuration * whisperRTF * 100) / 100,
    audioDuration: Math.round(audioDuration * 100) / 100,
  };
}

/**
 * Main recognition function
 */
export async function recognize(
  audioBuffer: Buffer,
  mimeType?: string,
  language: string = "zh"
): Promise<{
  text: string;
  language: string;
  duration: number;
  backend?: string;
  recognitionTime?: number;
  rtf?: number;
}> {
  
  const backend = await detectBackend();
  
  if (!backend) {
    throw new Error("ASR backend not available. Please install dependencies: cd server/lib && ./install-asr.sh");
  }

  const wavPath = await convertAudioToWav(audioBuffer, mimeType);

  try {
    const result = await executeRecognition(wavPath, language);
    
    return {
      text: result.text,
      language: result.language || language,
      duration: result.audio_duration || 0,
      backend: result.backend || backend,
      recognitionTime: result.recognition_time,
      rtf: result.rtf,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error("ASR recognition failed after all retries", { 
      error, 
      language,
      maxRetries: CONFIG.maxRetries,
    });
    throw new Error(`ASR recognition failed: ${error}`);
  } finally {
    try { fs.unlinkSync(wavPath); } catch {}
  }
}

/**
 * Preload ASR models at startup
 */
export async function preloadModel(): Promise<void> {
  try {
    // Start persistent server (loads model once)
    const started = await startPythonServer();
    if (started) {
      backendAvailable = 'funasr';
      modelsLoaded = true;
      logger.info("ASR server ready (model preloaded)");
    }
  } catch (err) {
    logger.warn("ASR preload failed", { error: String(err) });
    // Silent if not available - server works without ASR
  }
}

/**
 * Get current ASR status
 */
export function getASRStatus(): {
  available: boolean;
  backend: string | null;
  modelsLoaded: boolean;
  modelLoadTime: number;
  lastRecognitionTime: number;
  maxRetries: number;
  estimates: { funasr: number; whisper: number; audioDuration: number };
  modelStatus: { funasrZhCached: boolean; modelLoadTime: number; modelsLoaded: boolean };
} {
  return {
    available: !!backendAvailable,
    backend: backendAvailable,
    modelsLoaded,
    modelLoadTime,
    lastRecognitionTime,
    maxRetries: CONFIG.maxRetries,
    estimates: estimateRecognitionTime(50),
    modelStatus: getModelStatus(),
  };
}

/**
 * Update hotwords
 */
export function updateHotwords(hotwords: string): void {
  CONFIG.hotwords = hotwords;
  logger.info("Hotwords updated", { hotwords });
}
