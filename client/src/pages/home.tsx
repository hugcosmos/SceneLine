import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Mic, Star, Plus, ChevronRight } from "lucide-react";
import type { Script } from "@shared/schema";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { t, lang } = useI18n();
  const { data: scripts, isLoading } = useQuery<Script[]>({
    queryKey: ["/api/scripts"],
    queryFn: async () => {
      const res = await fetch("/api/scripts");
      if (!res.ok) throw new Error("Failed to fetch scripts");
      return res.json();
    },
    staleTime: 0,
  });

  // 调试输出
  console.log("[Home] scripts:", scripts?.length, "isLoading:", isLoading);

  // 后端返回倒序（最新在前），直接取前6条
  const recentScripts = scripts?.slice(0, 6) ?? [];

  const LANG_LABELS: Record<string, string> = {
    zh: t("lang.zh"),
    en: t("lang.en"),
    mixed: t("lang.mixed"),
  };

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const features = [
    {
      icon: FileText,
      title: t("home.featureParse"),
      desc: t("home.featureParseDesc"),
    },
    {
      icon: Mic,
      title: t("home.featureVoice"),
      desc: t("home.featureVoiceDesc"),
    },
    {
      icon: Star,
      title: t("home.featureScore"),
      desc: t("home.featureScoreDesc"),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
      <section className="text-center space-y-4 py-8" data-testid="hero-section">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-primary">Scene</span>
          <span className="text-accent">Line</span>
        </h1>
        <p className="text-lg text-muted-foreground">{t("home.tagline")}</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {t("home.subtitle")}
        </p>
        <div className="pt-2">
          <Link href="/scripts/new">
            <Button size="lg" data-testid="cta-upload">
              <Plus className="mr-2 h-4 w-4" />
              {t("home.uploadCta")}
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" data-testid="features-section">
        {features.map((f) => (
          <Card key={f.title} className="border-card-border">
            <CardContent className="pt-6 space-y-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-semibold text-sm">{f.title}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section data-testid="recent-scripts-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">{t("home.recentScripts")}</h2>
          <Link href="/scripts">
            <Button variant="ghost" size="sm" data-testid="link-all-scripts">
              {t("home.viewAll")} <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-card-border">
                <CardContent className="pt-5 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentScripts.length === 0 ? (
          <Card className="border-card-border border-dashed">
            <CardContent className="py-12 flex flex-col items-center text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t("home.noScripts")}</p>
              <Link href="/scripts/new">
                <Button variant="outline" size="sm" data-testid="empty-upload-btn">
                  <Plus className="mr-1 h-3 w-3" /> {t("home.uploadScript")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentScripts.map((s) => (
              <Link key={s.id} href={`/scripts/${s.id}`}>
                <Card
                  className="border-card-border cursor-pointer transition-colors hover:bg-muted/50"
                  data-testid={`card-script-${s.id}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium truncate">{s.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {LANG_LABELS[s.language] ?? s.language}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
