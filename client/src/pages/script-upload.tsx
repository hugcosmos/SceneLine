import { useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Users, MessageSquare, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { parseScriptPreview } from "@/lib/parser";
import type { Script } from "@shared/schema";
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

export default function ScriptUpload() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();

  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [language, setLanguage] = useState("zh");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed');
    const file = e.target.files?.[0];
    console.log('Selected file:', file);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      console.log('File reader onload');
      const content = event.target?.result as string;
      console.log('File content length:', content.length);
      setRawText(content);
      // Try to extract title from file name
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      if (!title) {
        setTitle(fileName);
      }
      console.log('Showing toast');
      toast({ title: t("upload.fileLoaded"), description: file.name });
    };
    reader.onerror = () => {
      console.log('File reader error');
      toast({ title: t("upload.fileError"), description: t("upload.fileErrorDesc"), variant: "destructive" });
    };
    console.log('Starting file reading');
    reader.readAsText(file);
  };

  const preview = useMemo(() => parseScriptPreview(rawText), [rawText]);

  const createScript = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scripts", {
        title: title.trim() || t("upload.untitled"),
        rawText,
        language,
        createdAt: new Date().toISOString(),
      });
      return (await res.json()) as Script | { existing: true; script: Script; message: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      
      // 检查是否是重复剧本
      console.log("[Upload] Response:", data);
      if ("existing" in data && data.existing) {
        console.log("[Upload] Existing script detected, showing toast...");
        toast({ 
          title: t("upload.existing"), 
          description: t("upload.existingDesc"),
          duration: 3000,  // 显示3秒
        });
        // 延迟跳转，让用户看到提示
        setTimeout(() => {
          navigate(`/scripts/${data.script.id}`);
        }, 1500);
        return;
      }
      
      toast({ title: t("upload.created"), description: `「${data.title}」${t("upload.createdDesc")}` });
      navigate(`/scripts/${data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: t("upload.createFailed"), description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = rawText.trim().length > 0 && preview.lines.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold" data-testid="page-title-upload">{t("upload.title")}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="script-title">{t("upload.scriptTitle")}</Label>
            <Input
              id="script-title"
              placeholder={t("upload.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="script-language">{t("upload.language")}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">{t("upload.langZh")}</SelectItem>
                <SelectItem value="en">{t("upload.langEn")}</SelectItem>
                <SelectItem value="mixed">{t("upload.langMixed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="script-text">{t("upload.scriptContent")}</Label>
            <div className="space-y-2">
              <div className="relative w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  data-testid="button-upload-file"
                >
                  <FileText className="h-4 w-4" />
                  {t("upload.uploadFile")}
                </Button>
                <input
                  type="file"
                  accept=".txt,.md,.script"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  data-testid="file-input"
                />
              </div>
              <Textarea
                id="script-text"
                placeholder={t("upload.placeholder")}
                className="min-h-[280px] font-mono text-sm"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                data-testid="textarea-script"
              />
            </div>
          </div>

          <Button
            onClick={() => createScript.mutate()}
            disabled={!canSubmit || createScript.isPending}
            className="w-full"
            data-testid="button-submit-script"
          >
            {createScript.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("upload.parsing")}</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />{t("upload.submit")}</>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("upload.preview")}</h2>

          {rawText.trim() === "" ? (
            <Card className="border-card-border border-dashed">
              <CardContent className="py-12 flex flex-col items-center text-center space-y-2">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t("upload.previewHint")}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {preview.characters.length} {t("upload.characters")}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {preview.lines.length} {t("upload.lines")}
                </span>
              </div>

              {preview.characters.length > 0 && (
                <div className="flex flex-wrap gap-2" data-testid="preview-characters">
                  {preview.characters.map((name, i) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className="gap-1.5"
                      data-testid={`badge-char-${i}`}
                    >
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${CHARACTER_COLORS[i % CHARACTER_COLORS.length]}`}
                      />
                      {name}
                    </Badge>
                  ))}
                </div>
              )}

              <Card className="border-card-border">
                <CardContent className="pt-4 max-h-[400px] overflow-y-auto space-y-2">
                  {preview.lines.map((line, i) => {
                    const colorIdx = preview.characters.indexOf(line.characterName);
                    const dotColor = CHARACTER_COLORS[colorIdx % CHARACTER_COLORS.length];
                    return (
                      <div
                        key={i}
                        className="flex gap-2 text-sm py-1"
                        data-testid={`preview-line-${i}`}
                      >
                        <span className="flex items-start gap-1.5 shrink-0 pt-0.5">
                          <span className={`inline-block h-2 w-2 rounded-full mt-1 ${dotColor}`} />
                          <span className="font-semibold min-w-[3em]">{line.characterName}</span>
                        </span>
                        <span className="text-muted-foreground">{line.text}</span>
                      </div>
                    );
                  })}
                  {preview.lines.length === 0 && rawText.trim() !== "" && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("upload.parseFail")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
