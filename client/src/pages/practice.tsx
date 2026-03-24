import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, Link, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play,
  Pause,
  Mic,
  Square,
  SkipForward,
  Volume2,
  Star,
  RotateCcw,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ScriptWithDetails } from "@shared/schema";
import { useI18n } from "@/lib/i18n";

type PracticeState =
  | "loading"
  | "ready"
  | "playing-other"
  | "waiting-record"
  | "recording"
  | "recognizing"
  | "scoring"
  | "line-result"
  | "finished";

interface LineResult {
  lineIndex: number;
  recognizedText: string;
  score: number;
  feedback: string;
}

const CHARACTER_COLORS = [
  "bg-violet-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-indigo-500",
];

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-rose-500";
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "destructive";
}

function renderStars(score: number) {
  const filled = Math.round((score / 100) * 5);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${i < filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function Practice() {
  const params = useParams<{ scriptId: string }>();
  const { toast } = useToast();
  const { t, lang } = useI18n();

  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const charId = searchParams.get("char");
  const mode = searchParams.get("mode") || "full";

  const [state, setState] = useState<PracticeState>("loading");
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [lineResults, setLineResults] = useState<LineResult[]>([]);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [currentRecognized, setCurrentRecognized] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [webSpeechSupported, setWebSpeechSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const sessionCreatedRef = useRef(false);  // 防止重复创建 session
  
  // Check if Web Speech API is supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setWebSpeechSupported(!!SpeechRecognition);
  }, []);

  const { data: script, isLoading } = useQuery<ScriptWithDetails>({
    queryKey: ["/api/scripts", params.scriptId],
    queryFn: async () => {
      const res = await fetch(`/api/scripts/${params.scriptId}`);
      if (!res.ok) throw new Error("Failed to fetch script");
      return res.json();
    },
  });

  const userCharId = charId ? parseInt(charId, 10) : null;
  const lines = script?.lines ?? [];
  const characters = script?.characters ?? [];
  const charIndexMap = new Map(characters.map((c, i) => [c.id, i]));

  const currentLine = lines[currentLineIdx];
  const isUserLine = currentLine ? currentLine.characterId === userCharId : false;
  const totalLines = lines.length;
  const progressPercent = totalLines > 0 ? ((currentLineIdx + 1) / totalLines) * 100 : 0;

  const createSession = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/practice", {
        scriptId: parseInt(params.scriptId, 10),
        userCharacterId: userCharId,
        mode: mode === "line" ? "line-by-line" : "full",
        createdAt: new Date().toISOString(),
      });
      return (await res.json()) as { id: number };
    },
    onSuccess: (data) => {
      setSessionId(data.id);
    },
  });

  useEffect(() => {
    if (script && !sessionId && !createSession.isPending && !sessionCreatedRef.current) {
      sessionCreatedRef.current = true;
      createSession.mutate();
    }
  }, [script, sessionId]);  // 不依赖 createSession 防止重复

  useEffect(() => {
    if (script && state === "loading") {
      setState("ready");
    }
  }, [script, state]);

  const recognize = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("language", lang); // 传递语言参数

      const res = await fetch(`/api/asr/recognize`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("ASR recognition failed");
      return (await res.json()) as { text: string; language: string; duration: number };
    },
  });

  const scoreResult = useMutation({
    mutationFn: async (data: { originalText: string; recognizedText: string; audioDuration?: number; lang: string }) => {
      const res = await apiRequest("POST", "/api/score", data);
      return (await res.json()) as { totalScore: number; feedback: string; cerScore?: number; semanticScore?: number; fluencyScore?: number };
    },
  });

  // 保存分数到数据库
  const saveLineScore = useMutation({
    mutationFn: async (data: { 
      sessionId: number; 
      lineId: number; 
      recognizedText: string; 
      totalScore: number;
      cerScore?: number;
      semanticScore?: number;
      fluencyScore?: number;
      feedback?: string;
    }) => {
      const res = await apiRequest("POST", `/api/practice/${data.sessionId}/scores`, data);
      return res.json();
    },
  });

  const playTTS = useCallback(
    async (text: string, speakerId?: string | null) => {
      try {
        const res = await apiRequest("POST", "/api/tts/synthesize", {
          text,
          speakerId: speakerId ?? "default",
          language: script?.language ?? "zh",
        });
        const data = (await res.json()) as { audioUrl: string };
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          ttsAudioRef.current = audio;
          await audio.play();
          return new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
          });
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    },
    [script]
  );

  const advanceLine = useCallback(() => {
    setCurrentScore(null);
    setCurrentRecognized("");
    if (currentLineIdx + 1 < totalLines) {
      setCurrentLineIdx((i) => i + 1);
      setState("ready");
    } else {
      setState("finished");
    }
  }, [currentLineIdx, totalLines]);

  const handlePlayLine = useCallback(async () => {
    if (!currentLine || isUserLine) return;

    setState("playing-other");
    const char = characters.find((c) => c.id === currentLine.characterId);
    await playTTS(currentLine.text, char?.speakerId);
    advanceLine();
  }, [currentLine, isUserLine, characters, playTTS, advanceLine]);



  useEffect(() => {
    if (state === "ready" && currentLine) {
      if (isUserLine) {
        setState("waiting-record");
      } else {
        handlePlayLine();
      }
    }
  }, [state, currentLineIdx, currentLine, isUserLine, handlePlayLine]);

  const startServerSideRecording = useCallback(async (stream: MediaStream) => {
    // Capture current values to avoid closure issues
    const currentLineSnapshot = currentLine;
    const currentLineIdxSnapshot = currentLineIdx;
    
    console.log("[Practice] Using server-side recognition (fallback)");
    // Fallback to server-side recognition
    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      if (!currentLineSnapshot) {
        console.error("[Practice] No current line available");
        toast({
          title: t("practice.error"),
          description: t("practice.lineNotFound"),
          variant: "destructive",
        });
        setState("waiting-record");
        return;
      }

      setState("recognizing");

      try {
        const asrResult = await recognize.mutateAsync(audioBlob);
        setCurrentRecognized(asrResult.text);

        setState("scoring");
        const scoreData = await scoreResult.mutateAsync({
          originalText: currentLineSnapshot.text,
          recognizedText: asrResult.text,
          audioDuration: asrResult.duration,
          lang,
        });

        const result: LineResult = {
          lineIndex: currentLineIdxSnapshot,
          recognizedText: asrResult.text,
          score: scoreData.totalScore,
          feedback: scoreData.feedback,
        };

        setLineResults((prev) => [...prev, result]);
        setCurrentScore(scoreData.totalScore);
        
        // 保存分数到数据库
        if (sessionId && currentLineSnapshot) {
          saveLineScore.mutate({
            sessionId,
            lineId: currentLineSnapshot.id,
            recognizedText: asrResult.text,
            totalScore: scoreData.totalScore,
            cerScore: scoreData.cerScore,
            semanticScore: scoreData.semanticScore,
            fluencyScore: scoreData.fluencyScore,
            feedback: scoreData.feedback,
          });
        }
        
        setState("line-result");
      } catch (err) {
        toast({
          title: t("practice.asrFailed"),
          description: err instanceof Error ? err.message : t("practice.unknownError"),
          variant: "destructive",
        });
        setState("waiting-record");
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setState("recording");
  }, [currentLine, currentLineIdx, toast, lang, scoreResult, recognize, t]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[Practice] Using server-side recognition (model-based)");
      // 直接使用服务器端模型识别，不使用Web Speech API
      startServerSideRecording(stream);
    } catch (err) {
      console.error("[Practice] Failed to access microphone:", err);
      toast({ title: t("practice.micDenied"), description: t("practice.micDeniedDesc"), variant: "destructive" });
    }
  }, [toast, t, startServerSideRecording]);

  const stopRecording = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      // 立即更新状态为识别中，提供更好的用户反馈
      setState("recognizing");
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      // 立即更新状态为识别中，提供更好的用户反馈
      setState("recognizing");
    }
  }, []);

  const skipLine = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    advanceLine();
  }, [advanceLine]);

  const resetPractice = useCallback(() => {
    setCurrentLineIdx(0);
    setLineResults([]);
    setCurrentScore(null);
    setCurrentRecognized("");
    setState("ready");
    createSession.mutate();
  }, [createSession]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-48" />
        <Skeleton className="h-12 w-32 mx-auto" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">{t("practice.notFound")}</p>
        <Link href="/">
          <Button variant="outline" className="mt-4" data-testid="link-back-home">{t("practice.backHome")}</Button>
        </Link>
      </div>
    );
  }

  if (state === "finished") {
    const userResults = lineResults;
    const avgScore =
      userResults.length > 0
        ? Math.round(userResults.reduce((sum, r) => sum + r.score, 0) / userResults.length)
        : 0;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6" data-testid="practice-finished">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-bold">{t("practice.finished")}</h1>
          <div className="flex justify-center">{renderStars(avgScore)}</div>
          <p className={`text-3xl font-bold ${getScoreColor(avgScore)}`} data-testid="text-avg-score">
            {avgScore}
          </p>
          <p className="text-sm text-muted-foreground">{t("practice.avgScore")}</p>
        </div>

        <Card className="border-card-border">
          <CardContent className="pt-4 divide-y divide-border">
            {userResults.map((r, i) => {
              const line = lines[r.lineIndex];
              return (
                <div key={i} className="py-3 flex items-start justify-between gap-3" data-testid={`result-line-${i}`}>
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-sm">{line?.text}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t("practice.recognized")}: {r.recognizedText || "—"}
                    </p>
                  </div>
                  <Badge variant={getScoreBadgeVariant(r.score)} className="shrink-0">
                    {r.score}
                  </Badge>
                </div>
              );
            })}
            {userResults.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground text-center">{t("practice.noRecordings")}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={resetPractice} data-testid="button-retry">
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("practice.tryAgain")}
          </Button>
          <Link href={`/scripts/${script.id}`}>
            <Button variant="secondary" data-testid="button-back-script">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("practice.backToScript")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const charObj = currentLine
    ? characters.find((c) => c.id === currentLine.characterId)
    : null;
  const charIdx = charObj ? charIndexMap.get(charObj.id) ?? 0 : 0;
  const dotColor = CHARACTER_COLORS[charIdx % CHARACTER_COLORS.length];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6" data-testid="practice-active">
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{script.title}</span>
          <span>
            {currentLineIdx + 1} / {totalLines}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" data-testid="progress-bar" />
      </div>

      <Card className="border-card-border" data-testid="card-current-line">
        <CardContent className="pt-6 pb-6 text-center space-y-4 min-h-[180px] flex flex-col items-center justify-center">
          {currentLine && (
            <>
              <div className="flex items-center gap-2 justify-center">
                <span className={`inline-block h-3 w-3 rounded-full ${dotColor}`} />
                <span className="font-semibold text-sm">
                  {currentLine.characterName}
                </span>
                {isUserLine && (
                  <Badge variant="default" className="text-xs">{t("practice.yourRole")}</Badge>
                )}
              </div>

              <p className="text-lg leading-relaxed max-w-md" data-testid="text-current-dialogue">
                {currentLine.text}
              </p>

              {state === "playing-other" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Volume2 className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">{t("practice.playing")}</span>
                </div>
              )}

              {state === "waiting-record" && (
                <p className="text-sm text-primary font-medium animate-pulse" data-testid="text-your-turn">
                  {t("practice.yourTurn")}
                </p>
              )}

              {state === "recording" && (
                <p className="text-sm text-destructive font-medium" data-testid="text-recording">
                  {t("practice.recording")}
                </p>
              )}

              {state === "recognizing" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t("practice.recognizing")}</span>
                </div>
              )}

              {state === "scoring" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t("practice.scoring")}</span>
                </div>
              )}

              {state === "line-result" && currentScore !== null && (
                <div className="space-y-2" data-testid="line-score-result">
                  <p className={`text-3xl font-bold transition-all ${getScoreColor(currentScore)}`}>
                    {currentScore}
                  </p>
                  {currentRecognized && (
                    <p className="text-xs text-muted-foreground">
                      {t("practice.recognized")}: {currentRecognized}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-4" data-testid="practice-controls">
        <Button
          variant="ghost"
          size="sm"
          onClick={skipLine}
          disabled={state === "recording" || state === "recognizing" || state === "scoring"}
          data-testid="button-skip"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {isUserLine && (
          <>
            {state === "waiting-record" && (
              <button
                onClick={startRecording}
                className="h-16 w-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                data-testid="button-record-start"
              >
                <Mic className="h-6 w-6" />
              </button>
            )}
            {state === "recording" && (
              <button
                onClick={stopRecording}
                className="h-16 w-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg animate-pulse"
                data-testid="button-record-stop"
              >
                <Square className="h-6 w-6" />
              </button>
            )}
            {(state === "recognizing" || state === "scoring") && (
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {state === "line-result" && (
              <Button size="lg" onClick={advanceLine} data-testid="button-next-line">
                {t("practice.nextLine")}
              </Button>
            )}
          </>
        )}

        {!isUserLine && state !== "playing-other" && state !== "ready" && (
          <Button variant="outline" size="sm" onClick={handlePlayLine} data-testid="button-play-tts">
            <Play className="mr-1 h-4 w-4" /> {t("practice.play")}
          </Button>
        )}

        {!isUserLine && state === "playing-other" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (ttsAudioRef.current) ttsAudioRef.current.pause();
              advanceLine();
            }}
            data-testid="button-pause-tts"
          >
            <Pause className="mr-1 h-4 w-4" /> {t("practice.skip")}
          </Button>
        )}
      </div>
    </div>
  );
}
