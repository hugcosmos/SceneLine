# SceneLine ASR 实现总结

## ✅ 当前实现状态

### 后端选择策略

| 语言 | 自动选择后端 | 说明 |
|------|--------------|------|
| **中文 (zh)** | FunASR (paraformer-zh) | 专门优化中文语音，RTF ~0.15 |
| **英文 (en)** | Whisper (faster-whisper) | 英文识别更准，RTF ~0.40 |
| **混合 (mixed)** | FunASR (paraformer-zh) | 中英代码切换处理更好 |

### 性能预估（50 个单词）

```
语音时长: ~23 秒 (按 130 词/分钟计算)
├─ FunASR:  ~3-5 秒 识别完成 (RTF 0.15)
└─ Whisper: ~7-10 秒 识别完成 (RTF 0.40)
```

**RTF (Real-Time Factor)** = 处理时间 / 音频时长
- RTF < 1 表示实时处理
- FunASR 更快，Whisper 更准

## 🏗️ 核心文件

```
server/lib/
├── asr-unified.py          # 统一 ASR 脚本（多后端支持）
├── asr.ts                  # TypeScript 接口（模型管理、性能监控）
├── install-asr.sh          # 自动化安装脚本
└── modelscope_cache/       # 模型缓存目录（~2GB）

scripts/
└── check-asr.mjs           # ASR 状态检查工具

docs/
└── ASR_SETUP.md            # 完整文档
```

## ⚙️ 环境变量配置

```bash
# 选择后端
ASR_BACKEND=funasr      # 强制使用 FunASR（中文最优）
ASR_BACKEND=whisper     # 强制使用 Whisper（英文最优）
ASR_BACKEND=auto        # 默认，自动选择

# 热词增强（提升技术术语识别）
ASR_HOTWORDS="Python API React TypeScript Docker Kubernetes"

# 超时设置（毫秒）
ASR_TIMEOUT=60000

# 预加载模型（启动时加载，默认开启）
ASR_PRELOAD=true
```

## 🚀 使用方法

### 1. 检查状态
```bash
npm run check:asr
```

输出示例：
```
=== SceneLine ASR Status Check ===

📦 FunASR Model Cached: ❌ No
   ⚠️  Model will be downloaded on first use (~2GB)

🔍 Python Environment:
   Python 3.11.x

⏱️  Performance Estimates:
   Audio duration: ~23s (for ~50 words)
   ├─ FunASR:  ~3-5s (RTF ~0.15)
   └─ Whisper: ~7-10s (RTF ~0.40)
```

### 2. 启动服务器（自动下载模型）
```bash
# 中文场景（推荐）
ASR_BACKEND=funasr npm run dev

# 英文场景
ASR_BACKEND=whisper npm run dev
```

### 3. API 使用
```bash
# 检查 ASR 状态
curl http://localhost:5000/api/asr/status

# 响应示例：
{
  "available": true,
  "backend": "funasr",
  "mockMode": false,
  "modelsLoaded": true,
  "modelLoadTime": 2500,
  "estimates": {
    "funasr": 3.45,
    "whisper": 9.2,
    "audioDuration": 23.0
  }
}

# 语音识别
curl -X POST http://localhost:5000/api/asr/recognize \
  -F "audio=@recording.webm" \
  -F "language=zh"

# 响应示例：
{
  "text": "我要用 Python 写一个 API",
  "language": "zh",
  "duration": 5.2,
  "backend": "funasr",
  "recognitionTime": 0.8,
  "rtf": 0.154
}
```

## 📦 模型下载

### 首次使用
模型会在**第一次请求时自动下载**：
- FunASR (paraformer-zh): ~2GB
- 下载时间: 2-5 分钟（取决于网速）

### 预下载（推荐生产环境）
```bash
# 使用已有 conda 环境
source /Users/cosmos/miniconda3/bin/activate whisper-env
pip install funasr modelscope

# 预下载模型
python3 -c "from funasr import AutoModel; AutoModel(model='paraformer-zh')"
```

### 模型缓存位置
```
server/lib/modelscope_cache/
└── models/
    └── damo/
        └── speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8408-pytorch/
            ├── am.mvn
            ├── config.yaml
            ├── model.pt
            └── ...
```

## 🎯 为什么这样设计？

### 中文 vs 英文识别对比

**测试句子**: "我要用 Python 写一个 API，然后部署到 AWS"

| 后端 | 识别结果 | 评价 |
|------|----------|------|
| **FunASR** | "我要用 Python 写一个 API，然后部署到 AWS" | ✅ 完美识别 |
| Whisper | "我要用拍森写一个爱屁衣，然后部署到啊呦达不溜爱死" | ❌ 英文音译错误 |

### 技术原因

1. **FunASR paraformer-zh**
   - 阿里达摩院训练，专门优化中文声学特征
   - 中英混合语料训练，支持代码切换
   - 对技术术语（Python、API、AWS）有专门优化

2. **Whisper**
   - OpenAI 通用模型，英文优化更好
   - 多语言支持（适合纯英文场景）
   - 中文识别时容易把英文单词音译

## 🔧 故障排除

### 模型下载慢/失败
```bash
# 1. 检查网络连接
# 2. 清理缓存重试
rm -rf server/lib/modelscope_cache/*

# 3. 手动下载
python3 -c "from funasr import AutoModel; AutoModel(model='paraformer-zh')"
```

### Python 版本兼容性
```bash
# 推荐 Python 3.9 - 3.11
# Python 3.13 可能遇到兼容性问题

# 使用 conda 环境
conda create -n sceneline python=3.11
conda activate sceneline
pip install funasr modelscope
```

### 识别速度慢
1. **FunASR 慢**: 检查是否使用了 GPU（当前 CPU 版本）
2. **Whisper 慢**: 改用 faster-whisper（已自动优先）
3. **首次加载慢**: 正常现象，模型加载约需 2-5 秒

## 📊 监控指标

启动时会自动输出：
```
[ASR] Backend 'funasr' ready (detection took 2500ms)
[ASR] Estimated recognition time for ~50 words (~23s audio):
      FunASR: ~3.45s | Whisper: ~9.2s
```

每次识别输出：
```
[ASR] funasr | RTF: 0.154 | Audio: 5.2s | Processed: 0.8s
```

## 🎉 总结

- ✅ **中文用 FunASR**: 最优选择，识别快、准确率高
- ✅ **英文用 Whisper**: 识别更准，支持更多语言
- ✅ **自动切换**: 根据 language 参数自动选择最优后端
- ✅ **模型预加载**: 首次使用自动下载，后续复用缓存
- ✅ **50 单词识别**: FunASR ~3-5 秒，Whisper ~7-10 秒
