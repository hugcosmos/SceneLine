# SceneLine 场景台词

<p align="center">
  <b>AI驱动的配音练习平台</b>
</p>

<p align="center">
  <a href="README.md">English</a> | <b>中文</b>
</p>

<p align="center">
  <a href="https://github.com/cosmos/SceneLine/stargazers"><img src="https://img.shields.io/github/stars/cosmos/SceneLine?style=social" alt="Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="#"><img src="https://img.shields.io/badge/Node-20+-green.svg" alt="Node"></a>
  <a href="#"><img src="https://img.shields.io/badge/Python-3.9--3.11-blue.svg" alt="Python"></a>
</p>

---

SceneLine 是一个 AI 驱动的配音练习平台，让语言学习者通过影视场景对话进行沉浸式配音训练。支持语音识别（ASR）、语音合成（TTS）和智能评分。

## ✨ 核心功能

- **🎙️ 实时语音识别** - 使用 FunASR 进行实时语音识别，10倍性能优化（常驻进程模式）
- **🔊 40+ TTS 声音** - Microsoft Edge TTS 支持，40+ 声音选项，按性别/地区筛选
- **🎭 多角色对话** - 支持多角色场景练习，每个角色独立评分
- **📊 练习历史** - 三种视图模式（概览/按脚本/详情），统计练习数据
- **📝 智能去重** - 基于内容哈希的脚本去重，自动合并相同内容
- **🐳 Docker 部署** - 完整的 Docker Compose 配置，支持数据持久化

## 🚀 快速开始

### 方式一：一键启动（推荐）

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/sceneline.git
cd sceneline

# 一键启动
./start.sh
```

首次启动会提示：
- 是否在中国大陆（自动配置镜像源）
- 下载 ASR 模型（约 2GB，首次需要 6-9 分钟）

访问 http://localhost:5000 开始使用

### 方式二：Docker 部署

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式三：手动安装

```bash
# 安装依赖
npm install

# Python 环境（3.9-3.11）
pip install -r requirements.txt

# 启动开发服务器
npm run dev
```

## 📁 项目结构

```
sceneline/
├── server/                 # 后端服务 (Express + TypeScript)
│   ├── lib/               # 核心库 (ASR, TTS)
│   └── routes/            # API 路由
├── client/                # 前端 (React + Vite + Tailwind)
│   └── src/pages/         # 页面组件
├── shared/                # 共享类型定义
├── models/                # ASR 模型缓存
├── tts-cache/             # TTS 音频缓存
├── logs/                  # 应用日志
├── start.sh               # 一键启动脚本
└── docker-compose.yml     # Docker 配置
```

## 🔧 系统要求

- **Node.js**: 20+ (开发/生产)
- **Python**: 3.9-3.11 (ASR 依赖，torch 不支持 3.12+)
- **内存**: 最低 4GB（ASR 模型约占用 2GB）
- **磁盘**: 3GB+ 可用空间（模型 2GB + 缓存）
- **FFmpeg**: 用于音频格式转换

## 📄 许可证与依赖

### 项目许可证

本项目采用 [MIT 许可证](LICENSE) 开源 - 详见 LICENSE 文件。

### 第三方依赖

| 依赖 | 许可证 | 用途 | 兼容性 |
|-----------|---------|---------|---------------|
| **Node.js 依赖** ||||
| react | MIT | 前端框架 | ✅ 兼容 |
| express | MIT | 后端框架 | ✅ 兼容 |
| node-edge-tts | MIT | Edge TTS 封装 | ✅ MIT (相同) |
| @huggingface/transformers | Apache-2.0 | ML 推理 | ✅ 兼容 |
| drizzle-orm | MIT | 数据库 ORM | ✅ 兼容 |
| better-sqlite3 | MIT | SQLite 驱动 | ✅ 兼容 |
| tailwindcss | MIT | CSS 框架 | ✅ 兼容 |
| zod | MIT | 校验库 | ✅ 兼容 |
| **Python 依赖** ||||
| funasr | MIT | 语音识别 | ✅ MIT (相同) |
| torch / torchaudio | BSD-3-Clause | ML 框架 | ✅ 兼容 |
| modelscope | Apache-2.0 | 模型仓库 | ✅ 兼容 |
| faster-whisper | MIT | Whisper ASR | ✅ MIT (相同) |
| numpy | BSD-3-Clause | 数值计算 | ✅ 兼容 |

### 许可证兼容性说明

- **MIT**: 本项目采用 MIT 许可证，与所有列出的依赖兼容。
- **BSD-3-Clause**: 宽松的开源许可证，与 MIT 完全兼容。
- **Apache-2.0**: 与 MIT 兼容，但代码归属和专利条款略有不同。

### 第三方服务声明

**Microsoft Edge TTS**: 本项目使用 node-edge-tts 库调用 Microsoft Edge 浏览器的在线语音合成服务。这是非官方的接口，在 productions 或商业环境中使用可能受 Microsoft 服务条款约束。对于商业部署，建议使用 Azure Speech Services 或 Google Cloud Text-to-Speech 等官方授权服务。

**FunASR Models**: ASR 模型通过 ModelScope 下载，遵循各自的模型许可证（通常为 Apache-2.0 或商业友好许可证）。

## 🙏 致谢

- [FunASR](https://github.com/modelscope/FunASR) - 开源语音识别框架
- [Microsoft Edge TTS](https://github.com/microsoft) - 语音合成服务
- [node-edge-tts](https://github.com/escape-w/node-edge-tts) - Edge TTS Node.js 封装
- [Hugging Face Transformers](https://huggingface.co/docs/transformers) - ML 推理库

---

<p align="center">Made with 💙 by SceneLine Team</p>
