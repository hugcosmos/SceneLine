/**
 * Extended TTS Module
 * Supports multiple voice providers and 61+ Edge TTS voices
 */

import EdgeTTS from 'node-edge-tts';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  locale: string;
  description: string;
}

export interface SynthesisOptions {
  voiceId?: string;
  language?: string;
  outputDir?: string;
  rate?: string;
  volume?: string;
  pitch?: string;
}

export interface SynthesisResult {
  filePath: string;
  duration?: number;
  voice: Voice;
}

export const EDGE_VOICES: Voice[] = [
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', gender: 'female', locale: 'zh-CN', description: '活泼温暖的中文女声' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓伊', gender: 'female', locale: 'zh-CN', description: '温柔自然的中文女声' },
  { id: 'zh-CN-YunjianNeural', name: '云健', gender: 'male', locale: 'zh-CN', description: '成熟稳重的中文男声' },
  { id: 'zh-CN-YunxiNeural', name: '云希', gender: 'male', locale: 'zh-CN', description: '年轻活力的中文男声' },
  { id: 'zh-CN-YunxiaNeural', name: '云夏', gender: 'male', locale: 'zh-CN', description: '阳光开朗的中文男声' },
  { id: 'zh-CN-YunyangNeural', name: '云扬', gender: 'male', locale: 'zh-CN', description: '专业自信的中文男声' },
  { id: 'zh-CN-liaoning-XiaobeiNeural', name: '晓北辽宁', gender: 'female', locale: 'zh-CN-liaoning', description: '辽宁方言女声' },
  { id: 'zh-CN-liaoning-YunbiaoNeural', name: '云彪辽宁', gender: 'male', locale: 'zh-CN-liaoning', description: '辽宁方言男声' },
  { id: 'zh-CN-shaanxi-XiaoniNeural', name: '晓妮陕西', gender: 'female', locale: 'zh-CN-shaanxi', description: '陕西方言女声' },
  { id: 'zh-HK-HiuMaanNeural', name: '曉曼', gender: 'female', locale: 'zh-HK', description: '粤语女声自然亲切' },
  { id: 'zh-HK-HiuGaaiNeural', name: '曉佳', gender: 'female', locale: 'zh-HK', description: '粤语女声温柔甜美' },
  { id: 'zh-HK-WanLungNeural', name: '雲龍', gender: 'male', locale: 'zh-HK', description: '粤语男声成熟稳重' },
  { id: 'zh-TW-HsiaoChenNeural', name: '曉臻', gender: 'female', locale: 'zh-TW', description: '台湾国语女声' },
  { id: 'zh-TW-HsiaoYuNeural', name: '曉雨', gender: 'female', locale: 'zh-TW', description: '台湾国语女声活泼' },
  { id: 'zh-TW-YunJheNeural', name: '雲哲', gender: 'male', locale: 'zh-TW', description: '台湾国语男声' },
];

  // English US
  { id: 'en-US-AriaNeural', name: 'Aria', gender: 'female', locale: 'en-US', description: 'American English female voice friendly professional' },
  { id: 'en-US-AnaNeural', name: 'Ana', gender: 'female', locale: 'en-US', description: 'American English female voice young energetic' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher', gender: 'male', locale: 'en-US', description: 'American English male voice authoritative' },
  { id: 'en-US-EricNeural', name: 'Eric', gender: 'male', locale: 'en-US', description: 'American English male voice casual' },
  { id: 'en-US-GuyNeural', name: 'Guy', gender: 'male', locale: 'en-US', description: 'American English male voice newscaster style' },
  { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'female', locale: 'en-US', description: 'American English female voice versatile' },
  { id: 'en-US-MichelleNeural', name: 'Michelle', gender: 'female', locale: 'en-US', description: 'American English female voice warm' },
  { id: 'en-US-RogerNeural', name: 'Roger', gender: 'male', locale: 'en-US', description: 'American English male voice mature' },
  { id: 'en-US-SteffanNeural', name: 'Steffan', gender: 'male', locale: 'en-US', description: 'American English male voice clear' },
  
  // English UK
  { id: 'en-GB-LibbyNeural', name: 'Libby', gender: 'female', locale: 'en-GB', description: 'British English female voice' },
  { id: 'en-GB-MaisieNeural', name: 'Maisie', gender: 'female', locale: 'en-GB', description: 'British English female voice young' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', gender: 'male', locale: 'en-GB', description: 'British English male voice' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', gender: 'female', locale: 'en-GB', description: 'British English female voice mature' },
  { id: 'en-GB-ThomasNeural', name: 'Thomas', gender: 'male', locale: 'en-GB', description: 'British English male voice' },
  
  // English Australia
  { id: 'en-AU-NatashaNeural', name: 'Natasha', gender: 'female', locale: 'en-AU', description: 'Australian English female voice' },
  { id: 'en-AU-WilliamNeural', name: 'William', gender: 'male', locale: 'en-AU', description: 'Australian English male voice' },
  
  // English India
  { id: 'en-IN-NeerjaNeural', name: 'Neerja', gender: 'female', locale: 'en-IN', description: 'Indian English female voice' },
  { id: 'en-IN-PrabhatNeural', name: 'Prabhat', gender: 'male', locale: 'en-IN', description: 'Indian English male voice' },
  
  // Japanese
  { id: 'ja-JP-NanamiNeural', name: 'Nanami', gender: 'female', locale: 'ja-JP', description: 'Japanese female voice' },
  { id: 'ja-JP-KeitaNeural', name: 'Keita', gender: 'male', locale: 'ja-JP', description: 'Japanese male voice' },
  { id: 'ja-JP-AoiNeural', name: 'Aoi', gender: 'female', locale: 'ja-JP', description: 'Japanese female voice bright' },
  { id: 'ja-JP-DaichiNeural', name: 'Daichi', gender: 'male', locale: 'ja-JP', description: 'Japanese male voice calm' },
  
  // Korean
  { id: 'ko-KR-SunHiNeural', name: 'SunHi', gender: 'female', locale: 'ko-KR', description: 'Korean female voice' },
  { id: 'ko-KR-InJoonNeural', name: 'InJoon', gender: 'male', locale: 'ko-KR', description: 'Korean male voice' },
  { id: 'ko-KR-HyunsuNeural', name: 'Hyunsu', gender: 'male', locale: 'ko-KR', description: 'Korean male voice versatile' },
  
  // French
  { id: 'fr-FR-DeniseNeural', name: 'Denise', gender: 'female', locale: 'fr-FR', description: 'French female voice' },
  { id: 'fr-FR-EloiseNeural', name: 'Eloise', gender: 'female', locale: 'fr-FR', description: 'French female voice child' },
  { id: 'fr-FR-HenriNeural', name: 'Henri', gender: 'male', locale: 'fr-FR', description: 'French male voice' },
  { id: 'fr-CA-SylvieNeural', name: 'Sylvie', gender: 'female', locale: 'fr-CA', description: 'Canadian French female voice' },
  { id: 'fr-CA-JeanNeural', name: 'Jean', gender: 'male', locale: 'fr-CA', description: 'Canadian French male voice' },
  
  // German
  { id: 'de-DE-KatjaNeural', name: 'Katja', gender: 'female', locale: 'de-DE', description: 'German female voice' },
  { id: 'de-DE-ConradNeural', name: 'Conrad', gender: 'male', locale: 'de-DE', description: 'German male voice' },
  { id: 'de-DE-AmalaNeural', name: 'Amala', gender: 'female', locale: 'de-DE', description: 'German female voice young' },
  { id: 'de-DE-BerndNeural', name: 'Bernd', gender: 'male', locale: 'de-DE', description: 'German male voice mature' },
  
  // Spanish
  { id: 'es-ES-ElviraNeural', name: 'Elvira', gender: 'female', locale: 'es-ES', description: 'Spanish female voice' },
  { id: 'es-ES-AlvaroNeural', name: 'Alvaro', gender: 'male', locale: 'es-ES', description: 'Spanish male voice' },
  { id: 'es-MX-DaliaNeural', name: 'Dalia', gender: 'female', locale: 'es-MX', description: 'Mexican Spanish female voice' },
  { id: 'es-MX-JorgeNeural', name: 'Jorge', gender: 'male', locale: 'es-MX', description: 'Mexican Spanish male voice' },
  { id: 'es-AR-ElenaNeural', name: 'Elena', gender: 'female', locale: 'es-AR', description: 'Argentinian Spanish female voice' },
  { id: 'es-AR-TomasNeural', name: 'Tomas', gender: 'male', locale: 'es-AR', description: 'Argentinian Spanish male voice' },
  
  // Other Languages
  { id: 'ru-RU-SvetlanaNeural', name: 'Svetlana', gender: 'female', locale: 'ru-RU', description: 'Russian female voice' },
  { id: 'ru-RU-DmitryNeural', name: 'Dmitry', gender: 'male', locale: 'ru-RU', description: 'Russian male voice' },
  { id: 'it-IT-ElsaNeural', name: 'Elsa', gender: 'female', locale: 'it-IT', description: 'Italian female voice' },
  { id: 'it-IT-DiegoNeural', name: 'Diego', gender: 'male', locale: 'it-IT', description: 'Italian male voice' },
  { id: 'pt-BR-FranciscaNeural', name: 'Francisca', gender: 'female', locale: 'pt-BR', description: 'Brazilian Portuguese female voice' },
  { id: 'pt-BR-AntonioNeural', name: 'Antonio', gender: 'male', locale: 'pt-BR', description: 'Brazilian Portuguese male voice' },
  { id: 'nl-NL-ColetteNeural', name: 'Colette', gender: 'female', locale: 'nl-NL', description: 'Dutch female voice' },
  { id: 'nl-NL-FennaNeural', name: 'Fenna', gender: 'female', locale: 'nl-NL', description: 'Dutch female voice young' },
  { id: 'nl-NL-MaartenNeural', name: 'Maarten', gender: 'male', locale: 'nl-NL', description: 'Dutch male voice' },
];
