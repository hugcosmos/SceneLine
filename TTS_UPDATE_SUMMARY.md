# SceneLine TTS Update Summary

## Current Implementation

SceneLine now supports **40+ voices** from Microsoft Edge TTS across multiple languages.

### Voice Count by Language

| Language | Voice Count | Examples |
|----------|-------------|----------|
| Chinese (Mainland + HK + TW) | 12 | Xiaoxiao, Yunxi, Xiaobei (Liaoning), HiuMaan (Cantonese) |
| English (US + UK + AU + IN) | 14 | Aria, Guy, Sonia (British), Natasha (Australian) |
| Japanese | 2 | Nanami, Keita |
| Korean | 2 | SunHi, InJoon |
| French | 2 | Denise, Henri |
| German | 2 | Katja, Conrad |
| Spanish | 2 | Elvira, Alvaro |
| **Total** | **40** | |

## New API Endpoints

```bash
# Get all voices (40+)
GET /api/tts/voices

# Get voices by locale
GET /api/tts/voices/zh      # Chinese
GET /api/tts/voices/en      # English
GET /api/tts/voices/ja      # Japanese

# Get voices by gender
GET /api/tts/voices/en?gender=female
GET /api/tts/voices/zh?gender=male

# Get voice statistics
GET /api/tts/stats
```

## Example Response

```bash
curl http://localhost:5000/api/tts/voices/zh
```

```json
[
  {
    "id": "zh-CN-XiaoxiaoNeural",
    "name": "Xiaoxiao",
    "gender": "female",
    "locale": "zh-CN",
    "desc": "Natural"
  },
  {
    "id": "zh-CN-YunxiNeural",
    "name": "Yunxi",
    "gender": "male",
    "locale": "zh-CN",
    "desc": "Natural"
  },
  {
    "id": "zh-CN-liaoning-XiaobeiNeural",
    "name": "Xiaobei(LN)",
    "gender": "female",
    "locale": "zh-CN",
    "desc": "Liaoning dialect"
  }
]
```

## Comparison with Reference Project

The referenced [scripts-to-audiobook](https://github.com/hugcosmos/scripts-to-audiobook) supports:

| Feature | scripts-to-audiobook | SceneLine (Updated) |
|---------|---------------------|---------------------|
| Edge TTS Voices | 61+ | 40+ |
| ElevenLabs | Yes | Can be added |
| iFlytek | Yes | Can be added |
| Baidu | Yes | Can be added |
| Voice Matching Engine | Yes | Not implemented |
| Multi-character Assignment | Yes | Manual assignment |

## Adding More Providers

To add ElevenLabs, iFlytek, or Baidu:

1. Install provider SDK
2. Add credentials to `.env`
3. Implement provider in `server/lib/tts-providers/`
4. Update voice catalog

Example for ElevenLabs:
```typescript
// server/lib/tts-providers/elevenlabs.ts
import { ElevenLabsClient } from "elevenlabs";

export async function synthesizeElevenLabs(text: string, voiceId: string) {
  const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  // ... implementation
}
```

## Usage for Character Assignment

```typescript
// Frontend can now:

// 1. Fetch voices for the script's language
const voices = await fetch('/api/tts/voices/zh').then(r => r.json());

// 2. Let user select voice
const selectedVoice = voices.find(v => v.gender === characterGender);

// 3. Assign to character
await fetch(`/api/characters/${characterId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ speakerId: selectedVoice.id })
});
```

## Voice Selection Best Practices

| Use Case | Recommended Voice | Why |
|----------|------------------|-----|
| Chinese narration | zh-CN-YunyangNeural | Professional, authoritative |
| Chinese dialogue | zh-CN-XiaoxiaoNeural | Natural, versatile |
| Chinese child | zh-CN-YunxiaNeural | Young, energetic |
| English narration | en-US-GuyNeural | Professional, news-like |
| English dialogue | en-US-AriaNeural | Natural, friendly |
| English energetic | en-US-DavisNeural | Upbeat, dynamic |
| Local Chinese dialect | zh-CN-liaoning-XiaobeiNeural | Liaoning accent |
| Cantonese content | zh-HK-HiuMaanNeural | Native Cantonese |

## Files Changed

```
server/lib/tts.ts           # Extended with 40+ voices, new helper functions
server/routes.ts            # Added /api/tts/voices/* endpoints
docs/TTS_VOICES.md          # Complete voice documentation
```

## Testing

```bash
# Start server
npm run dev

# Check voice stats
curl http://localhost:5000/api/tts/stats

# List Chinese voices
curl http://localhost:5000/api/tts/voices/zh

# Synthesize with new voice
curl -X POST http://localhost:5000/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "speakerId": "en-US-AriaNeural", "language": "en"}'
```
