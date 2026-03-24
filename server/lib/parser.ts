interface ParsedLine {
  characterName: string;
  text: string;
  lineIndex: number;
}

interface ParseResult {
  characters: string[];
  lines: ParsedLine[];
  language: "zh" | "en" | "mixed";
}

function detectLanguage(text: string): "zh" | "en" | "mixed" {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const total = chineseChars + englishChars;

  if (total === 0) return "zh";

  const chineseRatio = chineseChars / total;

  if (chineseRatio > 0.7) return "zh";
  if (chineseRatio < 0.3) return "en";
  return "mixed";
}

export function parseScript(rawText: string): ParseResult {
  const lines = rawText.split("\n").filter((line) => line.trim());
  const charactersSet = new Set<string>();
  const parsedLines: ParsedLine[] = [];

  let lineIndex = 0;

  for (const line of lines) {
    let match: RegExpMatchArray | null = null;

    match = line.match(/^([^:：]+)[：:]\s*(.+)$/);
    if (!match) {
      match = line.match(/^([^\t]+)\t+(.+)$/);
    }

    if (match) {
      const characterName = match[1].trim();
      const text = match[2].trim();

      if (characterName && text) {
        charactersSet.add(characterName);
        parsedLines.push({
          characterName,
          text,
          lineIndex: lineIndex++,
        });
      }
    }
  }

  const characters = Array.from(charactersSet);
  const language = detectLanguage(rawText);

  return {
    characters,
    lines: parsedLines,
    language,
  };
}

export function parseScriptPreview(rawText: string): { characters: string[]; lines: ParsedLine[] } {
  const result = parseScript(rawText);
  return {
    characters: result.characters,
    lines: result.lines,
  };
}
