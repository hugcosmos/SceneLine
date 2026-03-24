interface ParsedLine {
  characterName: string;
  text: string;
  lineIndex: number;
}

export function parseScriptPreview(rawText: string): { characters: string[]; lines: ParsedLine[] } {
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

  return {
    characters: Array.from(charactersSet),
    lines: parsedLines,
  };
}
