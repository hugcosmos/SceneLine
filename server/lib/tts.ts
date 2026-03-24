import { EdgeTTS } from "node-edge-tts";
import path from "path";
import fs from "fs";
import crypto from "crypto";

import { createLogger } from "./logger";

const logger = createLogger("tts");

// Configuration
const CONFIG = {
  maxRetries: parseInt(process.env.TTS_MAX_RETRIES || "3", 10),
  retryDelay: parseInt(process.env.TTS_RETRY_DELAY || "1000", 10),
  timeout: parseInt(process.env.TTS_TIMEOUT || "15000", 10),
};

// Extended voice catalog - 40+ voices from Microsoft Edge TTS
export const EDGE_VOICES = {
  // Chinese (Mainland) - 8 voices + dialects
  "zh-CN-XiaoxiaoNeural": { name: "Xiaoxiao", gender: "female", locale: "zh-CN", desc: "Natural" },
  "zh-CN-XiaoyiNeural": { name: "Xiaoyi", gender: "female", locale: "zh-CN", desc: "Gentle" },
  "zh-CN-YunjianNeural": { name: "Yunjian", gender: "male", locale: "zh-CN", desc: "Narration" },
  "zh-CN-YunxiNeural": { name: "Yunxi", gender: "male", locale: "zh-CN", desc: "Natural" },
  "zh-CN-YunxiaNeural": { name: "Yunxia", gender: "male", locale: "zh-CN", desc: "Young" },
  "zh-CN-YunyangNeural": { name: "Yunyang", gender: "male", locale: "zh-CN", desc: "Professional" },
  "zh-CN-liaoning-XiaobeiNeural": { name: "Xiaobei(LN)", gender: "female", locale: "zh-CN", desc: "Liaoning dialect" },
  "zh-CN-shaanxi-XiaoniNeural": { name: "Xiaoni(SX)", gender: "female", locale: "zh-CN", desc: "Shaanxi dialect" },
  
  // Chinese (Hong Kong / Taiwan)
  "zh-HK-HiuMaanNeural": { name: "HiuMaan", gender: "female", locale: "zh-HK", desc: "Cantonese" },
  "zh-HK-WanLungNeural": { name: "WanLung", gender: "male", locale: "zh-HK", desc: "Cantonese" },
  "zh-TW-HsiaoChenNeural": { name: "HsiaoChen", gender: "female", locale: "zh-TW", desc: "Taiwan" },
  "zh-TW-YunJheNeural": { name: "YunJhe", gender: "male", locale: "zh-TW", desc: "Taiwan" },
  
  // English (US) - 8 voices
  "en-US-AriaNeural": { name: "Aria", gender: "female", locale: "en-US", desc: "Natural" },
  "en-US-JennyNeural": { name: "Jenny", gender: "female", locale: "en-US", desc: "Professional" },
  "en-US-MichelleNeural": { name: "Michelle", gender: "female", locale: "en-US", desc: "Friendly" },
  "en-US-AnaNeural": { name: "Ana", gender: "female", locale: "en-US", desc: "Child" },
  "en-US-GuyNeural": { name: "Guy", gender: "male", locale: "en-US", desc: "Professional" },
  "en-US-DavisNeural": { name: "Davis", gender: "male", locale: "en-US", desc: "Energetic" },
  "en-US-TonyNeural": { name: "Tony", gender: "male", locale: "en-US", desc: "Conversational" },
  "en-US-RogerioNeural": { name: "Rogerio", gender: "male", locale: "en-US", desc: "Natural" },
  
  // English (UK / AU / IN)
  "en-GB-SoniaNeural": { name: "Sonia", gender: "female", locale: "en-GB", desc: "British" },
  "en-GB-RyanNeural": { name: "Ryan", gender: "male", locale: "en-GB", desc: "British" },
  "en-AU-NatashaNeural": { name: "Natasha", gender: "female", locale: "en-AU", desc: "Australian" },
  "en-AU-WilliamNeural": { name: "William", gender: "male", locale: "en-AU", desc: "Australian" },
  "en-IN-NeerjaNeural": { name: "Neerja", gender: "female", locale: "en-IN", desc: "Indian" },
  "en-IN-PrabhatNeural": { name: "Prabhat", gender: "male", locale: "en-IN", desc: "Indian" },
  
  // Japanese, Korean
  "ja-JP-NanamiNeural": { name: "Nanami", gender: "female", locale: "ja-JP", desc: "Japanese" },
  "ja-JP-KeitaNeural": { name: "Keita", gender: "male", locale: "ja-JP", desc: "Japanese" },
  "ko-KR-SunHiNeural": { name: "SunHi", gender: "female", locale: "ko-KR", desc: "Korean" },
  "ko-KR-InJoonNeural": { name: "InJoon", gender: "male", locale: "ko-KR", desc: "Korean" },
  
  // European
  "fr-FR-DeniseNeural": { name: "Denise", gender: "female", locale: "fr-FR", desc: "French" },
  "fr-FR-HenriNeural": { name: "Henri", gender: "male", locale: "fr-FR", desc: "French" },
  "de-DE-KatjaNeural": { name: "Katja", gender: "female", locale: "de-DE", desc: "German" },
  "de-DE-ConradNeural": { name: "Conrad", gender: "male", locale: "de-DE", desc: "German" },
  "es-ES-ElviraNeural": { name: "Elvira", gender: "female", locale: "es-ES", desc: "Spanish" },
  "es-ES-AlvaroNeural": { name: "Alvaro", gender: "male", locale: "es-ES", desc: "Spanish" },
} as const;

// Simple mapping for backward compatibility (8 voices)
const VOICE_MAP: Record<string, string> = {
  "male-1": "zh-CN-YunxiNeural",
  "male-2": "zh-CN-YunjianNeural",
  "female-1": "zh-CN-XiaoyiNeural",
  "female-2": "zh-CN-XiaoxiaoNeural",
  "en-male-1": "en-US-GuyNeural",
  "en-male-2": "en-US-DavisNeural",
  "en-female-1": "en-US-AriaNeural",
  "en-female-2": "en-US-JennyNeural",
  default: "zh-CN-XiaoyiNeural",
};

const LANG_DEFAULT_VOICE: Record<string, string> = {
  zh: "zh-CN-XiaoyiNeural",
  en: "en-US-AriaNeural",
  mixed: "zh-CN-XiaoyiNeural",
  ja: "ja-JP-NanamiNeural",
  ko: "ko-KR-SunHiNeural",
  fr: "fr-FR-DeniseNeural",
  de: "de-DE-KatjaNeural",
  es: "es-ES-ElviraNeural",
};

const LANG_MAP: Record<string, string> = {
  zh: "zh-CN",
  en: "en-US",
  mixed: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
};

const AUDIO_DIR = path.resolve("tts-cache");
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  logger.info("Created TTS cache directory", { path: AUDIO_DIR });
}

// Sleep utility for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute synthesis with retry logic
async function executeSynthesize(
  text: string,
  voiceName: string,
  langCode: string,
  audioPath: string,
  attempt: number = 1
): Promise<void> {
  logger.debug(`TTS attempt ${attempt}/${CONFIG.maxRetries}`, { voice: voiceName, textLength: text.length });
  
  const tts = new EdgeTTS({
    voice: voiceName,
    lang: langCode,
    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    timeout: CONFIG.timeout,
  });

  try {
    await tts.ttsPromise(text, audioPath);
    logger.debug(`TTS synthesis successful`, { attempt, voice: voiceName });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    
    // Check if we should retry
    if (attempt < CONFIG.maxRetries) {
      const isRetryable = error.includes("timeout") || 
                         error.includes("network") ||
                         error.includes("ECONNRESET") ||
                         error.includes("temporarily");
      
      if (isRetryable) {
        const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1);
        logger.warn(`TTS attempt ${attempt} failed, retrying in ${delay}ms`, { error, voice: voiceName });
        await sleep(delay);
        return executeSynthesize(text, voiceName, langCode, audioPath, attempt + 1);
      }
    }
    
    throw err;
  }
}

export async function synthesize(
  text: string,
  speakerId?: string,
  language?: string
): Promise<{ audioPath: string; duration: number }> {
  const lang = language || "zh";
  
  // Support both full voice IDs and legacy mapped IDs
  let voiceName: string;
  if (speakerId && EDGE_VOICES[speakerId as keyof typeof EDGE_VOICES]) {
    // Full voice ID (e.g., "zh-CN-XiaoxiaoNeural")
    voiceName = speakerId;
  } else {
    // Legacy mapped ID (e.g., "male-1") or default
    voiceName = VOICE_MAP[speakerId || ""] || LANG_DEFAULT_VOICE[lang] || VOICE_MAP.default;
  }
  
  const langCode = LANG_MAP[lang] || "zh-CN";

  const hash = crypto
    .createHash("md5")
    .update(`${voiceName}:${text}`)
    .digest("hex");
  const audioPath = path.join(AUDIO_DIR, `${hash}.mp3`);

  // Return cached audio if exists
  if (fs.existsSync(audioPath)) {
    const stat = fs.statSync(audioPath);
    const estimatedDuration = stat.size / 6000;
    logger.debug("TTS cache hit", { hash, voice: voiceName, duration: estimatedDuration });
    return { audioPath, duration: estimatedDuration };
  }

  logger.info("TTS synthesis started", { 
    voice: voiceName, 
    language: langCode, 
    textLength: text.length,
    hash,
  });

  const startTime = Date.now();

  try {
    await executeSynthesize(text, voiceName, langCode, audioPath);

    const stat = fs.statSync(audioPath);
    const estimatedDuration = stat.size / 6000;
    const duration = Date.now() - startTime;

    logger.info("TTS synthesis completed", {
      voice: voiceName,
      duration: estimatedDuration,
      processingTime: duration,
      hash,
    });

    return { audioPath, duration: estimatedDuration };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error("TTS synthesis failed after all retries", {
      error,
      voice: voiceName,
      textLength: text.length,
      maxRetries: CONFIG.maxRetries,
    });
    throw new Error(`TTS synthesis failed: ${error}`);
  }
}

// Get all available voices (40+)
export function getAllVoices() {
  return Object.entries(EDGE_VOICES).map(([id, info]) => ({
    id,
    ...info,
  }));
}

// Get voices by locale (e.g., 'zh', 'en', 'ja')
export function getVoicesByLocale(locale: string) {
  return Object.entries(EDGE_VOICES)
    .filter(([_, info]) => info.locale.toLowerCase().startsWith(locale.toLowerCase()))
    .map(([id, info]) => ({ id, ...info }));
}

// Get voices by gender and optional locale
export function getVoicesByGender(gender: "male" | "female", locale?: string) {
  return Object.entries(EDGE_VOICES)
    .filter(([_, info]) => {
      if (info.gender !== gender) return false;
      if (locale && !info.locale.toLowerCase().startsWith(locale.toLowerCase())) return false;
      return true;
    })
    .map(([id, info]) => ({ id, ...info }));
}

// Get voice by ID
export function getVoiceById(voiceId: string) {
  const simpleId = VOICE_MAP[voiceId] || voiceId;
  const info = EDGE_VOICES[simpleId as keyof typeof EDGE_VOICES];
  if (!info) return null;
  return { id: simpleId, ...info };
}

// Legacy function for backward compatibility
export function getVoiceMap() {
  return VOICE_MAP;
}

// Get voice statistics
export function getVoiceStats() {
  const voices = Object.values(EDGE_VOICES);
  return {
    total: voices.length,
    byLocale: voices.reduce((acc, v) => {
      const locale = v.locale.split('-')[0];
      acc[locale] = (acc[locale] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byGender: voices.reduce((acc, v) => {
      acc[v.gender] = (acc[v.gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}

// Get TTS configuration status
export function getTTSStatus() {
  return {
    cacheDir: AUDIO_DIR,
    cacheSize: fs.existsSync(AUDIO_DIR) ? fs.readdirSync(AUDIO_DIR).length : 0,
    maxRetries: CONFIG.maxRetries,
    timeout: CONFIG.timeout,
    voiceCount: Object.keys(EDGE_VOICES).length,
  };
}
