function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

function calculateCER(original: string, recognized: string): number {
  if (original.length === 0) return recognized.length === 0 ? 100 : 0;

  const distance = levenshteinDistance(original, recognized);
  const cer = distance / original.length;
  const score = Math.max(0, Math.round((1 - cer) * 100));

  return score;
}

function longestCommonSubsequence(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function calculateSemanticSimilarity(original: string, recognized: string): number {
  const lcs = longestCommonSubsequence(original, recognized);
  const maxLen = Math.max(original.length, recognized.length);

  if (maxLen === 0) return 100;

  const similarity = lcs / maxLen;
  return Math.round(similarity * 100);
}

function calculateFluency(audioDuration: number | undefined, text: string): number {
  if (!audioDuration || audioDuration <= 0) return 70;

  const charCount = text.length;
  const charsPerSecond = charCount / audioDuration;

  if (charsPerSecond < 2) return 60;
  if (charsPerSecond < 3) return 70;
  if (charsPerSecond < 5) return 85;
  if (charsPerSecond < 8) return 90;
  return 75;
}

function getFeedback(totalScore: number, lang: string): string {
  if (lang === "zh") {
    if (totalScore >= 95) return "完美演绎！";
    if (totalScore >= 85) return "出色表现！";
    if (totalScore >= 70) return "不错，继续加油！";
    if (totalScore >= 40) return "还需努力，再试一次！";
    return "别灰心，再试一次！";
  }

  if (totalScore >= 95) return "Perfect delivery!";
  if (totalScore >= 85) return "Excellent performance!";
  if (totalScore >= 70) return "Good job, keep it up!";
  if (totalScore >= 40) return "Needs work, try again!";
  return "Don't give up, try again!";
}

export function calculateScore(
  originalText: string,
  recognizedText: string,
  audioDuration?: number,
  lang?: string
): { totalScore: number; cerScore: number; semanticScore: number; fluencyScore: number; feedback: string } {
  const cerScore = calculateCER(originalText, recognizedText);
  const semanticScore = calculateSemanticSimilarity(originalText, recognizedText);
  const fluencyScore = calculateFluency(audioDuration, recognizedText);

  const totalScore = Math.round(cerScore * 0.5 + semanticScore * 0.3 + fluencyScore * 0.2);
  const feedback = getFeedback(totalScore, lang || "zh");

  return {
    totalScore,
    cerScore,
    semanticScore,
    fluencyScore,
    feedback,
  };
}
