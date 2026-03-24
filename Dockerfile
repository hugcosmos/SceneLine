FROM node:20-bookworm

# Install Python 3.11, pip, ffmpeg and build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3.11 python3-pip ffmpeg \
    build-essential python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm ci

# Copy Python requirements and install ASR dependencies (使用清华镜像加速)
COPY requirements.txt ./
RUN pip3 install --break-system-packages -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple || \
    pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# Create necessary directories
RUN mkdir -p data tts-cache models tmp-audio logs

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["npm", "start"]
