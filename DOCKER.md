# Docker 部署指南

## 快速开始

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

## 持久化数据

以下数据会通过 volume 挂载到宿主机：

| 宿主机路径 | 容器路径 | 说明 |
|-----------|---------|------|
| `./sceneline.db` | `/app/sceneline.db` | SQLite 数据库 |
| `./data` | `/app/data` | 数据目录 |
| `./models` | `/app/models` | ASR 模型文件 (~2GB) |
| `./tts-cache` | `/app/tts-cache` | TTS 语音缓存 |
| `./tmp-audio` | `/app/tmp-audio` | 临时音频文件 |
| `./logs` | `/app/logs` | 日志文件 |

## 首次运行

首次启动时会自动：
1. 创建数据库表结构
2. 安装 Python 依赖（torch, funasr 等）
3. 下载 ASR 模型到 `./models` 目录（约 2GB，只需一次）

## 国内网络加速

如果下载慢，修改 Dockerfile 中的 pip 源：

```dockerfile
RUN pip3 install ... -i https://pypi.tuna.tsinghua.edu.cn/simple
```

或使用代理构建：

```bash
docker-compose build --build-arg HTTP_PROXY=http://proxy:port
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建
docker-compose down
docker-compose up -d --build

# 保留数据，只更新代码
```

## 故障排查

```bash
# 查看容器状态
docker-compose ps

# 进入容器
docker-compose exec sceneline bash

# 查看服务日志
docker-compose logs -f --tail=100

# 检查健康状态
curl http://localhost:5000/api/health
```

## 端口映射

默认映射宿主机 5000 端口到容器 5000 端口：

```yaml
ports:
  - "5000:5000"  # 可修改为 "80:5000" 等
```

访问：http://localhost:5000
