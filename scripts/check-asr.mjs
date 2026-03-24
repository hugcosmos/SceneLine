#!/usr/bin/env node
/**
 * Check ASR model status and performance estimates
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelCacheDir = path.join(__dirname, '../server/lib/modelscope_cache/models/damo');
const zhModelDir = path.join(modelCacheDir, 'speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8408-pytorch');

console.log('=== SceneLine ASR Status Check ===\n');

// Check if model is cached
let isCached = false;
try {
  isCached = fs.existsSync(zhModelDir) && fs.readdirSync(zhModelDir).length > 0;
} catch {}

console.log(`📦 FunASR Model Cached: ${isCached ? '✅ Yes' : '❌ No'}`);

if (!isCached) {
  console.log('   ⚠️  Model will be downloaded on first use (~2GB)');
  console.log('   📥 First load may take 2-5 minutes depending on network');
}

// Check Python environment
console.log('\n🔍 Python Environment:');
try {
  const pythonVersion = execSync('python3 --version', { encoding: 'utf8' }).trim();
  console.log(`   ${pythonVersion}`);
} catch {
  console.log('   ❌ Python 3 not found');
}

// Performance estimates
console.log('\n⏱️  Performance Estimates:');
console.log('   Audio duration: ~23s (for ~50 words @ 130wpm)');
console.log('   ├─ FunASR:  ~3-5s (RTF ~0.15)');
console.log('   └─ Whisper: ~7-10s (RTF ~0.40)');

console.log('\n💡 Recommendations:');
if (!isCached) {
  console.log('   1. Pre-download model before first use');
}
console.log(`   2. Use ASR_BACKEND=funasr for Chinese/mixed content`);
console.log(`   3. Use ASR_BACKEND=whisper for English-only content`);
console.log(`   4. Set ASR_HOTWORDS for better technical term recognition`);

console.log('\n🚀 Start server:');
console.log('   npm run dev');
console.log('');
