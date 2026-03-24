import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  History as HistoryIcon,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  BarChart3,
  Trophy,
  Target,
  BookOpen,
  Clock,
  Play,
  LayoutGrid,
  List,
} from "lucide-react";
import type { PracticeSessionWithScores } from "@shared/schema";
import { useI18n } from "@/lib/i18n";

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-rose-500";
}

function getScoreBadgeBg(score: number | null): string {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (score >= 60) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
}

interface ScriptStats {
  scriptId: number;
  title: string;
  sessions: number;
  avgScore: number | null;
  bestScore: number | null;
  lastPracticed: string;
  characters: string[];  // 练习过的角色
}

function calculateScriptStats(sessions: PracticeSessionWithScores[]): ScriptStats[] {
  const statsMap = new Map<string, PracticeSessionWithScores[]>();
  
  sessions.forEach(session => {
    const list = statsMap.get(session.scriptTitle) || [];
    list.push(session);
    statsMap.set(session.scriptTitle, list);
  });
  
  return Array.from(statsMap.entries()).map(([title, list]) => {
    const scores = list.map(s => s.totalScore).filter((s): s is number => s !== null);
    const characters = [...new Set(list.map(s => s.characterName))];
    return {
      scriptId: list[0].scriptId,
      title,
      sessions: list.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      bestScore: scores.length > 0 ? Math.max(...scores) : null,
      lastPracticed: list[0]?.createdAt || "",
      characters,
    };
  }).sort((a, b) => new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime());
}

function ScriptStatsCard({ stats }: { stats: ScriptStats }) {
  const { t, lang } = useI18n();
  
  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
    });
  }
  
  return (
    <Card className="border-card-border hover:border-primary/50 transition-colors">
      <CardContent className="pt-4 pb-4">
        {/* 标题和分数 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <p className="font-semibold text-base truncate">{stats.title}</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>
              {stats.avgScore ?? "—"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("history.avgScore")}
            </p>
          </div>
        </div>
        
        {/* 统计信息 */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-muted/50 rounded px-2 py-1.5 text-center">
            <p className="text-sm font-semibold">{stats.sessions}</p>
            <p className="text-[10px] text-muted-foreground">{t("history.sessions")}</p>
          </div>
          <div className="bg-muted/50 rounded px-2 py-1.5 text-center">
            <p className={`text-sm font-semibold ${getScoreColor(stats.bestScore)}`}>
              {stats.bestScore ?? "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">{t("history.bestScore")}</p>
          </div>
          <div className="bg-muted/50 rounded px-2 py-1.5 text-center">
            <p className="text-sm font-semibold">{stats.characters.length}</p>
            <p className="text-[10px] text-muted-foreground">{t("history.roles")}</p>
          </div>
        </div>
        
        {/* 底部信息 */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {t("history.lastPracticed")}: {formatDate(stats.lastPracticed)}
          </div>
          <Link href={`/scripts/${stats.scriptId}`}>
            <Button variant="default" size="sm" className="h-7 px-3 text-xs">
              <Play className="h-3 w-3 mr-1" />
              {t("history.continue")}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function OverallStats({ sessions }: { sessions: PracticeSessionWithScores[] }) {
  const { t } = useI18n();
  
  const totalSessions = sessions.length;
  const scores = sessions.map((s) => s.totalScore).filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const maxScore = scores.length > 0 ? Math.max(...scores) : null;
  const uniqueScripts = new Set(sessions.map(s => s.scriptTitle)).size;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="border-card-border">
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">{t("history.scriptsUsed")}</span>
          </div>
          <p className="text-xl font-bold mt-1">{uniqueScripts}</p>
        </CardContent>
      </Card>
      <Card className="border-card-border">
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">{t("history.totalSessions")}</span>
          </div>
          <p className="text-xl font-bold mt-1">{totalSessions}</p>
        </CardContent>
      </Card>
      <Card className="border-card-border">
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">{t("history.avgScore")}</span>
          </div>
          <p className={`text-xl font-bold mt-1 ${avgScore !== null ? getScoreColor(avgScore) : ""}`}>
            {avgScore ?? "—"}
          </p>
        </CardContent>
      </Card>
      <Card className="border-card-border">
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">{t("history.bestScore")}</span>
          </div>
          <p className={`text-xl font-bold mt-1 ${maxScore !== null ? getScoreColor(maxScore) : ""}`}>
            {maxScore ?? "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreTrendChart({ sessions }: { sessions: PracticeSessionWithScores[] }) {
  const { t } = useI18n();
  const recent = [...sessions].slice(0, 10).reverse();
  if (recent.length < 2) return null;

  const maxScore = 100;

  return (
    <Card className="border-card-border">
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span>{t("history.trend")}</span>
          <span className="text-xs text-muted-foreground font-normal ml-auto">{t("history.latestRight")}</span>
        </div>
        <div className="flex items-end gap-1 h-24" data-testid="score-trend-chart">
          {recent.map((s, i) => {
            const score = s.totalScore ?? 0;
            const heightPct = Math.max((score / maxScore) * 100, 4);
            const isLast = i === recent.length - 1;
            return (
              <div
                key={s.id}
                className="flex-1 flex flex-col items-center gap-1"
                data-testid={`trend-bar-${i}`}
                title={`${s.scriptTitle}: ${score}`}
              >
                <span className="text-[10px] text-muted-foreground">{score}</span>
                <div
                  className={`w-full rounded-t transition-all ${isLast ? "bg-primary" : "bg-primary/40"}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionCard({ session }: { session: PracticeSessionWithScores }) {
  const [expanded, setExpanded] = useState(false);
  const { t, lang } = useI18n();

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const practicedLines = session.scores?.filter((s) => s.recognizedText).length ?? 0;
  const totalLines = session.scores?.length ?? 0;

  return (
    <Card className="border-card-border" data-testid={`card-session-${session.id}`}>
      <CardContent className="pt-4">
        <button
          className="w-full text-left"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-expand-session-${session.id}`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{session.scriptTitle}</p>
                <Badge variant="outline" className="text-[10px] h-5 px-1">
                  {session.mode === "line-by-line" ? t("history.modeLine") : t("history.modeFull")}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span>
                  {t("history.played")}: {session.characterName}
                </span>
                <span>·</span>
                <span>{formatDate(session.createdAt)}</span>
                <span>·</span>
                <span className="text-xs">
                  {practicedLines}/{totalLines} {t("history.lines")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className={`text-lg font-bold ${getScoreColor(session.totalScore)}`}>
                {session.totalScore ?? "—"}
              </span>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>

        {expanded && session.scores && session.scores.length > 0 && (
          <div className="mt-3 pt-3 border-t divide-y divide-border" data-testid={`session-scores-${session.id}`}>
            {session.scores.map((score, i) => (
              <div key={score.id} className="py-2 flex items-center justify-between text-sm" data-testid={`line-score-${i}`}>
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs text-muted-foreground truncate">{score.recognizedText || "—"}</p>
                </div>
                <Badge className={`text-xs ${getScoreBadgeBg(score.totalScore ?? null)}`}>
                  {score.totalScore != null ? Math.round(score.totalScore) : "—"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function History() {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<"overview" | "byScript" | "details">("overview");

  const { data: sessions, isLoading } = useQuery<PracticeSessionWithScores[]>({
    queryKey: ["/api/practice"],
    queryFn: async () => {
      const res = await fetch("/api/practice");
      if (!res.ok) throw new Error("Failed to fetch practice sessions");
      return res.json();
    },
  });

  const sortedSessions = sessions ?? [];
  const scriptStats = sortedSessions.length > 0 ? calculateScriptStats(sortedSessions) : [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 min-h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" data-testid="page-title-history">
          {t("history.title")}
        </h1>
        
        {sortedSessions.length > 0 && (
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "overview" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode("overview")}
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              {t("history.overview")}
            </Button>
            <Button
              variant={viewMode === "byScript" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode("byScript")}
            >
              <LayoutGrid className="h-3 w-3 mr-1" />
              {t("history.byScript")}
            </Button>
            <Button
              variant={viewMode === "details" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode("details")}
            >
              <List className="h-3 w-3 mr-1" />
              {t("history.details")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-card-border">
                <CardContent className="pt-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedSessions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Card className="border-card-border border-dashed w-full">
              <CardContent className="py-16 flex flex-col items-center text-center space-y-3">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <HistoryIcon className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{t("history.noHistory")}</p>
                <p className="text-xs text-muted-foreground">{t("history.noHistoryHint")}</p>
                <Link href="/scripts/new">
                  <Button variant="outline" size="sm" data-testid="link-upload-from-history">
                    {t("history.startPractice")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === "overview" && (
              <>
                <OverallStats sessions={sortedSessions} />
                {sortedSessions.length >= 2 && <ScoreTrendChart sessions={sortedSessions} />}
              </>
            )}

            {viewMode === "byScript" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {scriptStats.map((stats) => (
                  <ScriptStatsCard key={stats.title} stats={stats} />
                ))}
              </div>
            )}

            {viewMode === "details" && (
              <div className="space-y-3">
                {sortedSessions.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
