import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { parseScript } from "./lib/parser";
import { calculateScore } from "./lib/scoring";
import { synthesize, getAllVoices, getVoicesByLocale, getVoicesByGender, getVoiceStats, getTTSStatus } from "./lib/tts";
import { recognize, preloadModel, getASRStatus, updateHotwords } from "./lib/asr";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const upload = multer({ storage: multer.memoryStorage() });



export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/scripts", async (req, res) => {
    try {
      const { title, rawText, language } = req.body;

      if (!title || !rawText) {
        return res.status(400).json({ error: "Title and rawText are required" });
      }

      const parseResult = parseScript(rawText);
      const detectedLanguage = language || parseResult.language;
      
      // 计算内容哈希用于查重
      const contentHash = crypto.createHash("md5").update(rawText.trim()).digest("hex");
      
      // 检查是否已存在相同内容的剧本
      const existingScript = await storage.getScriptByContentHash(contentHash);
      if (existingScript) {
        return res.status(200).json({
          existing: true,
          script: existingScript,
          message: "Script with same content already exists",
        });
      }

      const script = await storage.createScript({
        title,
        rawText,
        language: detectedLanguage,
        createdAt: new Date().toISOString(),
        contentHash,
      });

      const characterMap = new Map<string, number>();
      const lineCounts = new Map<string, number>();

      for (const line of parseResult.lines) {
        lineCounts.set(
          line.characterName,
          (lineCounts.get(line.characterName) || 0) + 1
        );
      }

      for (const charName of parseResult.characters) {
        const character = await storage.createCharacter({
          scriptId: script.id,
          name: charName,
          lineCount: lineCounts.get(charName) || 0,
        });
        characterMap.set(charName, character.id);
      }

      for (const line of parseResult.lines) {
        const characterId = characterMap.get(line.characterName);
        if (characterId !== undefined) {
          await storage.createDialogueLine({
            scriptId: script.id,
            characterId,
            lineIndex: line.lineIndex,
            text: line.text,
          });
        }
      }

      const scriptWithDetails = await storage.getScript(script.id);
      return res.status(201).json(scriptWithDetails);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create script";
      return res.status(500).json({ error: message });
    }
  });

  app.get("/api/scripts", async (_req, res) => {
    try {
      const allScripts = await storage.getScripts();
      return res.json(allScripts);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get scripts";
      return res.status(500).json({ error: message });
    }
  });

  app.get("/api/scripts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid script ID" });
      }

      const script = await storage.getScript(id);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }

      return res.json(script);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get script";
      return res.status(500).json({ error: message });
    }
  });

  app.delete("/api/scripts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid script ID" });
      }

      const script = await storage.getScript(id);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }

      await storage.deleteScript(id);
      return res.json({ success: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete script";
      return res.status(500).json({ error: message });
    }
  });

  app.patch("/api/characters/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid character ID" });
      }

      const { speakerId, gender } = req.body;
      const updated = await storage.updateCharacter(id, { speakerId, gender });

      if (!updated) {
        return res.status(404).json({ error: "Character not found" });
      }

      return res.json(updated);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update character";
      return res.status(500).json({ error: message });
    }
  });

  app.post("/api/tts/synthesize", async (req, res) => {
    try {
      const { text, speakerId, language } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const result = await synthesize(text, speakerId, language);

      const filename = path.basename(result.audioPath);
      return res.json({
        audioUrl: `/api/tts/audio/${filename}`,
        duration: result.duration,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "TTS synthesis failed";
      console.error("[TTS] Synthesis error:", message);
      return res.status(503).json({ 
        error: message,
        details: "TTS service temporarily unavailable. Please try again."
      });
    }
  });

  app.get("/api/tts/audio/:filename", async (req, res) => {
    try {
      const audioPath = path.resolve("tts-cache", req.params.filename);
      if (!fs.existsSync(audioPath)) {
        return res.status(404).json({ error: "Audio file not found" });
      }
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.sendFile(audioPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to serve audio";
      return res.status(500).json({ error: message });
    }
  });

  // Health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      const ttsStatus = getTTSStatus();
      const asrStatus = getASRStatus();
      
      return res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          tts: {
            available: true,
            voices: ttsStatus.voiceCount,
            cacheSize: ttsStatus.cacheSize,
          },
          asr: {
            available: asrStatus.available,
            backend: asrStatus.backend,
            modelsLoaded: asrStatus.modelsLoaded,
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Health check failed";
      return res.status(500).json({ status: "unhealthy", error: message });
    }
  });

  // Get all available TTS voices (40+ voices)
  app.get("/api/tts/voices", async (_req, res) => {
    try {
      const voices = getAllVoices();
      return res.json(voices);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get voices";
      return res.status(500).json({ error: message });
    }
  });

  // Get voices by locale (e.g., /api/tts/voices/zh, /api/tts/voices/en)
  app.get("/api/tts/voices/:locale", async (req, res) => {
    try {
      const { locale } = req.params;
      const { gender } = req.query;
      
      let voices;
      if (gender && (gender === 'male' || gender === 'female')) {
        voices = getVoicesByGender(gender, locale);
      } else {
        voices = getVoicesByLocale(locale);
      }
      
      return res.json(voices);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get voices";
      return res.status(500).json({ error: message });
    }
  });

  // Get voice statistics
  app.get("/api/tts/stats", async (_req, res) => {
    try {
      const stats = getVoiceStats();
      return res.json(stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get stats";
      return res.status(500).json({ error: message });
    }
  });

  preloadModel();

  app.post(
    "/api/asr/recognize",
    upload.single("audio"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No audio file provided" });
        }

        const language = req.body.language || "zh"; // Language: 'zh', 'en', or 'mixed'

        const result = await recognize(
          req.file.buffer,
          req.file.mimetype,
          language
        );

        return res.json(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "ASR recognition failed";
        console.error("[ASR] Recognition error:", message);
        return res.status(500).json({ error: message });
      }
    }
  );

  // Get ASR backend status
  app.get("/api/asr/status", async (_req, res) => {
    try {
      const status = getASRStatus();
      return res.json(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get ASR status";
      return res.status(500).json({ error: message });
    }
  });

  // Update ASR hotwords for better recognition
  app.post("/api/asr/hotwords", async (req, res) => {
    try {
      const { hotwords } = req.body;
      if (!hotwords || typeof hotwords !== "string") {
        return res.status(400).json({ error: "hotwords string is required" });
      }
      updateHotwords(hotwords);
      return res.json({ success: true, hotwords });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update hotwords";
      return res.status(500).json({ error: message });
    }
  });

  app.post("/api/score", async (req, res) => {
    try {
      const { originalText, recognizedText, audioDuration, lang } = req.body;

      if (originalText === undefined || recognizedText === undefined) {
        return res
          .status(400)
          .json({ error: "originalText and recognizedText are required" });
      }

      const result = calculateScore(
        originalText,
        recognizedText,
        audioDuration,
        lang
      );
      return res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Scoring failed";
      return res.status(500).json({ error: message });
    }
  });

  app.post("/api/practice", async (req, res) => {
    try {
      const { scriptId, userCharacterId, mode } = req.body;

      if (!scriptId || !userCharacterId) {
        return res
          .status(400)
          .json({ error: "scriptId and userCharacterId are required" });
      }

      const session = await storage.createPracticeSession({
        scriptId,
        userCharacterId,
        mode: mode || "full",
        createdAt: new Date().toISOString(),
      });

      return res.status(201).json(session);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create practice session";
      return res.status(500).json({ error: message });
    }
  });

  app.get("/api/practice", async (_req, res) => {
    try {
      const sessions = await storage.getPracticeSessions();
      return res.json(sessions);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to get practice sessions";
      return res.status(500).json({ error: message });
    }
  });

  app.get("/api/practice/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const session = await storage.getPracticeSession(id);
      if (!session) {
        return res.status(404).json({ error: "Practice session not found" });
      }

      return res.json(session);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to get practice session";
      return res.status(500).json({ error: message });
    }
  });

  app.post("/api/practice/:sessionId/scores", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId, 10);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const {
        lineId,
        recognizedText,
        cerScore,
        semanticScore,
        fluencyScore,
        totalScore,
        feedback,
      } = req.body;

      if (!lineId) {
        return res.status(400).json({ error: "lineId is required" });
      }

      const session = await storage.getPracticeSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Practice session not found" });
      }

      const lineScore = await storage.createLineScore({
        sessionId,
        lineId,
        recognizedText,
        cerScore,
        semanticScore,
        fluencyScore,
        totalScore,
        feedback,
      });

      const allScores = await storage.getLineScoresBySession(sessionId);
      if (allScores.length > 0) {
        const avgScore = Math.round(
          allScores.reduce((sum, s) => sum + (s.totalScore || 0), 0) /
            allScores.length
        );
        await storage.updatePracticeSessionScore(sessionId, avgScore);
      }

      return res.status(201).json(lineScore);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create line score";
      return res.status(500).json({ error: message });
    }
  });

  return httpServer;
}
