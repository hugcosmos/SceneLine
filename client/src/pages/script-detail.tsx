import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Play, Trash2, Calendar, Globe, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ScriptWithDetails } from "@shared/schema";
import { useI18n } from "@/lib/i18n";

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

const CHARACTER_TEXT_COLORS = [
  "text-violet-600 dark:text-violet-400",
  "text-amber-600 dark:text-amber-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-sky-600 dark:text-sky-400",
  "text-rose-600 dark:text-rose-400",
  "text-teal-600 dark:text-teal-400",
  "text-orange-600 dark:text-orange-400",
  "text-indigo-600 dark:text-indigo-400",
];

interface Voice {
  id: string;
  name: string;
  gender: string;
  locale: string;
  desc: string;
}

export default function ScriptDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, lang } = useI18n();

  const LANG_LABELS: Record<string, string> = {
    zh: t("lang.zh"),
    en: t("lang.en"),
    mixed: t("lang.mixed"),
  };

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  const [selectedChar, setSelectedChar] = useState<string>("");
  const [mode, setMode] = useState<"full" | "line">("full");

  const { data: script, isLoading } = useQuery<ScriptWithDetails>({
    queryKey: ["/api/scripts", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/scripts/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch script");
      return res.json();
    },
  });

  // Fetch all available voices from backend
  const { data: voices = [] } = useQuery<Voice[]>({
    queryKey: ["/api/tts/voices"],
    queryFn: async () => {
      const res = await fetch("/api/tts/voices");
      if (!res.ok) throw new Error("Failed to fetch voices");
      return res.json();
    },
    staleTime: Infinity,
  });

  // Filter voices based on script language
  const filteredVoices = script ? voices.filter((v: Voice) => {
    if (script.language === "zh") {
      return v.locale.startsWith("zh-");
    } else if (script.language === "en") {
      return v.locale.startsWith("en-");
    }
    return true;
  }) : voices;

  // Group voices by locale
  const groupedVoices = filteredVoices.reduce((acc: Record<string, Voice[]>, voice: Voice) => {
    if (!acc[voice.locale]) acc[voice.locale] = [];
    acc[voice.locale].push(voice);
    return acc;
  }, {} as Record<string, Voice[]>);

  const updateSpeaker = useMutation({
    mutationFn: async ({ charId, speakerId }: { charId: number; speakerId: string }) => {
      await apiRequest("PATCH", `/api/characters/${charId}`, { speakerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts", params.id] });
    },
    onError: (err: Error) => {
      toast({ title: t("detail.updateFailed"), description: err.message, variant: "destructive" });
    },
  });

  const deleteScript = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/scripts/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      toast({ title: t("detail.deleted"), description: t("detail.deletedDesc") });
      navigate("/");
    },
    onError: (err: Error) => {
      toast({ title: t("detail.deleteFailed"), description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">{t("detail.notFound")}</p>
        <Link href="/">
          <Button variant="outline" className="mt-4" data-testid="link-back-home">{t("detail.backHome")}</Button>
        </Link>
      </div>
    );
  }

  const charIndexMap = new Map(script.characters.map((c, i) => [c.id, i]));

  const handleStartPractice = () => {
    if (!selectedChar) {
      toast({ title: t("detail.selectRoleFirst"), description: t("detail.selectRoleDesc"), variant: "destructive" });
      return;
    }
    navigate(`/practice/${script.id}?char=${selectedChar}&mode=${mode}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between" data-testid="script-header">
        <div className="space-y-1">
          <h1 className="text-xl font-bold" data-testid="text-script-title">{script.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              {LANG_LABELS[script.language] ?? script.language}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {script.characters.length} {t("detail.characters")}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(script.createdAt)}
            </span>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive" data-testid="button-delete-script">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("detail.confirmDelete")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("detail.deleteDesc")}「{script.title}」吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">{t("detail.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteScript.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteScript.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("detail.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">{t("detail.characterList")}</h2>
          <div className="space-y-3">
            {script.characters.map((char) => {
              const idx = charIndexMap.get(char.id) ?? 0;
              const dotColor = CHARACTER_COLORS[idx % CHARACTER_COLORS.length];
              return (
                <Card key={char.id} className="border-card-border" data-testid={`card-character-${char.id}`}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`} />
                      <span className="font-semibold text-sm">{char.name}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {char.lineCount ?? 0} {t("detail.linesCount")}
                      </Badge>
                    </div>
                    <Select
                      value={char.speakerId ?? ""}
                      onValueChange={(val) =>
                        updateSpeaker.mutate({ charId: char.id, speakerId: val })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs" data-testid={`select-speaker-${char.id}`}>
                        <SelectValue placeholder={t("detail.selectVoice")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(groupedVoices).map(([locale, localeVoices]) => (
                          <div key={locale}>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                              {locale}
                            </div>
                            {localeVoices.map((voice: Voice) => (
                              <SelectItem key={voice.id} value={voice.id} className="text-xs">
                                {voice.name} ({voice.gender === "female" ? "F" : "M"}) - {voice.desc}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold">{t("detail.dialoguePreview")}</h2>
          <Card className="border-card-border">
            <ScrollArea className="h-[360px]">
              <CardContent className="pt-4 space-y-2">
                {script.lines.map((line) => {
                  const charObj = script.characters.find((c) => c.id === line.characterId);
                  const idx = charObj ? charIndexMap.get(charObj.id) ?? 0 : 0;
                  const textColor = CHARACTER_TEXT_COLORS[idx % CHARACTER_TEXT_COLORS.length];
                  const dotColor = CHARACTER_COLORS[idx % CHARACTER_COLORS.length];
                  return (
                    <div key={line.id} className="flex gap-2 text-sm py-1" data-testid={`dialogue-line-${line.id}`}>
                      <span className="flex items-start gap-1.5 shrink-0 pt-0.5">
                        <span className={`inline-block h-2 w-2 rounded-full mt-1 ${dotColor}`} />
                        <span className={`font-semibold min-w-[3em] ${textColor}`}>
                          {line.characterName}
                        </span>
                      </span>
                      <span className="text-foreground">{line.text}</span>
                    </div>
                  );
                })}
              </CardContent>
            </ScrollArea>
          </Card>

          <Card className="border-card-border bg-primary/5" data-testid="practice-setup-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t("detail.practiceSetup")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("detail.selectRole")}</Label>
                <RadioGroup
                  value={selectedChar}
                  onValueChange={setSelectedChar}
                  className="flex flex-wrap gap-3"
                  data-testid="radio-character-select"
                >
                  {script.characters.map((char) => {
                    const idx = charIndexMap.get(char.id) ?? 0;
                    const dotColor = CHARACTER_COLORS[idx % CHARACTER_COLORS.length];
                    return (
                      <div key={char.id} className="flex items-center gap-2">
                        <RadioGroupItem
                          value={String(char.id)}
                          id={`char-${char.id}`}
                          data-testid={`radio-char-${char.id}`}
                        />
                        <Label htmlFor={`char-${char.id}`} className="flex items-center gap-1.5 cursor-pointer text-sm">
                          <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
                          {char.name}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("detail.practiceMode")}</Label>
                <RadioGroup
                  value={mode}
                  onValueChange={(v) => setMode(v as "full" | "line")}
                  className="flex gap-4"
                  data-testid="radio-mode-select"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="full" id="mode-full" data-testid="radio-mode-full" />
                    <Label htmlFor="mode-full" className="cursor-pointer text-sm">{t("detail.modeFull")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="line" id="mode-line" data-testid="radio-mode-line" />
                    <Label htmlFor="mode-line" className="cursor-pointer text-sm">{t("detail.modeLine")}</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button onClick={handleStartPractice} className="w-full" data-testid="button-start-practice">
                <Play className="mr-2 h-4 w-4" />
                {t("detail.startPractice")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
