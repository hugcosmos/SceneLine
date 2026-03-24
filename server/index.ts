import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

const sqlite = new Database(path.resolve("sceneline.db"));
export const db = drizzle(sqlite, { schema });

// Enable foreign keys
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Create tables (matches Drizzle schema exactly)
sqlite.exec(`
  -- Scripts table
  CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'zh',
    created_at TEXT NOT NULL,
    content_hash TEXT
  );
  
  -- Characters table
  CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    line_count INTEGER NOT NULL DEFAULT 0,
    speaker_id TEXT,
    gender TEXT,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
  );
  
  -- Dialogue lines table
  CREATE TABLE IF NOT EXISTS dialogue_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    line_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  );
  
  -- Practice sessions table
  CREATE TABLE IF NOT EXISTS practice_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id INTEGER NOT NULL,
    user_character_id INTEGER NOT NULL,
    mode TEXT NOT NULL DEFAULT 'full',
    total_score INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_character_id) REFERENCES characters(id)
  );
  
  -- Line scores table
  CREATE TABLE IF NOT EXISTS line_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    line_id INTEGER NOT NULL,
    recognized_text TEXT,
    cer_score INTEGER,
    semantic_score INTEGER,
    fluency_score INTEGER,
    total_score INTEGER,
    feedback TEXT,
    FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (line_id) REFERENCES dialogue_lines(id)
  );
`);

// Create indexes for better query performance
sqlite.exec(`
  CREATE INDEX IF NOT EXISTS idx_characters_script_id ON characters(script_id);
  CREATE INDEX IF NOT EXISTS idx_dialogue_lines_script_id ON dialogue_lines(script_id);
  CREATE INDEX IF NOT EXISTS idx_dialogue_lines_character_id ON dialogue_lines(character_id);
  CREATE INDEX IF NOT EXISTS idx_practice_sessions_script_id ON practice_sessions(script_id);
  CREATE INDEX IF NOT EXISTS idx_line_scores_session_id ON line_scores(session_id);
`);

// Migration: Add content_hash column if not exists (for existing databases)
try {
  const tableInfo = sqlite.prepare(`PRAGMA table_info(scripts)`).all() as {name: string}[];
  const hasContentHash = tableInfo.some(col => col.name === 'content_hash');
  if (!hasContentHash) {
    sqlite.exec(`ALTER TABLE scripts ADD COLUMN content_hash TEXT`);
    console.log('[DB] Migrated: Added content_hash column to scripts table');
  }
} catch (err) {
  console.error('[DB] Migration error:', err);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const httpServer = createServer(app);
registerRoutes(httpServer, app);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve("dist/client")));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve("dist/client/index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const viteServer = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(viteServer.middlewares);
}

const PORT = Number(process.env.PORT) || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  🎭 SceneLine running at http://localhost:${PORT}\n`);
});

process.on("SIGTERM", () => {
  httpServer.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});
