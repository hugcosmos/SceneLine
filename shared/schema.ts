import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scripts = sqliteTable("scripts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  rawText: text("raw_text").notNull(),
  language: text("language").notNull().default("zh"),
  createdAt: text("created_at").notNull(),
  contentHash: text("content_hash"),  // 用于查重检测
});

export const characters = sqliteTable("characters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scriptId: integer("script_id").notNull().references(() => scripts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  lineCount: integer("line_count").notNull().default(0),
  speakerId: text("speaker_id"),
  gender: text("gender"),
});

export const dialogueLines = sqliteTable("dialogue_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scriptId: integer("script_id").notNull().references(() => scripts.id, { onDelete: "cascade" }),
  characterId: integer("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  lineIndex: integer("line_index").notNull(),
  text: text("text").notNull(),
});

export const practiceSessions = sqliteTable("practice_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scriptId: integer("script_id").notNull().references(() => scripts.id, { onDelete: "cascade" }),
  userCharacterId: integer("user_character_id").notNull().references(() => characters.id),
  mode: text("mode").notNull().default("full"),
  totalScore: integer("total_score"),
  createdAt: text("created_at").notNull(),
});

export const lineScores = sqliteTable("line_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => practiceSessions.id, { onDelete: "cascade" }),
  lineId: integer("line_id").notNull().references(() => dialogueLines.id),
  recognizedText: text("recognized_text"),
  cerScore: integer("cer_score"),
  semanticScore: integer("semantic_score"),
  fluencyScore: integer("fluency_score"),
  totalScore: integer("total_score"),
  feedback: text("feedback"),
});

export const insertScriptSchema = createInsertSchema(scripts);
export const insertCharacterSchema = createInsertSchema(characters);
export const insertDialogueLineSchema = createInsertSchema(dialogueLines);
export const insertPracticeSessionSchema = createInsertSchema(practiceSessions);
export const insertLineScoreSchema = createInsertSchema(lineScores);

export type Script = typeof scripts.$inferSelect;
export type InsertScript = z.infer<typeof insertScriptSchema>;
export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type DialogueLine = typeof dialogueLines.$inferSelect;
export type InsertDialogueLine = z.infer<typeof insertDialogueLineSchema>;
export type PracticeSession = typeof practiceSessions.$inferSelect;
export type InsertPracticeSession = z.infer<typeof insertPracticeSessionSchema>;
export type LineScore = typeof lineScores.$inferSelect;
export type InsertLineScore = z.infer<typeof insertLineScoreSchema>;

export interface ScriptWithDetails {
  id: number;
  title: string;
  rawText: string;
  language: string;
  createdAt: string;
  characters: (Character & { lineCount: number })[];
  lines: (DialogueLine & { characterName: string })[];
}

export interface PracticeSessionWithScores extends PracticeSession {
  scriptTitle: string;
  characterName: string;
  scores: LineScore[];
}
