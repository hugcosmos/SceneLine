# SceneLine

<p align="center">
  <b>AI-Powered Dubbing Practice Platform</b>
</p>

<p align="center">
  <img src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=SceneLine%20AI%20Dubbing%20Practice%20Platform%20home%20page%20dark%20mode%20with%20purple%20accent%20color%2C%20modern%20UI%20design%20with%20upload%20button%20and%20feature%20cards%2C%20professional%20screenshot&image_size=landscape_16_9" alt="SceneLine Home Page" width="800">
</p>

<p align="center">
  <b>English</b> | <a href="README.zh-CN.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/hugcosmos/SceneLine/stargazers"><img src="https://img.shields.io/github/stars/hugcosmos/SceneLine?style=social" alt="Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="#"><img src="https://img.shields.io/badge/Node-20+-green.svg" alt="Node"></a>
  <a href="#"><img src="https://img.shields.io/badge/Python-3.9--3.11-blue.svg" alt="Python"></a>
</p>

---

SceneLine is an AI-powered dubbing practice platform that enables language learners to practice dubbing through immersive film/TV scene dialogues. Features ASR, TTS, and intelligent scoring.

## ✨ Key Features

- **🎙️ Real-time ASR** - FunASR for speech recognition with 10x performance improvement (resident process mode)
- **🔊 40+ TTS Voices** - Microsoft Edge TTS with 40+ voice options, filtered by gender/locale
- **🎭 Multi-character Practice** - Support for multi-role scene practice with individual scoring
- **📊 Practice History** - Three view modes (Overview/By Script/Details) with statistics
- **📝 Smart Deduplication** - Content hash-based deduplication for scripts
- **🐳 Docker Support** - Full Docker Compose configuration with data persistence

## 🚀 Quick Start

### Option 1: One-Click Startup (Recommended)

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/sceneline.git
cd sceneline

# One-click startup
./start.sh
```

First startup prompts:
- Are you in mainland China? (auto-configures mirror sources)
- Download ASR model (~2GB, takes 6-9 minutes on first run)

Access http://localhost:5000 to start using

### Option 2: Docker Deployment

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 3: Manual Installation

```bash
# Install dependencies
npm install

# Python environment (3.9-3.11)
pip install -r requirements.txt

# Start development server
npm run dev
```

## 📁 Project Structure

```
sceneline/
├── server/                 # Backend (Express + TypeScript)
│   ├── lib/               # Core libs (ASR, TTS)
│   └── routes/            # API routes
├── client/                # Frontend (React + Vite + Tailwind)
│   └── src/pages/         # Page components
├── shared/                # Shared type definitions
├── models/                # ASR model cache
├── tts-cache/             # TTS audio cache
├── logs/                  # Application logs
├── start.sh               # One-click startup script
└── docker-compose.yml     # Docker configuration
```

## 🔧 System Requirements

- **Node.js**: 20+ (development/production)
- **Python**: 3.9-3.11 (ASR dependencies, torch doesn't support 3.12+)
- **Memory**: Minimum 4GB (ASR model uses ~2GB)
- **Disk**: 3GB+ free space (model 2GB + cache)
- **FFmpeg**: For audio format conversion

## 📄 License & Dependencies

### Project License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

### Third-Party Dependencies

| Dependency | License | Purpose | Compatibility |
|-----------|---------|---------|---------------|
| **Node.js Dependencies** ||||
| react | MIT | Frontend framework | ✅ Compatible |
| express | MIT | Backend framework | ✅ Compatible |
| node-edge-tts | MIT | Edge TTS wrapper | ✅ MIT (Same) |
| @huggingface/transformers | Apache-2.0 | ML inference | ✅ Compatible |
| drizzle-orm | MIT | Database ORM | ✅ Compatible |
| better-sqlite3 | MIT | SQLite driver | ✅ Compatible |
| tailwindcss | MIT | CSS framework | ✅ Compatible |
| zod | MIT | Schema validation | ✅ Compatible |
| **Python Dependencies** ||||
| funasr | MIT | Speech recognition | ✅ MIT (Same) |
| torch / torchaudio | BSD-3-Clause | ML framework | ✅ Compatible |
| modelscope | Apache-2.0 | Model hub | ✅ Compatible |
| faster-whisper | MIT | Whisper ASR | ✅ MIT (Same) |
| numpy | BSD-3-Clause | Numerical computing | ✅ Compatible |

### License Compatibility Notes

All dependencies listed above are compatible with the MIT License used by this project.
- **MIT**: Same license as this project
- **BSD-3-Clause**: Permissive license, fully compatible with MIT
- **Apache-2.0**: Compatible with MIT, with additional patent provisions

### Third-Party Services Disclaimer

**Microsoft Edge TTS**: This project uses node-edge-tts to access Microsoft's speech synthesis service. This is an unofficial interface; use in production or commercial contexts may be subject to Microsoft's Terms of Service. For commercial deployments, consider using officially licensed TTS services like Azure Speech Services or Google Cloud Text-to-Speech.

**FunASR Models**: ASR models are downloaded via ModelScope and follow their respective model licenses (typically Apache-2.0 or commercially-friendly licenses).

## 🙏 Acknowledgments

- [FunASR](https://github.com/modelscope/FunASR) - Open-source speech recognition framework
- [Microsoft Edge TTS](https://github.com/microsoft) - Speech synthesis service
- [node-edge-tts](https://github.com/escape-w/node-edge-tts) - Edge TTS Node.js wrapper
- [Hugging Face Transformers](https://huggingface.co/docs/transformers) - ML inference library

---

<p align="center">Made with 💙 by Nicky & AI</p>
