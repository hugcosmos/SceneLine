import { db } from "./index";
import { scripts, characters, dialogueLines, practiceSessions, lineScores } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { Script, InsertScript, Character, InsertCharacter, DialogueLine, InsertDialogueLine, PracticeSession, InsertPracticeSession, LineScore, InsertLineScore, ScriptWithDetails, PracticeSessionWithScores } from "@shared/schema";

export const storage = {
  async createScript(data: InsertScript): Promise<Script> {
    const [script] = await db.insert(scripts).values(data).returning();
    return script;
  },

  async getScripts(): Promise<Script[]> {
    return await db.select().from(scripts).orderBy(desc(scripts.createdAt));
  },

  async getScriptByContentHash(hash: string): Promise<Script | undefined> {
    return await db.select().from(scripts).where(eq(scripts.contentHash, hash)).get();
  },

  async getScript(id: number): Promise<ScriptWithDetails | undefined> {
    const script = await db.select().from(scripts).where(eq(scripts.id, id)).get();
    if (!script) return undefined;

    const scriptCharacters = await db.select().from(characters).where(eq(characters.scriptId, id));
    const scriptLines = await db
      .select({
        id: dialogueLines.id,
        scriptId: dialogueLines.scriptId,
        characterId: dialogueLines.characterId,
        lineIndex: dialogueLines.lineIndex,
        text: dialogueLines.text,
      })
      .from(dialogueLines)
      .where(eq(dialogueLines.scriptId, id))
      .orderBy(dialogueLines.lineIndex);

    const charMap = new Map(scriptCharacters.map((c) => [c.id, c.name]));

    return {
      ...script,
      characters: scriptCharacters.map((c) => ({ ...c, lineCount: c.lineCount || 0 })),
      lines: scriptLines.map((l) => ({
        ...l,
        characterName: charMap.get(l.characterId) || "Unknown",
      })),
    };
  },

  async deleteScript(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete line scores
      const sessions = await tx.select({ id: practiceSessions.id }).from(practiceSessions).where(eq(practiceSessions.scriptId, id));
      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length > 0) {
        await tx.delete(lineScores).where(eq(lineScores.sessionId, sessionIds[0]));
      }

      // Delete practice sessions
      await tx.delete(practiceSessions).where(eq(practiceSessions.scriptId, id));

      // Delete dialogue lines
      await tx.delete(dialogueLines).where(eq(dialogueLines.scriptId, id));

      // Delete characters
      await tx.delete(characters).where(eq(characters.scriptId, id));

      // Delete script
      await tx.delete(scripts).where(eq(scripts.id, id));
    });
  },

  async createCharacter(data: InsertCharacter): Promise<Character> {
    const [character] = await db.insert(characters).values(data).returning();
    return character;
  },

  async updateCharacter(id: number, data: Partial<Character>): Promise<Character | undefined> {
    const [character] = await db.update(characters).set(data).where(eq(characters.id, id)).returning();
    return character;
  },

  async createDialogueLine(data: InsertDialogueLine): Promise<DialogueLine> {
    const [line] = await db.insert(dialogueLines).values(data).returning();
    return line;
  },

  async createPracticeSession(data: InsertPracticeSession): Promise<PracticeSession> {
    const [session] = await db.insert(practiceSessions).values(data).returning();
    return session;
  },

  async getPracticeSessions(): Promise<PracticeSessionWithScores[]> {
    const sessions = await db.select().from(practiceSessions).orderBy(desc(practiceSessions.createdAt));

    return Promise.all(
      sessions.map(async (session) => {
        const script = await db.select({ title: scripts.title }).from(scripts).where(eq(scripts.id, session.scriptId)).get();
        const char = await db.select({ name: characters.name }).from(characters).where(eq(characters.id, session.userCharacterId)).get();
        const scores = await db.select().from(lineScores).where(eq(lineScores.sessionId, session.id));

        return {
          ...session,
          scriptTitle: script?.title ?? "Unknown",
          characterName: char?.name ?? "Unknown",
          scores,
        };
      })
    );
  },

  async getPracticeSession(id: number): Promise<PracticeSessionWithScores | undefined> {
    const session = await db.select().from(practiceSessions).where(eq(practiceSessions.id, id)).get();
    if (!session) return undefined;

    const script = await db.select({ title: scripts.title }).from(scripts).where(eq(scripts.id, session.scriptId)).get();
    const char = await db.select({ name: characters.name }).from(characters).where(eq(characters.id, session.userCharacterId)).get();
    const scores = await db.select().from(lineScores).where(eq(lineScores.sessionId, session.id));

    return {
      ...session,
      scriptTitle: script?.title ?? "Unknown",
      characterName: char?.name ?? "Unknown",
      scores,
    };
  },

  async updatePracticeSessionScore(id: number, totalScore: number): Promise<void> {
    await db.update(practiceSessions).set({ totalScore }).where(eq(practiceSessions.id, id));
  },

  async createLineScore(data: InsertLineScore): Promise<LineScore> {
    const [score] = await db.insert(lineScores).values(data).returning();
    return score;
  },

  async getLineScoresBySession(sessionId: number): Promise<LineScore[]> {
    return await db.select().from(lineScores).where(eq(lineScores.sessionId, sessionId));
  },
};
